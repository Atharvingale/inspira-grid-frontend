import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "./providers";

export const metadata: Metadata = {
  title: "Inspira-Grid — Collaborative Platform",
  description:
    "Connect, collaborate, and create amazing projects with talented teams",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/logo.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "icon", url: "/logo.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body className="antialiased" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: 'var(--ig-bg)', color: 'var(--ig-text)' }}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
