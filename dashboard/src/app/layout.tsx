import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Silkscreen } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const display = Silkscreen({
  variable: "--font-display",
  weight: ["400", "700"],
  subsets: ["latin"]
});

const round = DM_Sans({
  variable: "--font-round",
  subsets: ["latin"]
});

const geistMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  weight: ["400", "500", "600"],
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
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
