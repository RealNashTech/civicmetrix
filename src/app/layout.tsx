import type { Metadata } from "next";

import { TopNav } from "@/components/layout/top-nav";

import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

export const metadata: Metadata = {
  title: "CivicMetrix",
  description: "Civic intelligence platform for local government operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-gray-50"
        style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}
      >
        <TopNav />
        {children}
      </body>
    </html>
  );
}
