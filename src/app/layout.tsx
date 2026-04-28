import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "签证通 · 中国人出境签证指南",
  description:
    "面向中国用户的签证信息工具，提供日本、泰国、法国、美国、英国等热门目的地的签证材料清单、费用和办理流程，数据来源官方渠道，干净准确无中介。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg text-blue-600">
              <span>🛂</span>
              <span>签证通</span>
            </a>
            <nav className="text-sm text-gray-500 flex gap-4">
              <a href="/" className="hover:text-blue-600 transition-colors">首页</a>
              <a href="/about" className="hover:text-blue-600 transition-colors">关于</a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-200 mt-16 py-8 text-center text-sm text-gray-400">
          <p>签证通 · 数据来源官方使馆及签证中心，仅供参考，以官方最新公告为准</p>
        </footer>
      </body>
    </html>
  );
}
