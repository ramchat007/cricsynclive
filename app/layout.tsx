import "./globals.css";
import { Providers } from "./providers";
import LayoutWrapper from "./components/LayoutWrapper";
import { GoogleAnalytics } from "@next/third-parties/google";

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
      <body>
        <Providers>
          <LayoutWrapper>{children}</LayoutWrapper>
          <GoogleAnalytics gaId="G-NGL0G335B2" />
        </Providers>
      </body>
    </html>
  );
}
