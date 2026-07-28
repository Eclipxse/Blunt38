import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Silkscreen } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { TitleSignal } from "@/components/title-signal";
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
  metadataBase: new URL("https://panel.eclipxse.in"),
  title: {
    default: "blunt38",
    template: "%s // blunt38"
  },
  description:
    "38 reasons. None explained.",
  applicationName: "blunt38",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "blunt38",
    title: "blunt38",
    description: "38 reasons. None explained.",
    images: [
      {
        url: "/api/og?v=2",
        width: 1200,
        height: 630,
        alt: "blunt38 ASCII control signal"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "blunt38",
    description: "38 reasons. None explained.",
    images: ["/api/og?v=2"]
  },
  icons: {
    icon: [
      {
        url: "/brand/blunt38-logo.jpg?v=2",
        type: "image/jpeg"
      }
    ],
    shortcut: "/brand/blunt38-logo.jpg?v=2",
    apple: "/brand/blunt38-logo.jpg?v=2"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${round.variable} ${geistMono.variable}`}>
      <body>
        <TitleSignal />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
