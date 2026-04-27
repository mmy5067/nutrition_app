import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "营养记录",
  description: "用自然语言记录饮食，让 AI 帮你沉淀每天真正可执行的营养反馈。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
