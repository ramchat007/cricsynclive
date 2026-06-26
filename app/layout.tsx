import "./globals.css";
import { Providers } from "./providers";
import LayoutWrapper from "./components/LayoutWrapper";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

export const metadata = {
  title: "CricSync | The Industry Standard Tournament OS",
  description:
    "Elevating local and mega cricket tournaments with professional live scoring, IPL-style auctions, and TV-quality broadcast overlays.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4257726751596254"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <Providers>
          <LayoutWrapper>{children}</LayoutWrapper>
          <GoogleAnalytics gaId="G-NGL0G335B2" />
        </Providers>
      </body>
    </html>
  );
}
