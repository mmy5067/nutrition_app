import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nutrition App",
  description: "Next.js migration for local nutrition tracking and admin testing."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
