import React from "react";
import {
  Activity,
  Gavel,
  Play,
  GitMerge,
  Users,
  Trophy,
  Globe,
  Phone,
  Mail,
  Globe as GlobeIcon,
} from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | CricSyncLive",
  description:
    "Learn more about CricSyncLive and our mission to elevate community cricket tournaments into professional broadcasts.",
  openGraph: {
    title: "About Us | CricSyncLive",
    description:
      "Learn more about CricSyncLive and our mission to elevate community cricket tournaments into professional broadcasts.",
  },
};

const features = [
  {
    icon: Play,
    title: "Broadcast-Grade Live Streaming",
    desc: "Experience seamless YouTube live streaming equipped with professional TV-style graphics, custom overlays, and sponsor integrations.",
  },
  {
    icon: Activity,
    title: "Instantaneous Real-Time Scoring",
    desc: "Lightning-fast, ball-by-ball digital updates synchronized instantly across all devices and broadcast screens.",
  },
  {
    icon: Gavel,
    title: "Live Player Auctions",
    desc: "Effortlessly handle virtual purses, team owners, and dynamic real-time bidding for your tournament draft.",
  },
  {
    icon: Users,
    title: "End-to-End Organization",
    desc: "Plan effortlessly with our network of professional Umpires, Offline/Online Scorers, and Commentators available on demand.",
  },
  {
    icon: GitMerge,
    title: "Automated Brackets & Points",
    desc: "Intelligent tournament brackets that automatically progress winners and instantly update group rankings.",
  },
  {
    icon: Globe,
    title: "Global Player Statistics",
    desc: "Every run and wicket is automatically recorded, building a comprehensive career profile for every player in your ecosystem.",
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
            Elevating{" "}
            <span className="text-teal-500 block md:inline">
              Community Cricket
            </span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto font-medium text-slate-600 dark:text-slate-400 transition-colors">
            <strong className="text-teal-500 font-black">CricSyncLive</strong>{" "}
            is a premium tournament management and broadcasting engine,
            specifically built to provide local and corporate cricket leagues
            with television-grade tools.
          </p>
          <p className="text-md mt-4 max-w-xl mx-auto font-medium text-slate-500 dark:text-slate-400 transition-colors">
            We don't just record scores; we transform local matches into
            professional sporting events.
          </p>
        </div>

        {/* --- SERVICES GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {features.map((f, i) => (
            <div
              key={i}
              className="p-6 md:p-8 rounded-3xl border bg-white dark:bg-[#1C2128]/80 border-slate-200 dark:border-white/5 hover:-translate-y-1 hover:border-teal-300 dark:hover:border-teal-500/30 shadow-lg hover:shadow-teal-500/10 dark:hover:shadow-teal-500/10 transition-all duration-300 backdrop-blur-sm">
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
        <div className="mt-20 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-indigo-500 mb-4">
              The CricSyncLive Difference
            </h2>
            <p className="max-w-2xl mx-auto font-bold uppercase tracking-widest text-xs md:text-sm text-slate-500 dark:text-slate-400 transition-colors">
              Built by experts, adhering to the highest industry standards for
              broadcast and operations.
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
                  Built by Experts, For the Game
                </h3>
                <p className="text-base leading-relaxed font-medium mb-8 text-slate-600 dark:text-slate-400 transition-colors">
                  Our team isn't just a group of skilled software developers—we
                  are ardent cricket fans and experienced tournament organizers.
                  We understand the discipline, etiquette, and fast-paced nature
                  of the sport from the ground up, ensuring our technology
                  adheres to the highest industry standards.
                </p>

                {/* Ethos Badges */}
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm transition-colors">
                    Flawless Execution
                  </span>
                  <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-sm transition-colors">
                    Tournament Strategy
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
                    We don't just provide software; we deliver a professional
                    experience using top-tier broadcasting equipment. We
                    guarantee efficient digital management of your entire
                    tournament from the first ball to the final trophy
                    presentation.
                  </p>
                </div>
              </div>

              {/* Strategy Card 1: Grassroots */}
              <div className="p-6 md:p-8 rounded-[2rem] border flex flex-col justify-center transition-transform hover:-translate-y-1 bg-slate-50 dark:bg-[#13161a] border-slate-200 dark:border-white/5 shadow-sm dark:shadow-lg">
                <Activity className="text-amber-500 mb-5" size={28} />
                <h4 className="text-sm font-black uppercase tracking-widest mb-3 text-slate-900 dark:text-white transition-colors">
                  Fostering Local Communities
                </h4>
                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400 transition-colors">
                  Local tournaments often suffer from limited budgets and
                  technical resources. Our goal is to empower grassroots leagues
                  with premium digital services that completely surpass their
                  expectations.
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
                  We build infrastructure designed to scale. From weekend
                  box-cricket cups to high-stakes corporate leagues, we provide
                  the robust digital ecosystem your event demands.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- CALL TO ACTION SECTION --- */}
        <div className="mt-12 bg-[var(--surface-1)] dark:bg-teal-900/20 rounded-[2.5rem] p-8 md:p-12 text-center border border-[var(--border-1)] dark:border-teal-500/20 shadow-2xl relative overflow-hidden transition-colors duration-500">
          <div className="absolute inset-0 opacity-10 dark:opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-500 via-transparent to-transparent"></div>

          <div className="relative z-10">
            {/* Updated Header with Variable Color */}
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-[var(--foreground)] mb-4 transition-colors">
              Want to Elevate Your Next Tournament?
            </h2>

            {/* Updated Subtitle with Variable Color */}
            <p className="text-[var(--text-muted)] font-medium max-w-xl mx-auto mb-10 text-sm md:text-base transition-colors">
              Stop settling for basic scoreboards. Let's make your local league
              look like a major international broadcast.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a
                href="https://wa.me/919702485146"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 px-8 rounded-full transition-all w-full sm:w-auto hover:shadow-lg hover:shadow-teal-500/20 hover:-translate-y-1">
                <Phone size={20} />
                Book a Broadcast
              </a>
              <a
                href="mailto:ramchat007@gmail.com"
                className="flex items-center gap-3 bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/70 text-[var(--foreground)] font-bold py-4 px-8 rounded-full transition-all w-full sm:w-auto border border-[var(--border-1)] hover:-translate-y-1">
                <Mail size={20} />
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
