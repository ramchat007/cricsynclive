import "./globals.css";
import { Providers } from "./providers";
import LayoutWrapper from "./components/LayoutWrapper";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CricSyncLive | The Industry Standard Cricket Tournament OS",
  description:
    "Elevate local and corporate cricket tournaments with CricSyncLive. Discover professional real-time live scoring, IPL-style digital player auctions, and TV-quality OBS broadcast overlays for YouTube streaming.",
  keywords: [
    /* Primary App Keywords */
    "live cricket scoring app",
    "cricket tournament management software",
    "cricket player auction app",

    /* Auction & Management Features */
    "live player bidding software",
    "season based cricket tournament system",
    "real-time budget control cricket auction",
    "cricket league operating system",

    /* Broadcasting & Streaming Features */
    "cricket broadcast overlays OBS",
    "YouTube live streaming cricket graphics",
    "TV dashboard cricket scoring",

    /* Niche & Grassroots Targeting */
    "box cricket scoring system",
    "digital cricket scoresheet",
    "local cricket live stream",
  ],
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
  openGraph: {
    title: "CricSyncLive | Premium Cricket Tournament OS",
    description:
      "End-to-end cricket management: Real-time scoring, live digital auctions, and broadcast-grade streaming overlays.",
    type: "website",
    siteName: "CricSyncLive",
  },
  twitter: {
    card: "summary_large_image",
    title: "CricSyncLive | The Industry Standard Cricket Tournament OS",
    description:
      "Elevate your cricket tournament with professional live scoring, IPL-style auctions, and TV-quality broadcast overlays.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <LayoutWrapper>{children}</LayoutWrapper>
        </Providers>
        <GoogleAnalytics gaId="G-NGL0G335B2" />
        <Script
          id="adsbygoogle-init"
          strategy="lazyOnload"
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4257726751596254"
        />
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "xlsa5b7w0r");
          `}
        </Script>
      </body>
    </html>
  );
}
