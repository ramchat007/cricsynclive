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

    // UPGRADED REALTIME: Now with duplicate protection
    const channel = supabase
      .channel('live-scoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ball_events' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => {
            // If our Optimistic UI already added this exact ID, ignore the broadcast
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

  // UPGRADED ADDBALL: True UUID synchronization
  const addBall = async (runs: number) => {
    const newId = crypto.randomUUID(); // Generates a valid database UUID instantly

    const optimisticEvent = {
      id: newId,
      match_id: matchId,
      runs_off_bat: runs,
      extras: 0,
      is_undone: false,
      extra_type: 'none'
    };
    
    setEvents(prev => [...prev, optimisticEvent]);

    const { error } = await supabase.from('ball_events').insert({
      id: newId, // We force Supabase to use our pre-generated ID
      match_id: matchId,
      inning_no: 1,
      over_no: Math.floor(events.length / 6),
      ball_no: (events.length % 6) + 1,
      runs_off_bat: runs,
    });

    if (error) {
      alert(`FAILED TO SAVE RUN: ${error.message}`);
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

    const { error } = await supabase
      .from('ball_events')
      .update({ is_undone: true })
      .eq('id', lastEvent.id);

    if (error) {
      alert("Failed to undo! Check console.");
      console.error(error);
      setEvents(prev => prev.map(e => 
        e.id === lastEvent.id ? { ...e, is_undone: false } : e
      ));
    }
  };

  if (loading) return <div className="p-10 text-white animate-pulse">Loading Engine...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-md mx-auto bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl">
        <h1 className="text-center text-slate-500 font-bold tracking-widest mb-4">LIVE SCORE</h1>
        <div className="text-center">
          <div className="text-7xl font-black text-teal-500">{stats.score}</div>
          <div className="text-xl text-slate-400 mt-2">Overs: {stats.overs}</div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-10">
          {[0, 1, 2, 3, 4, 6].map(run => (
            <button 
              key={run}
              onClick={() => addBall(run)}
              className="h-16 rounded-xl bg-slate-800 hover:bg-teal-600 font-bold text-xl transition-all shadow-lg active:scale-95"
            >
              {run}
            </button>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex gap-4">
          <button 
            onClick={undoLastBall}
            className="flex-1 bg-red-950/40 text-red-500 border border-red-900/50 hover:bg-red-900 hover:text-white py-4 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95"
          >
            Undo Last Ball
          </button>
        </div>
      </div>
    </div>
  );
}