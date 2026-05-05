import React from "react";
import {
  Activity,
  Gavel,
  Play,
  GitMerge,
  Users,
  Trophy,
  Globe,
} from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | CricSync Live",
  description:
    "Learn more about CricSync and our mission to revolutionize community cricket tournaments.",
  openGraph: {
    title: "About Us | CricSync Live",
    description:
      "Learn more about CricSync and our mission to revolutionize community cricket tournaments.",
  },
};

const features = [
  {
    icon: Users,
    title: "A Complete Organization",
    desc: "Effortlessly plan tournaments with Umpires, both Offline and Online scorers, and Commentators available on demand.",
  },
  {
    icon: Activity,
    title: "Instantaneous Scoring",
    desc: "Instantly synchronize digital scoresheets across all devices, with lightning-fast ball-by-ball updates.",
  },
  {
    icon: Gavel,
    title: "Real-Time Player Auctions",
    desc: "Effortlessly handle virtual wallets, team owners, and live bidding in real-time.",
  },
  {
    icon: Play,
    title: "Live Broadcasting",
    desc: "Experience effortlessly seamless YouTube live streaming with professional-grade overlays.",
  },
  {
    icon: GitMerge,
    title: "Automated Brackets",
    desc: "Intelligent tournament brackets that automatically progress winners and promptly display updated table rankings.",
  },
  {
    icon: Globe,
    title: "Worldwide Player Statistics",
    desc: "Keep track of your career accomplishments! All runs and wickets are automatically recorded for all tournaments.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pt-24 pb-16 selection:bg-teal-500 selection:text-white">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* --- HEADER SECTION --- */}
        <div className="text-center mb-16 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-teal-50 dark:bg-teal-500/10 shadow-sm transition-colors">
              <Trophy size={48} className="text-teal-500" />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-6 text-slate-900 dark:text-white transition-colors">
            Raising the Importance of{" "}
            <span className="text-teal-500 block md:inline">
              Community Cricket
            </span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto font-medium text-slate-600 dark:text-slate-400 transition-colors">
            CricSync is a high-quality platform for managing tournaments,
            specifically created to provide local and corporate cricket leagues
            with professional-grade tools.
          </p>
        </div>

        {/* --- SERVICES GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {features.map((f, i) => (
            <div
              key={i}
              className="p-6 md:p-8 rounded-3xl border bg-white dark:bg-[#1C2128]/80 border-slate-200 dark:border-white/5 hover:-translate-y-1 hover:border-teal-300 dark:hover:border-teal-500/30 shadow-lg hover:shadow-teal-500/10 dark:hover:shadow-teal-500/10 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 transition-colors">
                <f.icon size={26} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest mb-3 leading-tight text-slate-900 dark:text-white transition-colors">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed font-medium text-slate-600 dark:text-slate-400 transition-colors">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* --- TEAM & MISSION SECTION --- */}
        <div className="mt-20 mb-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-indigo-500 mb-4">
              CricSync Features
            </h2>
            <p className="max-w-2xl mx-auto font-bold uppercase tracking-widest text-xs md:text-sm text-slate-500 dark:text-slate-400 transition-colors">
              Possessing a wealth of expertise and discipline, our company
              adheres to the highest industry standards.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT BLOCK: The Team (Spans 5 cols) */}
            <div className="lg:col-span-5 p-8 md:p-10 rounded-[2.5rem] border relative overflow-hidden flex flex-col justify-center bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/20 dark:to-slate-900 border-teal-100 dark:border-white/10 shadow-xl dark:shadow-2xl transition-colors duration-500">
              {/* Background Graphic */}
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-teal-500/20 blur-[100px] rounded-full pointer-events-none"></div>

              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg bg-white dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 transition-colors">
                  <Users size={32} />
                </div>
                <h3 className="text-3xl font-black uppercase mb-4 leading-tight text-slate-900 dark:text-white transition-colors">
                  Those with expertise in the field
                </h3>
                <p className="text-base leading-relaxed font-medium mb-8 text-slate-600 dark:text-slate-400 transition-colors">
                  Our team is a dynamic group of skilled developers and ardent
                  fans of cricket. Moreover, we have extensive experience in
                  organizing tournaments, ensuring strict adherence to rules,
                  etiquette, and comprehensive understanding of the sport.
                </p>

                {/* Ethos Badges */}
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm transition-colors">
                    Effective Management
                  </span>
                  <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm transition-colors">
                    Steadfast Implementation
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT BLOCK: Mission & Target Strategy (Spans 7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Mission Card */}
              <div className="sm:col-span-2 p-8 md:p-10 rounded-[2.5rem] border relative overflow-hidden bg-white dark:bg-[#1C2128]/80 border-slate-200 dark:border-white/5 shadow-xl dark:shadow-2xl transition-colors duration-500 backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="relative z-10">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 transition-colors">
                    <Trophy size={18} /> Our Core Mission
                  </h3>
                  <p className="text-lg md:text-xl font-medium leading-relaxed text-slate-800 dark:text-slate-200 transition-colors">
                    Our goal is to deliver a professional experience using
                    top-notch equipment. We guarantee efficient management of
                    your entire tournament, upholding strict discipline and
                    extensive knowledge of cricket from start to finish.
                  </p>
                </div>
              </div>

              {/* Strategy Card 1: Grassroots */}
              <div className="p-6 md:p-8 rounded-[2rem] border flex flex-col justify-center transition-transform hover:-translate-y-1 bg-slate-50 dark:bg-[#13161a] border-slate-200 dark:border-white/5 shadow-sm dark:shadow-lg">
                <Activity className="text-amber-500 mb-5" size={28} />
                <h4 className="text-sm font-black uppercase tracking-widest mb-3 text-slate-900 dark:text-white transition-colors">
                  Fostering local communities
                </h4>
                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400 transition-colors">
                  The limited budgets and technical resources of local
                  tournaments often result in compromised quality. Our goal is
                  to prioritize these leagues and provide them with premium
                  online services that surpass their expectations.
                </p>
              </div>

              {/* Strategy Card 2: Big Leagues */}
              <div className="p-6 md:p-8 rounded-[2rem] border flex flex-col justify-center transition-transform hover:-translate-y-1 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-500/20 shadow-sm dark:shadow-lg">
                <GitMerge
                  className="text-indigo-600 dark:text-indigo-500 mb-5"
                  size={28}
                />
                <h4 className="text-sm font-black uppercase tracking-widest mb-3 text-slate-900 dark:text-white transition-colors">
                  Making it to the Major Leagues
                </h4>
                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400 transition-colors">
                  After establishing the foundation, we expand our
                  infrastructure to accommodate large-scale, high-stakes
                  tournaments that demand significant resources, flawless
                  execution, and robust digital ecosystems.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
