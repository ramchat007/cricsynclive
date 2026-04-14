'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function CommandCenter() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setMatches(data);
    setLoading(false);
  };

  const startNewMatch = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          tournament_id: '00000000-0000-0000-0000-000000000000',
          team_a_name: 'Majha Vighnaharta', 
          team_b_name: 'Challengers XI',
          overs_limit: 5,
          status: 'live'
        })
        .select(); // We removed .single() because it sometimes masks the real error

      if (error) {
        // This will catch Supabase database errors (like RLS or bad keys)
        alert(`SUPABASE ERROR: ${error.message}`);
        console.error("Detailed Database Error:", error);
        return;
      }

      if (!data || data.length === 0) {
        alert("Match was sent, but Supabase refused to return the data. This is usually an RLS (Row Level Security) block.");
        return;
      }

      // Success! Route to the scorer dashboard
      router.push(`/match/${data[0].id}`);
      
    } catch (err: any) {
      // This will catch Network errors (like a bad URL in your .env file)
      alert(`SYSTEM ERROR: ${err.message}`);
      console.error("Detailed System Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-widest text-teal-500 uppercase">CricSync</h1>
            <p className="text-slate-400 tracking-wider text-sm font-medium mt-1">TOURNAMENT COMMAND CENTER V2</p>
          </div>
          <button 
            onClick={startNewMatch}
            className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(13,148,136,0.4)]"
          >
            + Start Live Match
          </button>
        </header>

        {loading ? (
          <div className="text-slate-500 animate-pulse font-bold">Syncing with ledger...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.length === 0 ? (
              <div className="col-span-2 text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500">
                No active matches found. Start one above!
              </div>
            ) : (
              matches.map(match => (
                <div key={match.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-teal-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {match.status}
                    </span>
                    <span className="text-slate-500 text-xs font-bold uppercase">{match.overs_limit} Overs</span>
                  </div>
                  
                  <div className="text-xl font-black mb-6">
                    <div className="text-white">{match.team_a_name}</div>
                    <div className="text-slate-500 text-sm my-2">VS</div>
                    <div className="text-white">{match.team_b_name}</div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => router.push(`/match/${match.id}`)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-lg font-bold text-sm transition-colors"
                    >
                      Open Scorer
                    </button>
                    <button 
                      onClick={() => window.open(`/broadcast/${match.id}`, '_blank')}
                      className="flex-1 bg-teal-900/30 text-teal-400 border border-teal-500/30 hover:bg-teal-900/50 py-3 rounded-lg font-bold text-sm transition-colors"
                    >
                      OBS Overlay
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}