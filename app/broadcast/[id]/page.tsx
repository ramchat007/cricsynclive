'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { calculateScore } from '../../../lib/score-calculator';

export default function BroadcastOverlay({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise
  const { id: matchId } = use(params);

  const [events, setEvents] = useState<any[]>([]);
  const [matchData, setMatchData] = useState<any>(null);

  useEffect(() => {
    if (!matchId) return;

    const fetchMatch = async () => {
      const { data } = await supabase.from('matches').select('*').eq('id', matchId).single();
      setMatchData(data);
    };

    const fetchEvents = async () => {
      const { data } = await supabase
        .from('ball_events')
        .select('*')
        .eq('match_id', matchId)
        .order('sequence_no', { ascending: true });
      if (data) setEvents(data);
    };

    fetchMatch();
    fetchEvents();

    const channel = supabase
      .channel('broadcast-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ball_events' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setEvents(prev => prev.map(e => e.id === payload.new.id ? payload.new : e));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const stats = calculateScore(events);
  if (!matchData) return null;

  return (
    <div className="w-full h-screen bg-transparent flex flex-col justify-end p-10 font-sans">
      {/* PROFESSIONAL BOTTOM BAR SCOREBOARD */}
      <div className="flex items-stretch bg-black/80 backdrop-blur-md border-b-4 border-teal-500 rounded-lg overflow-hidden w-fit shadow-2xl animate-in slide-in-from-left duration-700">
        <div className="bg-teal-600 px-6 py-4 flex items-center">
          <span className="text-white font-black text-2xl uppercase tracking-tighter">
            {matchData.team_a_name}
          </span>
        </div>
        <div className="px-8 py-4 flex flex-col justify-center min-w-[180px]">
          <span className="text-teal-400 text-xs font-bold uppercase tracking-widest">RUNS/WKT</span>
          <span className="text-white text-4xl font-black">{stats.score}</span>
        </div>
        <div className="px-8 py-4 bg-white/5 flex flex-col justify-center border-l border-white/10">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">OVERS</span>
          <span className="text-white text-3xl font-bold">{stats.overs}</span>
        </div>
        <div className="px-8 py-4 flex items-center bg-black/40 border-l border-white/10">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2" />
          <span className="text-slate-300 font-bold text-sm uppercase">LIVE</span>
        </div>
      </div>
    </div>
  );
}