import type { Metadata } from "next";
import { Bungee, Fredoka, Geist_Mono } from "next/font/google";
import "./globals.css";

const display = Bungee({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"]
});

const round = Fredoka({
  variable: "--font-round",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "blunt38 Dashboard",
  description: "blunt38 premium Discord control center"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${round.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
