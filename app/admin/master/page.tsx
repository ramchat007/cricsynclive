"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ShieldAlert, Trophy, Users, Eye } from "lucide-react";

export default function MasterAdmin() {
  const [stats, setStats] = useState<{
    tournaments: any[];
    totalPlayers: number;
  }>({
    tournaments: [],
    totalPlayers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    // 1. Fetch EVERY tournament in the system
    const { data: tournaments } = await supabase
      .from("tournaments")
      .select("*, profiles(email)");
    // 2. Fetch Global Player Count
    const { count: playerCount } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true });

    setStats({
      tournaments: tournaments || [],
      totalPlayers: playerCount || 0,
    });
    setLoading(false);
  };

  if (loading)
    return (
      <div className="p-20 text-center font-black animate-bounce">
        SECURE ACCESS LOADING...
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 bg-red-500 rounded-2xl text-white shadow-lg shadow-red-500/20">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            System Overlord
          </h1>
          <p className="text-slate-500 font-bold">
            Global Application Monitoring & Access Control
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex justify-between items-center shadow-2xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Total System Tournaments
            </p>
            <h2 className="text-5xl font-black mt-2">
              {stats.tournaments.length}
            </h2>
          </div>
          <Trophy size={48} className="text-slate-700" />
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] flex justify-between items-center shadow-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Global Registered Players
            </p>
            <h2 className="text-5xl font-black mt-2 text-slate-900">
              {stats.totalPlayers}
            </h2>
          </div>
          <Users size={48} className="text-slate-100" />
        </div>
      </div>

      <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
        Live Tournaments{" "}
        <span className="text-sm font-bold text-slate-400">
          ({stats.tournaments.length})
        </span>
      </h3>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">
                Tournament Name
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">
                Owner (Admin)
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">
                Status
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.tournaments.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{t.name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {t.profiles?.email || "N/A"}
                </td>
                <td className="px-6 py-4 text-xs font-black uppercase text-teal-500">
                  {t.status}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/t/${t.id}`}
                    className="text-slate-400 hover:text-teal-500 transition-colors">
                    <Eye size={20} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
