import "./globals.css";
import { Providers } from "./providers";
import LayoutWrapper from "./components/LayoutWrapper";

export const metadata = {
  title: "CricSync V2 | Pro Sports Management",
  description:
    "Broadcast-grade cricket tournament management and live scoring.",
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
      </body>
    </html>
  );
}
