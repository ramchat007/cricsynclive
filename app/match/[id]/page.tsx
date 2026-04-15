'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateScore } from '@/lib/score-calculator';

export default function LiveScoring({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = use(params); 
  
  const [events, setEvents] = useState<any[]>([]);
  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Player Tracking State
  const [striker, setStriker] = useState('Player 1');
  const [nonStriker, setNonStriker] = useState('Player 2');
  const [bowler, setBowler] = useState('Bowler 1');

  // Advanced Action Modal State
  const [activeMenu, setActiveMenu] = useState<'none' | 'wide' | 'noball' | 'wicket' | 'settings'>('none');
  const [tempRuns, setTempRuns] = useState(0);

  useEffect(() => {
    if (!matchId) return;

    const fetchInitialData = async () => {
      // 1. Fetch Match Info (For Team Names & Settings)
      const matchRes = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (matchRes.data) setMatchData(matchRes.data);

      // 2. Fetch Ball Events
      const eventRes = await supabase.from('ball_events').select('*').eq('match_id', matchId).order('sequence_no', { ascending: true });
      if (eventRes.data) setEvents(eventRes.data);
      
      setLoading(false);
    };

    fetchInitialData();

    const channel = supabase
      .channel('live-scoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ball_events' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => prev.some(e => e.id === payload.new.id) ? prev : [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setEvents(prev => prev.map(e => e.id === payload.new.id ? payload.new : e));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const stats = calculateScore(events);

  // UNIVERSAL DELIVERY ENGINE (Now handles advanced edge cases)
  const recordDelivery = async ({
    runsOffBat = 0,
    extras = 0,
    extraType = 'none',
    isWicket = false,
    wicketType = 'none',
    forceLegalBall = false 
  }) => {
    const newId = crypto.randomUUID();

    // Over Math: A ball is valid if it's NOT an extra, OR if the local rules forced it to be legal
    const validBalls = events.filter(e => (!['wide', 'noball'].includes(e.extra_type) || e.force_legal) && !e.is_undone).length;
    
    // Auto-swap strike on odd runs (1, 3)
    if (runsOffBat % 2 !== 0) {
      setStriker(nonStriker);
      setNonStriker(striker);
    }

    const optimisticEvent = {
      id: newId,
      match_id: matchId,
      inning_no: 1,
      over_no: Math.floor(validBalls / 6),
      ball_no: (validBalls % 6) + 1,
      runs_off_bat: runsOffBat,
      extras: extras,
      extra_type: extraType,
      is_wicket: isWicket,
      wicket_type: wicketType,
      striker_name: striker,
      bowler_name: bowler,
      is_undone: false,
      force_legal: forceLegalBall // Custom local rule override
    };
    
    setEvents(prev => [...prev, optimisticEvent]);
    setActiveMenu('none'); // Close menus
    setTempRuns(0);

    const { error } = await supabase.from('ball_events').insert(optimisticEvent);
    if (error) {
      alert(`FAILED TO SAVE: ${error.message}`);
      setEvents(prev => prev.filter(e => e.id !== newId));
    }
  };

  const undoLastBall = async () => {
    const activeEvents = events.filter(e => !e.is_undone);
    if (activeEvents.length === 0) return;
    const lastEvent = activeEvents[activeEvents.length - 1];

    setEvents(prev => prev.map(e => e.id === lastEvent.id ? { ...e, is_undone: true } : e));
    await supabase.from('ball_events').update({ is_undone: true }).eq('id', lastEvent.id);
  };

  const updateSettings = async (newLimit: number) => {
    setMatchData({ ...matchData, overs_limit: newLimit });
    await supabase.from('matches').update({ overs_limit: newLimit }).eq('id', matchId);
    setActiveMenu('none');
  };

  if (loading) return <div className="p-10 text-white animate-pulse text-center mt-20 font-bold tracking-widest">BOOTING ENGINE...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 font-sans">
      <div className="max-w-lg mx-auto bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
        
        {/* HEADER: TEAM NAMES & SETTINGS */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div className="flex flex-col">
            <span className="text-teal-400 font-black text-xl uppercase tracking-tighter">{matchData?.team_a_name}</span>
            <span className="text-slate-500 font-bold text-sm">vs {matchData?.team_b_name}</span>
          </div>
          <button 
            onClick={() => setActiveMenu(activeMenu === 'settings' ? 'none' : 'settings')}
            className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg font-bold text-sm"
          >
            ⚙️ {matchData?.overs_limit} Overs
          </button>
        </div>

        {/* SCOREBOARD */}
        <div className="text-center py-6 bg-black/40 rounded-2xl border border-white/5 mb-6 relative overflow-hidden">
          <div className="text-7xl font-black text-white">{stats.score}</div>
          <div className="text-lg text-slate-400 mt-2 font-medium tracking-wide">
            Overs: <span className="text-teal-400 font-bold">{stats.overs}</span> / {matchData?.overs_limit}
          </div>
        </div>

        {/* PLAYER TRACKER UI */}
        <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-800/50 p-4 rounded-2xl border border-white/5">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Striker 🏏</label>
            <input 
              value={striker} 
              onChange={(e) => setStriker(e.target.value)}
              className="w-full bg-transparent text-white font-bold border-b border-slate-700 focus:border-teal-500 outline-none py-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Bowler 🎾</label>
            <input 
              value={bowler} 
              onChange={(e) => setBowler(e.target.value)}
              className="w-full bg-transparent text-white font-bold border-b border-slate-700 focus:border-teal-500 outline-none py-1"
            />
          </div>
        </div>

        {/* INLINE MENUS (Dynamic Rendering) */}
        {activeMenu === 'settings' && (
          <div className="mb-6 p-4 bg-slate-800 rounded-xl border border-slate-700 animate-in fade-in zoom-in-95">
            <h3 className="text-teal-400 font-bold mb-3 uppercase tracking-widest text-sm">Match Settings</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Total Overs:</span>
              <input type="number" defaultValue={matchData?.overs_limit} id="overInput" className="bg-black text-white w-20 p-2 rounded-lg" />
              <button onClick={() => updateSettings(Number((document.getElementById('overInput') as HTMLInputElement).value))} className="bg-teal-600 px-4 py-2 rounded-lg font-bold">Save</button>
            </div>
          </div>
        )}

        {activeMenu === 'noball' && (
          <div className="mb-6 p-4 bg-yellow-900/20 rounded-xl border border-yellow-500/30 animate-in fade-in zoom-in-95">
            <h3 className="text-yellow-400 font-bold mb-3 uppercase tracking-widest text-sm">No Ball Details</h3>
            <p className="text-xs text-slate-400 mb-4">Did the batsman score runs off the bat?</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button key={r} onClick={() => setTempRuns(r)} className={`py-2 rounded-lg font-bold ${tempRuns === r ? 'bg-yellow-500 text-black' : 'bg-black text-white'}`}>{r}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => recordDelivery({ runsOffBat: tempRuns, extras: 1, extraType: 'noball' })} className="flex-1 bg-yellow-600 text-black font-bold py-3 rounded-xl">Save NB + {tempRuns}</button>
              <button onClick={() => recordDelivery({ runsOffBat: tempRuns, extras: 1, extraType: 'noball', forceLegalBall: true })} className="flex-1 border border-yellow-600/50 text-yellow-500 text-xs font-bold py-3 rounded-xl">Save & Count Ball</button>
            </div>
          </div>
        )}

        {activeMenu === 'wide' && (
          <div className="mb-6 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30 animate-in fade-in zoom-in-95">
            <h3 className="text-blue-400 font-bold mb-3 uppercase tracking-widest text-sm">Wide Details</h3>
            <p className="text-xs text-slate-400 mb-4">Were there extra runs (byes) on this wide?</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[0, 1, 2, 3, 4].map(r => (
                <button key={r} onClick={() => setTempRuns(r)} className={`py-2 rounded-lg font-bold ${tempRuns === r ? 'bg-blue-500 text-black' : 'bg-black text-white'}`}>+{r}</button>
              ))}
            </div>
            <button onClick={() => recordDelivery({ extras: 1 + tempRuns, extraType: 'wide' })} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Save Wide (+{1 + tempRuns} total)</button>
          </div>
        )}

        {activeMenu === 'wicket' && (
          <div className="mb-6 p-4 bg-red-900/20 rounded-xl border border-red-500/30 animate-in fade-in zoom-in-95">
            <h3 className="text-red-400 font-bold mb-3 uppercase tracking-widest text-sm">Wicket Type</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {['Bowled', 'Caught', 'Run Out', 'Stumped'].map(type => (
                <button key={type} onClick={() => recordDelivery({ isWicket: true, wicketType: type })} className="bg-black border border-white/5 hover:border-red-500/50 py-3 rounded-lg font-bold text-sm">
                  {type}
                </button>
              ))}
            </div>
            <button onClick={() => setActiveMenu('none')} className="w-full text-slate-500 text-sm font-bold mt-2">Cancel</button>
          </div>
        )}

        {/* DEFAULT CONTROLS (Only visible if no menu is active) */}
        {activeMenu === 'none' && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[0, 1, 2, 3, 4, 6].map(run => (
                <button key={run} onClick={() => recordDelivery({ runsOffBat: run })} className="h-16 rounded-xl bg-slate-800 hover:bg-teal-600 font-black text-xl border border-white/5 active:scale-95 transition-all shadow-lg">
                  {run}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <button onClick={() => setActiveMenu('wide')} className="h-14 rounded-xl bg-blue-900/30 text-blue-400 hover:bg-blue-800 hover:text-white border border-blue-500/30 font-bold text-sm tracking-wider active:scale-95 transition-all">Wide...</button>
              <button onClick={() => setActiveMenu('noball')} className="h-14 rounded-xl bg-yellow-900/30 text-yellow-400 hover:bg-yellow-800 hover:text-white border border-yellow-500/30 font-bold text-sm tracking-wider active:scale-95 transition-all">No Ball...</button>
              <button onClick={() => setActiveMenu('wicket')} className="h-14 rounded-xl bg-red-900/80 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:bg-red-600 font-black tracking-widest uppercase active:scale-95 transition-all">Wicket...</button>
            </div>
          </>
        )}

        <div className="pt-6 border-t border-slate-800">
          <button onClick={undoLastBall} className="w-full bg-transparent text-slate-500 border-2 border-slate-800 hover:border-red-900/50 hover:bg-red-950/40 hover:text-red-500 py-4 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95 text-xs">
            Undo Last Action
          </button>
        </div>
      </div>
    </div>
  );
}