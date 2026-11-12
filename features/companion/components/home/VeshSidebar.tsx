"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavigationItem = {
  label: string;
  href: string;
  icon: string;
};

const navigation: NavigationItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Conversations", href: "/conversations", icon: "messages" },
  { label: "Memory", href: "/memory", icon: "brain" },
  { label: "Tasks", href: "/tasks", icon: "check" },
  { label: "Projects", href: "/projects", icon: "folder" },
  { label: "Knowledge", href: "/knowledge", icon: "book" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
];

const secondary: NavigationItem[] = [
  { label: "Environment", href: "/environment", icon: "sparkles" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

function Icon({ name }: { name: string }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-7h6v7" /></svg>;
    case "messages":
      return <svg {...common}><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-6a7.5 7.5 0 1 1 17-3.5Z" /><path d="M8 11h8M8 14h5" /></svg>;
    case "brain":
      return <svg {...common}><path d="M12 4a3 3 0 0 0-5.7 1.2A3.5 3.5 0 0 0 5 12a3.5 3.5 0 0 0 2 6.3A3 3 0 0 0 12 20Z" /><path d="M12 4a3 3 0 0 1 5.7 1.2A3.5 3.5 0 0 1 19 12a3.5 3.5 0 0 1-2 6.3A3 3 0 0 1 12 20ZM8 9c2 0 2 2 4 2s2-2 4-2M8 15c2 0 2-2 4-2s2 2 4 2" /></svg>;
    case "check":
      return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
    case "folder":
      return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>;
    case "book":
      return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22Z" /><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20M8 7h8M8 10h8" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2" /></svg>;
    case "sparkles":
      return <svg {...common}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9L16 20.7h-8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2.2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9L8 7.3h8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 2.1Z" /></svg>;
    default:
      return null;
  }
}

function NavGroup({
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  items: NavigationItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="vesh-sidebar-nav">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`vesh-sidebar-link ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
          >
            <span className="vesh-sidebar-icon">
              <Icon name={item.icon} />
            </span>
            <span className="vesh-sidebar-label">{item.label}</span>
            {active && <span className="vesh-sidebar-active-dot" />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function VeshSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="vesh-mobile-menu"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        <span />
        <span />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="vesh-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={[
          "vesh-sidebar",
          collapsed ? "is-collapsed" : "",
          mobileOpen ? "is-mobile-open" : "",
        ].join(" ")}
        aria-label="Main navigation"
      >
        <div className="vesh-sidebar-header">
          <Link
            href="/"
            className="vesh-sidebar-brand"
            onClick={() => setMobileOpen(false)}
          >
            <span className="vesh-sidebar-brand-mark">
              <i />
              <i />
              <i />
            </span>
            {!collapsed && <span>V E S H</span>}
          </Link>

          <button
            type="button"
            className="vesh-sidebar-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <div className="vesh-sidebar-section-label">
          {!collapsed && "YOUR SPACE"}
        </div>

        <NavGroup
          items={navigation}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
        />

        <div className="vesh-sidebar-spacer" />

        <div className="vesh-sidebar-section-label">
          {!collapsed && "PREFERENCES"}
        </div>

        <NavGroup
          items={secondary}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
        />

        <div className="vesh-sidebar-footer">
          <span className="vesh-sidebar-presence-dot" />
          {!collapsed && (
            <span>
              <strong>VESH</strong>
              <small>Here alongside you</small>
            </span>
          )}
        </div>
      </aside>
    </>
  );
}