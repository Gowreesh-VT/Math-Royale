'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { secureFetch } from '@/lib/csrf';



/* ---------------- TYPES ---------------- */

interface Question {
  id: string;
  contestId: string;
  problemIndex: string;
  name: string;
  url: string;
  solved: boolean;
}

interface SideData {
  score: number;
  questions: Question[];
}

interface MatchResponse {
  success: boolean;
  match: {
    roundName: string;
    status: 'active' | 'completed';
    timeRemaining: number;
    winningSide: 'A' | 'B' | null;
    sideA: SideData;
    sideB: SideData;
  };
}

/* ---------------- PAGE ---------------- */

export default function Round2MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { data: session } = useSession();
  const [data, setData] = useState<MatchResponse | null>(null);
  const [mySide, setMySide] = useState<'A' | 'B'>('A');
  const [timeRemaining, setTimeRemaining] = useState<number>(2700);
  const [loading, setLoading] = useState(true);

  const teamId: string = session?.user?.teamId || "";

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };


  /* ---------- FETCH MATCH STATE ---------- */
  const fetchMatch = useCallback(async () => {
    const res = await fetch(`/api/Round-2/match/${matchId}`);
    const json = await res.json();

    if (!json.success) {
      router.push('/round1');
      return;
    }

    setData(json);

    if (json.match.timeRemaining !== undefined) {
      setTimeRemaining(json.match.timeRemaining);
    }

    if (teamId) {
      const isInSideA = json.match.sideA.teams.some((t: any) => t.id === teamId);
      const isInSideB = json.match.sideB.teams.some((t: any) => t.id === teamId);
      
      if (isInSideA) {
        setMySide('A');
      } else if (isInSideB) {
        setMySide('B');
      } else {
        const userHandle = session?.user?.codeforcesHandle;
        if (userHandle && json.match.sideB.handles.includes(userHandle)) {
          setMySide('B');
        } else {
          setMySide('A');
        }
      }
    }
    setLoading(false);
  }, [matchId, router, teamId, session?.user?.codeforcesHandle]);

  // /* ---------- MATCH POLLING ---------- */
  useEffect(() => {
    fetchMatch();
    const poll = setInterval(fetchMatch, 7000);
    return () => clearInterval(poll);
  }, [fetchMatch]);

  /* ---------- COUNTDOWN TIMER ---------- */
  useEffect(() => {
    if (!data || data.match.status !== 'active') return;
    
    const countdown = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdown);

          fetch('/api/Round-2/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId }),
          }).then(() => fetchMatch());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [data?.match?.status, matchId, teamId, fetchMatch]);

  /* ---------- AUTO SYNC  ---------- */
  useEffect(() => {
    if (!data) {
      return;
    }
    if (data.match.status !== 'active') {
      return;
    }

    const sync = async () => {
      try {
        const res = await secureFetch('/api/Round-2/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId,
          }),
        });
        const result = await res.json();
        
        if (result.success) {
          fetchMatch();
        }
      } catch (err) {
        // Only log errors, not success data
        console.error('[Sync] Failed:', err);
      }
    };

    sync();

    const interval = setInterval(sync, 30000);
    return () => clearInterval(interval);
  }, [data?.match?.status, matchId, teamId, fetchMatch]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/40 uppercase tracking-widest text-xs">
        Loading Match...
      </div>
    );
  }

  const my = mySide === 'A' ? data.match.sideA : data.match.sideB;
  const opp = mySide === 'A' ? data.match.sideB : data.match.sideA;
  const BASE_SCORE = 50;
  const MAX_SCORE = 75;
  const WIN_RANGE = MAX_SCORE - BASE_SCORE;


  let pullPercentage = 50;

  const myProgress = Math.max(0, my.score - BASE_SCORE);
  const oppProgress = Math.max(0, opp.score - BASE_SCORE);

  if (my.score >= MAX_SCORE && opp.score < MAX_SCORE) {
    pullPercentage = 0;
  } else if (opp.score >= MAX_SCORE && my.score < MAX_SCORE) {
    pullPercentage = 100;
  } else if (my.score >= MAX_SCORE && opp.score >= MAX_SCORE) {

    pullPercentage = my.score > opp.score ? 0 : (opp.score > my.score ? 100 : 50);
  } else {

    const totalProgress = myProgress + oppProgress;
    
    if (totalProgress > 0) {
      pullPercentage = (oppProgress / totalProgress) * 100;
    } else if (my.score < BASE_SCORE || opp.score < BASE_SCORE) {

      const diff = my.score - opp.score;
      pullPercentage = 50 - (diff / WIN_RANGE) * 50;
      pullPercentage = Math.max(0, Math.min(100, pullPercentage));
    } else {

      pullPercentage = 50;
    }
  }


  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6 py-8">
      <main className="max-w-5xl mx-auto space-y-12">

        {/* ---------- HEADER ---------- */}
        <header className="border-b flex items-center flex-wrap justify-between border-white/10 pb-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-purple-500/30 bg-purple-500/10 rounded-lg w-fit mb-1">
              <span className="w-1.5 h-1.5 bg-purple-500 animate-pulse rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
              {`Team ${mySide}`}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tighter uppercase mb-2 chrome-text">
              {data.match.roundName}
            </h1>
            <p className="text-xs tracking-[0.3em] uppercase text-white/40 mt-2">
              • Live Match
            </p>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-4">
            <div className="flex items-center gap-3">
              {/* Timer Display */}
              <div className={`px-5 py-2 rounded-lg border ${
                timeRemaining <= 300 
                  ? 'border-red-500/50 bg-red-500/10' 
                  : timeRemaining <= 600 
                    ? 'border-yellow-500/50 bg-yellow-500/10' 
                    : 'border-white/20 bg-white/5'
              }`}>
                <div className="flex flex-col items-center">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">Time Remaining</p>
                  <p className={`text-3xl font-mono font-bold ${
                    timeRemaining <= 300 
                      ? 'text-red-400' 
                      : timeRemaining <= 600 
                        ? 'text-yellow-400' 
                        : 'text-white'
                  }`}>
                    {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogoutClick}
                className="px-4 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* ---------- SCORE & ROPE ---------- */}
        <section className="space-y-4">
          <div className="flex justify-between text-sm uppercase tracking-widest text-white/60">
            <span>Your Side</span>
            <span>Opponent</span>
          </div>

          <div className="flex justify-between text-4xl font-black">
            <span className={my.score >= MAX_SCORE ? "text-green-400" : ""}>
              {my.score}
            </span>
            <span className={opp.score >= MAX_SCORE ? "text-purple-400/80" : ""}>
              {opp.score}
            </span>
          </div>

          <div className="relative h-6 rounded-full overflow-hidden bg-white/5 border border-white/10">
            <div className="absolute inset-0 flex">
              <div className="w-1/4 bg-white/5" />
              <div className="w-1/2 bg-white/10" />
              <div className="w-1/4 bg-white/5" />
            </div>

            <div className="absolute left-1/2 top-0 h-full w-[2px] bg-white/30" />

            <motion.div
              animate={{
                left: `${pullPercentage}%`
              }}
              transition={{
                type: 'spring',
                stiffness: my.score >= MAX_SCORE || opp.score >= MAX_SCORE ? 80 : 140,
                damping: my.score >= MAX_SCORE || opp.score >= MAX_SCORE ? 12 : 18
              }}
              className={`absolute top-0 -translate-x-1/2
     w-36 h-full bg-white
     shadow-[0_0_30px_rgba(255,255,255,0.8)]
     ring-1 ring-white/40 z-10
     ${(my.score >= MAX_SCORE || opp.score >= MAX_SCORE) ? 'text-purple-300/80 shadow-[0_0_40px_rgba(34,197,94,0.9)]' : ''}`}
            />

            <div className="absolute left-2 top-0 h-full w-[2px] bg-white/40" />
            <div className="absolute right-2 top-0 h-full w-[2px] bg-white/40" />
          </div>

          {/* POINT SYSTEM */}
          <div className="flex justify-center gap-6 text-[10px] uppercase tracking-widest text-white/40">
            <span>✔ Accepted: +10</span>
            <span>✖ Wrong: −5</span>
            <span>🏁 Win at 75</span>
          </div>

          <div className="mt-3 text-center">
            <span className="inline-block px-4 py-1 rounded-full border border-white/10 bg-white/5
      text-xs uppercase tracking-widest text-white/70">
              You are playing as&nbsp;
              <span className="font-bold text-white">
                Side {mySide}
              </span>
            </span>
          </div>

          {data.match.status === 'completed' && (
            <motion.p
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-center text-purple-300/80 uppercase tracking-widest text-sm font-bold"
            >
              🎉 Match Completed — Winner: Side {data.match.winningSide} 🎉
            </motion.p>
          )}
        </section>



        {/* ---------- QUESTIONS ---------- */}
        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase tracking-widest">
            Your Questions
          </h2>

          <div className="divide-y divide-white/10 border border-white/10 bg-[#0b0b0b]">
            {my.questions.map(q => (
              <div
                key={q.id}
                onClick={() =>
                  window.open(
                    `https://codeforces.com/contest/${q.contestId}/problem/${q.problemIndex}`,
                    '_blank'
                  )
                }
                className="p-4 cursor-pointer hover:bg-white/5 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold">
                    {q.problemIndex}. {q.name}
                  </p>
                  <p className="text-xs text-white/40">
                    Contest {q.contestId}
                  </p>
                </div>

                <span
                  className={`text-xs uppercase tracking-widest ${q.solved ? 'text-green-400' : 'text-white/30'
                    }`}
                >
                  {q.solved ? 'Solved' : 'Unsolved'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- POINT SYSTEM ---------- */}
        <section className="border-t border-white/10 pt-8 text-xs uppercase tracking-widest text-white/50 space-y-2">
          <p>Scoring System</p>
          <ul className="space-y-1">
            <li>✔ Correct submission: +10 points</li>
            <li>✖ Wrong answer: −5 points</li>
            <li>🏁 Win at 75 points or timeout</li>
          </ul>
        </section>
      </main>
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b0b0b] border border-red-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_20px_60px_rgba(239,68,68,0.2)]">
            <h2 className="text-2xl font-sans font-black tracking-tighter uppercase mb-4 text-white">
              Confirm Sign Out
            </h2>
            <p className="font-ui text-sm text-white/60 mb-8 uppercase tracking-wider">
              Are you sure you want to sign out? You will be redirected to the home page.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-6 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 px-6 py-3 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>


  );
}
