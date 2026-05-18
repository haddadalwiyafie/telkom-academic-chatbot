import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telkom Academic Chatbot",
  description: "Asisten akademik berbasis AI untuk civitas Telkom University",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
