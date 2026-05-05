import { Search } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 selection:bg-cyan-500 selection:text-white">
      {/* 1. GLOBAL BACKGROUND (z-0) */}
      <div className="fixed inset-0 z-0 bg-[url('/light-stadium.png')] bg-cover bg-center bg-no-repeat opacity-70 dark:opacity-70 transition-opacity duration-300" />

      {/* 2. GLOBAL OVERLAY (z-10) - Matches the Explore page's solid colors but frosted */}
      <div className="fixed inset-0 z-10 pointer-events-none bg-slate-50/90 dark:bg-slate-950/90 transition-colors duration-300" />

      {/* 3. CONTENT WRAPPER (z-20) */}
      <div className="relative z-20">
        {/* --- HERO SECTION --- */}
        <section className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 pt-20">
          <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black italic uppercase leading-none drop-shadow-xl text-slate-900 dark:text-slate-200 transition-colors duration-300">
              CricSync <br className="md:hidden" />{" "}
              <span className="text-cyan-600 dark:text-cyan-400 drop-shadow-md">
                Live
              </span>
            </h1>
            <p className="text-base md:text-xl font-black uppercase tracking-[0.3em] mt-6 text-slate-600 dark:text-slate-400 transition-colors duration-300">
              The Industry-Standard Tournament OS
            </p>
          </div>
        </section>

        {/* --- FEATURES GRID SECTION --- */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Module 01 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-blue-600 dark:bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                <span className="text-blue-600 dark:text-blue-500 font-bold uppercase tracking-widest text-xs transition-colors">
                  Module 01
                </span>
              </div>
              <h2 className="text-3xl font-black uppercase italic mb-4 text-slate-900 dark:text-white transition-colors">
                Total{" "}
                <span className="text-blue-600 dark:text-blue-500">
                  Control
                </span>
              </h2>
              <p className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-400 transition-colors leading-relaxed">
                Organise tournaments seamlessly. From expert umpire management
                to assigning dedicated offline scorers, online scorers, and
                on-demand commentators.
              </p>
            </div>

            {/* Module 02 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-teal-600 dark:bg-teal-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.3)]" />
                <span className="text-teal-600 dark:text-teal-500 font-bold uppercase tracking-widest text-xs transition-colors">
                  Module 02
                </span>
              </div>
              <h2 className="text-3xl font-black uppercase italic mb-4 text-slate-900 dark:text-white transition-colors">
                Real-Time{" "}
                <span className="text-teal-600 dark:text-teal-500">
                  Precision
                </span>
              </h2>
              <p className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-400 transition-colors leading-relaxed">
                Lightning-fast, ball-by-ball digital scoresheets engineered for
                professional match management. Track every delivery with
                industry-standard accuracy.
              </p>
            </div>

            {/* Module 03 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-amber-600 dark:bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                <span className="text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest text-xs transition-colors">
                  Module 03
                </span>
              </div>
              <h2 className="text-3xl font-black uppercase italic mb-4 text-slate-900 dark:text-white transition-colors">
                Live{" "}
                <span className="text-amber-600 dark:text-amber-500">
                  Auctions
                </span>
              </h2>
              <p className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-400 transition-colors leading-relaxed">
                Host IPL-style mega auctions with zero compromises. Manage
                extensive player registrations, verify team wallets, and execute
                live bidding wars.
              </p>
            </div>

            {/* Module 04 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-red-600 dark:bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
                <span className="text-red-600 dark:text-red-500 font-bold uppercase tracking-widest text-xs transition-colors">
                  Module 04
                </span>
              </div>
              <h2 className="text-3xl font-black uppercase italic mb-4 text-slate-900 dark:text-white transition-colors">
                Broadcast{" "}
                <span className="text-red-600 dark:text-red-500">Overlays</span>
              </h2>
              <p className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-400 transition-colors leading-relaxed">
                Bring TV-network quality to grassroots streams. Seamless Live
                YouTube streaming integration featuring professional
                broadcast-ready OBS overlays.
              </p>
            </div>

            {/* Module 05 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-fuchsia-600 dark:bg-fuchsia-500 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.3)]" />
                <span className="text-fuchsia-600 dark:text-fuchsia-500 font-bold uppercase tracking-widest text-xs transition-colors">
                  Module 05
                </span>
              </div>
              <h2 className="text-3xl font-black uppercase italic mb-4 text-slate-900 dark:text-white transition-colors">
                Smart{" "}
                <span className="text-fuchsia-600 dark:text-fuchsia-500">
                  Brackets
                </span>
              </h2>
              <p className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-400 transition-colors leading-relaxed">
                Intelligent tournament trees and dynamic round-robin standings.
                Automatically advance winners and keep your teams perfectly
                synced.
              </p>
            </div>

            {/* Module 06 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-purple-600 dark:bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.3)]" />
                <span className="text-purple-600 dark:text-purple-500 font-bold uppercase tracking-widest text-xs transition-colors">
                  Module 06
                </span>
              </div>
              <h2 className="text-3xl font-black uppercase italic mb-4 text-slate-900 dark:text-white transition-colors">
                Digital{" "}
                <span className="text-purple-600 dark:text-purple-500">
                  Identity
                </span>
              </h2>
              <p className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-400 transition-colors leading-relaxed">
                Track career milestones globally! Every run and wicket is
                automatically tallied across all tournaments, providing a
                shareable digital resume.
              </p>
            </div>
          </div>
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-24 flex items-center justify-center px-4">
          <Link
            href="/explore"
            className="group flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-xl hover:scale-105 transition-all active:scale-95"
          >
            <Search
              size={18}
              className="text-white dark:text-slate-900 group-hover:text-cyan-400 dark:group-hover:text-cyan-600 transition-colors"
            />
            Explore All Tournaments
          </Link>
        </section>
      </div>
    </main>
  );
}
