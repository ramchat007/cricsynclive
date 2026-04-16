import "./globals.css";
import { Providers } from "./providers";
import Navbar from "./components/Navbar"; // Adjust this path if you put it elsewhere

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
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
        <Providers>
          {/* THE SMART NAVBAR */}
          <Navbar />

          {/* MAIN CONTENT ZONE */}
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
