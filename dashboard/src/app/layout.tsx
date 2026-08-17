import type { Metadata } from "next";
import localFont from "next/font/local";
import { DM_Sans, IBM_Plex_Mono, Silkscreen } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { TitleSignal } from "@/components/title-signal";
import { Watcher38 } from "@/components/watcher-38";
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

const bluntDisplay = localFont({
  src: "../../public/fonts/Unbounded.ttf",
  variable: "--font-blunt-display",
  display: "swap"
});

const brandDisplay = localFont({
  src: "../../public/fonts/BlackOpsOne.ttf",
  variable: "--font-brand-display",
  weight: "400",
  display: "swap"
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
    <html
      lang="en"
      className={`${display.variable} ${round.variable} ${geistMono.variable} ${bluntDisplay.variable} ${brandDisplay.variable}`}
    >
      <body>
        {/* THESIS: blunt38 is a cinematic control surface, not a friendly SaaS dashboard. OWN-WORLD: monochrome signal room with watcher imagery, editorial type, and hard rules. STORY: orient, see what is broken, act, save. FIRST VIEWPORT: route, server, command access, giant directive, setup state. FORM: user-pinned clean cinematic operating surface after rejected concept; seed ba0246ea. FINISH: reviewer received desktop and mobile screenshots before verdict. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              "document.body.insertBefore(document.createComment('THESIS: blunt38 cinematic control surface | OWN-WORLD: monochrome signal room | STORY: orient, repair, act, save | FIRST VIEWPORT: route, server, commands, directive, setup | FORM: clean cinematic, seed ba0246ea | FINISH: desktop and mobile review'), document.body.firstChild);"
          }}
        />
        <span
          hidden
          data-design-contract="ba0246ea | clean cinematic operating surface | reviewer received desktop and mobile screenshots before verdict"
        />
        <TitleSignal />
        <MotionProvider>
          <Watcher38 />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
