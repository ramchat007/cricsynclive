import './globals.css';
import { Providers } from './providers';
import Link from 'next/link';

export const metadata = {
  title: 'CricSync V2 | Pro Sports Management',
  description: 'Broadcast-grade cricket tournament management and live scoring.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
        <Providers>
          {/* GLOBAL NAVBAR */}
          <nav className="border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <Link href="/" className="text-xl font-black tracking-widest text-teal-600 dark:text-teal-400 uppercase">
                CricSync
              </Link>
              
              <div className="flex items-center gap-6 text-sm font-bold text-slate-500 dark:text-slate-400">
                <Link href="/dashboard" className="hover:text-teal-500 transition-colors">Dashboard</Link>
                <Link href="/pricing" className="hover:text-teal-500 transition-colors">Pricing</Link>
                <Link href="/login" className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 rounded-full transition-all">
                  Login
                </Link>
              </div>
            </div>
          </nav>

          {/* MAIN CONTENT ZONE */}
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}