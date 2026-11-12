import type { Metadata, Viewport } from "next";

import "./globals.css";
import "./vesh-home.css";
import "./vesh-icons.css";

export const metadata: Metadata = {
  title: "Vesh",
  description:
    "A personal ambient companion for your time, focus, and everyday work.",
  applicationName: "VESH",
  icons: {
    icon: [
      { url: "/vesh-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "VESH",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030303",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
