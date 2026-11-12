
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HardworkCheckIn from "@/features/attendence/HardworkCheckIn";
import type { AmbientScene } from "@/features/ambient/AmbientEnvironment";
import {
  ArrowLeftIcon,
  CornersInIcon,
  CornersOutIcon,
  DotsThreeIcon,
  HouseIcon,
  SignInIcon,
  SignOutIcon,
  SquaresFourIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";

type AccountMenuProps = {
  mobileNavigation?: boolean;
  showEnvironmentLink?: boolean;
  showWorkspaceLink?: boolean;
  homeLinkLabel?: string;
  homeLinkHref?: string;
  secondaryHomeLinkLabel?: string;
  secondaryHomeLinkHref?: string;
  showStreak?: boolean;
  scene?: AmbientScene;
  onSceneChange?: (scene: AmbientScene) => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
};

const SCENES: { value: AmbientScene; label: string }[] = [
  { value: "rain", label: "Rain" },
  { value: "night-sky", label: "Night sky" },
  { value: "fireplace", label: "Fireplace" },
  { value: "minimal", label: "Minimal" },
];

function EnvironmentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.2 15.1A8.1 8.1 0 0 1 8.9 4.8a8.2 8.2 0 1 0 10.3 10.3Z" />
      <path d="m17.5 3 .55 1.65L19.7 5.2l-1.65.55-.55 1.65-.55-1.65-1.65-.55 1.65-.55L17.5 3Z" />
      <path d="m21 10 .3.9.9.3-.9.3-.3.9-.3-.9-.9-.3.9-.3.3-.9Z" />
    </svg>
  );
}

export default function AccountMenu({
  mobileNavigation = false,
  showEnvironmentLink = true,
  showWorkspaceLink = true,
  homeLinkLabel,
  homeLinkHref = "/workspace",
  secondaryHomeLinkLabel,
  secondaryHomeLinkHref = "/",
  showStreak = false,
  scene,
  onSceneChange,
  onFullscreen,
  isFullscreen,
}: AccountMenuProps) {
  const rootRef = useRef<HTMLDetailsElement>(null);
  const router = useRouter();

  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const fullscreen = isFullscreen ?? localFullscreen;

  useEffect(() => {
    let active = true;

    try {
      const supabase = createClient();

      void supabase.auth
        .getUser()
        .then(({ data, error }) => {
          if (!active) return;
          setSignedIn(Boolean(data.user && !error));
          setReady(true);
        })
        .catch(() => {
          if (active) setReady(true);
        });

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (active) setSignedIn(Boolean(session?.user));
        }
      );

      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    } catch {
      setReady(true);
      return () => {
        active = false;
      };
    }
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      setLocalFullscreen(Boolean(document.fullscreenElement));
    };

    const closeOnOutside = (event: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        rootRef.current.open = false;
        setEnvironmentOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (rootRef.current) rootRef.current.open = false;
        setEnvironmentOpen(false);
      }
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const closeMenu = useCallback(() => {
    if (rootRef.current) rootRef.current.open = false;
    setEnvironmentOpen(false);
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setSignOutError("Unable to sign out. Please try again.");
        setSigningOut(false);
        return;
      }

      setSignedIn(false);
      closeMenu();

      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  };

  const toggleFullscreen = useCallback(async () => {
    closeMenu();

    if (onFullscreen) {
      onFullscreen();
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen is not supported in every mobile browser.
    }
  }, [closeMenu, onFullscreen]);

  return (
    <details
      ref={rootRef}
      className={`vesh-account-menu${
        mobileNavigation ? " vesh-account-menu--mobile-nav" : ""
      }`}
      onToggle={(event) => {
        if (!(event.currentTarget as HTMLDetailsElement).open) {
          setEnvironmentOpen(false);
        }
      }}
    >
      <summary
        aria-label={
          mobileNavigation ? "Open VESH menu" : "Open account menu"
        }
      >
        <span className="vesh-account-menu__desktop">
          {ready && signedIn ? "Account" : "Sign in"}
        </span>

        {mobileNavigation && (
          <span
            className="vesh-account-menu__mobile"
            aria-hidden="true"
          >
            <DotsThreeIcon size={25} weight="regular" />
          </span>
        )}
      </summary>

      <div className="vesh-account-menu__panel">
        {mobileNavigation && (
          <nav
            className="vesh-account-menu__mobile-nav"
            aria-label="VESH navigation"
          >
            {showEnvironmentLink && scene && onSceneChange && (
              <div className="vesh-account-menu__environment-group">
                <button
                  type="button"
                  className="vesh-account-menu__nav-item"
                  aria-expanded={environmentOpen}
                  onClick={() =>
                    setEnvironmentOpen((open) => !open)
                  }
                >
                  <EnvironmentIcon />
                  <span>Environment</span>
                  <span
                    className="vesh-account-menu__chevron"
                    aria-hidden="true"
                  >
                    {environmentOpen ? "−" : "+"}
                  </span>
                </button>

                {environmentOpen && (
                  <div
                    className="vesh-account-menu__scene-options"
                    role="group"
                    aria-label="Choose environment"
                  >
                    {SCENES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={
                          scene === item.value ? "is-active" : ""
                        }
                        aria-pressed={scene === item.value}
                        onClick={() => {
                          onSceneChange(item.value);
                          setEnvironmentOpen(false);
                        }}
                      >
                        <span>{item.label}</span>
                        {scene === item.value && (
                          <span aria-hidden="true">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="vesh-account-menu__nav-item"
              onClick={() => void toggleFullscreen()}
            >
              {fullscreen ? (
                <CornersInIcon
                  size={18}
                  weight="regular"
                  aria-hidden="true"
                />
              ) : (
                <CornersOutIcon
                  size={18}
                  weight="regular"
                  aria-hidden="true"
                />
              )}
              <span>
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </span>
            </button>

            {showStreak && (
              <div className="vesh-account-menu__streak">
                <HardworkCheckIn />
                <span>Daily streak</span>
              </div>
            )}

            {showWorkspaceLink && (
              <Link
                className="vesh-account-menu__nav-item"
                href="/workspace"
                onClick={closeMenu}
              >
                <SquaresFourIcon
                  size={18}
                  weight="regular"
                  aria-hidden="true"
                />
                <span>Workspace</span>
              </Link>
            )}

            {homeLinkLabel && (
              <Link
                className="vesh-account-menu__nav-item"
                href={homeLinkHref}
                onClick={closeMenu}
              >
                <ArrowLeftIcon
                  size={18}
                  weight="regular"
                  aria-hidden="true"
                />
                <span>{homeLinkLabel}</span>
              </Link>
            )}

            {secondaryHomeLinkLabel && (
              <Link
                className="vesh-account-menu__nav-item"
                href={secondaryHomeLinkHref}
                onClick={closeMenu}
              >
                <HouseIcon
                  size={18}
                  weight="regular"
                  aria-hidden="true"
                />
                <span>{secondaryHomeLinkLabel}</span>
              </Link>
            )}

            <div className="vesh-account-menu__separator" />
          </nav>
        )}

        <div className="vesh-account-menu__account">
          {ready && signedIn ? (
            <>
              <span className="vesh-account-menu__status">
                SIGNED IN
              </span>

              <button
                type="button"
                className="vesh-account-menu__account-action"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
              >
                <SignOutIcon
                  size={17}
                  weight="regular"
                  aria-hidden="true"
                />
                <span>
                  {signingOut ? "Signing out…" : "Sign out"}
                </span>
              </button>

              {signOutError && (
                <p
                  role="alert"
                  className="vesh-account-menu__error"
                >
                  {signOutError}
                </p>
              )}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="vesh-account-menu__account-action"
                onClick={closeMenu}
              >
                <SignInIcon
                  size={17}
                  weight="regular"
                  aria-hidden="true"
                />
                <span>Sign in</span>
              </Link>

              <Link
                href="/signup"
                className="vesh-account-menu__account-action"
                onClick={closeMenu}
              >
                <UserPlusIcon
                  size={17}
                  weight="regular"
                  aria-hidden="true"
                />
                <span>Create account</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </details>
  );
}
