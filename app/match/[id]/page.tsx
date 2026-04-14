'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateScore } from '@/lib/score-calculator';

export default function LiveScoring({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = use(params); 
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;

    const fetchEvents = async () => {
      const { data } = await supabase
        .from('ball_events')
        .select('*')
        .eq('match_id', matchId)
        .order('sequence_no', { ascending: true });
      
      if (data) setEvents(data);
      setLoading(false);
    };

    fetchEvents();

    const channel = supabase
      .channel('live-scoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ball_events' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => {
            if (prev.some(e => e.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        } else if (payload.eventType === 'UPDATE') {
          setEvents(prev => prev.map(e => e.id === payload.new.id ? payload.new : e));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const stats = calculateScore(events);

  // THE UNIVERSAL SCORING ENGINE
  const recordDelivery = async (runsOffBat: number, extraType: string = 'none', isWicket: boolean = false) => {
    const newId = crypto.randomUUID();

    // 1. Calculate Over Math strictly from valid, non-undone balls
    const validBalls = events.filter(e => e.extra_type !== 'wide' && e.extra_type !== 'noball' && !e.is_undone).length;
    
    // 2. Penalty logic (Standard T20/Tennis Cricket: 1 run for Wide/NB)
    const penaltyRuns = (extraType === 'wide' || extraType === 'noball') ? 1 : 0;

    const optimisticEvent = {
      id: newId,
      match_id: matchId,
      inning_no: 1,
      over_no: Math.floor(validBalls / 6),
      ball_no: (validBalls % 6) + 1,
      runs_off_bat: runsOffBat,
      extras: penaltyRuns,
      extra_type: extraType,
      is_wicket: isWicket,
      is_undone: false,
    };
    
    setEvents(prev => [...prev, optimisticEvent]);

    const { error } = await supabase.from('ball_events').insert(optimisticEvent);

    if (error) {
      alert(`FAILED TO SAVE: ${error.message}`);
      console.error(error);
      setEvents(prev => prev.filter(e => e.id !== newId));
    }
  };

  const undoLastBall = async () => {
    const activeEvents = events.filter(e => !e.is_undone);
    if (activeEvents.length === 0) return;

    const lastEvent = activeEvents[activeEvents.length - 1];

    setEvents(prev => prev.map(e => 
      e.id === lastEvent.id ? { ...e, is_undone: true } : e
    ));

    const { error } = await supabase.from('ball_events').update({ is_undone: true }).eq('id', lastEvent.id);

    if (error) {
      alert("Failed to undo! Check console.");
      setEvents(prev => prev.map(e => e.id === lastEvent.id ? { ...e, is_undone: false } : e));
    }
  };

  if (loading) return <div className="p-10 text-white animate-pulse flex justify-center items-center h-screen font-bold tracking-widest">BOOTING ENGINE...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-md mx-auto bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl">
        <h1 className="text-center text-slate-500 font-bold tracking-widest mb-4">CRICSYNC LIVE</h1>
        
        {/* SCOREBOARD */}
        <div className="text-center py-6 bg-black/40 rounded-2xl border border-white/5 mb-8">
          <div className="text-7xl font-black text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.2)]">
            {stats.score}
          </div>
          <div className="text-xl text-slate-400 mt-2 font-medium tracking-wide">
            Overs: <span className="text-white font-bold">{stats.overs}</span>
          </div>
        </div>

        {/* RUN BUTTONS (Standard Legal Deliveries) */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[0, 1, 2, 3, 4, 6].map(run => (
            <button 
              key={run}
              onClick={() => recordDelivery(run)}
              className="h-14 rounded-xl bg-slate-800 hover:bg-teal-600 font-black text-xl transition-all active:scale-95 border border-white/5"
            >
              {run}
            </button>
          ))}
        </div>

        {/* EXTRAS & WICKET BUTTONS */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <button 
            onClick={() => recordDelivery(0, 'wide', false)}
            className="h-14 rounded-xl bg-blue-900/30 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 font-bold text-sm tracking-wider transition-all active:scale-95"
          >
            Wide
          </button>
          <button 
            onClick={() => recordDelivery(0, 'noball', false)}
            className="h-14 rounded-xl bg-yellow-900/30 text-yellow-400 hover:bg-yellow-600 hover:text-white border border-yellow-500/30 font-bold text-sm tracking-wider transition-all active:scale-95"
          >
            No Ball
          </button>
          <button 
            onClick={() => recordDelivery(0, 'none', true)}
            className="h-14 rounded-xl bg-red-600 text-white hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] font-black tracking-widest uppercase transition-all active:scale-95"
          >
            Wicket
          </button>
        </div>

        {/* ADMIN CONTROLS */}
        <div className="pt-6 border-t border-slate-800 flex gap-4">
          <button 
            onClick={undoLastBall}
            className="flex-1 bg-transparent text-slate-500 border-2 border-slate-800 hover:border-red-900/50 hover:bg-red-950/40 hover:text-red-500 py-4 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95 text-xs"
          >
            Undo Last Action
          </button>
        </div>
      </div>
    </div>
  );
}