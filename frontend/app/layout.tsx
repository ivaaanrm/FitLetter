import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cover Letter Maker",
  description: "Generate a personalized LaTeX cover letter with Claude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
