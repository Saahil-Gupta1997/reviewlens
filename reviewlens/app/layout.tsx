import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewLens — Review intelligence",
  description: "Understand customer feedback with scoped analytics and traceable review evidence.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
