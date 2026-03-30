'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GridCell } from '@/components/GridCell';
import { SyncButton } from '@/components/SyncButton';
import type { IProblem } from '@/types';
import CodeforcesDialog from '@/components/CodeforcesHandle';
import { secureFetch } from '@/lib/csrf';


interface GameData {
  id: string;
  name: string;
  problems: IProblem[];
}

interface Progress {
  solvedIndices: number[];
  currentScore: number;
  bingoLines: number[][];
}

interface Round1Status {
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  timeRemaining: number;
  hasEnded: boolean;
}

export default function Round1Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [game, setGame] = useState<GameData | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const hasRound2Access = session?.user?.hasRound2Access || false;
  const teamName = session?.user?.teamName || 'Team';
  const [open, setOpen] = useState(false);
  const [round1Status, setRound1Status] = useState<Round1Status | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.setCodeforcesHandle === true
    ) {
      setOpen(true);
    }
  }, [status, session]);

  useEffect(() => {
    const fetchRound1Status = async () => {
      try {
        const res = await fetch('/api/round1/status');
        const data = await res.json();
        if (data.success) {
          setRound1Status(data.session);
          setTimeRemaining(data.session.timeRemaining);
        }
      } catch (err) {
        console.error('Failed to fetch Round 1 status:', err);
      }
    };

    fetchRound1Status();
    
    const interval = setInterval(fetchRound1Status, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!round1Status?.isActive || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [round1Status?.isActive, timeRemaining]);

  const handleCodeforcesSubmit = async (handle: string) => {
    const res = await secureFetch("/api/team/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codeforcesHandle: handle }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update handle");
    }

    setOpen(false);
  };

  useEffect(() => {
    const loadGameData = async () => {
      try {
        const res = await fetch('/api/question');
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load questions');
        }

        setGame(data.game);
        setProgress(data.progress);
      } catch (err) {
        setError('Failed to load game data');
      } finally {
        setLoading(false);
      }
    };

    loadGameData();
  }, []);

  const handleSync = useCallback(async (): Promise<void> => {
    try {
      const res = await secureFetch('/api/sync-score', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setProgress(data.progress);
        setLastSyncTime(new Date());
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError('Failed to sync with Codeforces');
    }
  }, []);

  const handleRound2Click = () => {
    if (hasRound2Access) {
      router.push('/round2');
    } else {
      setShowAccessDenied(true);
      setTimeout(() => setShowAccessDenied(false), 3000); 
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const getBingoIndices = useCallback((): Set<number> => {
    if (!progress?.bingoLines) return new Set();
    const indices = new Set<number>();
    for (const line of progress.bingoLines) {
      for (const idx of line) {
        indices.add(idx);
      }
    }
    return indices;
  }, [progress?.bingoLines]);

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')} : ${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')} : ${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-2 border-white/20 animate-spin" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-2 border-2 border-white/40 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
            <div className="absolute inset-4 border-2 border-white/60 animate-spin" style={{ animationDuration: '1s' }} />
          </div>
          <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-white/40">
            Initializing Grid...
          </p>
        </div>
      </div>
    );
  }

  // Show waiting screen if Round 1 is not active (not started or ended)
  if (!round1Status?.isActive) {
    const hasEnded = round1Status?.endTime && new Date() > new Date(round1Status.endTime);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center max-w-xl px-4">
          {/* Team Name Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-purple-500/30 bg-purple-500/10 rounded-lg mb-8">
            <span className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
            <p className="font-ui text-sm uppercase tracking-[0.3em] text-purple-300">
              {teamName}
            </p>
          </div>

          <h2 className="text-4xl sm:text-5xl font-sans font-black tracking-tighter uppercase mb-6 chrome-text">
            {hasEnded ? 'Round 1 Has Ended' : 'Round 1 Not Started'}
          </h2>
          
          <p className="font-ui text-sm sm:text-base text-white/60 mb-10 uppercase tracking-wider leading-relaxed">
            {hasEnded 
              ? 'The contest has ended. Thank you for participating! Check the leaderboard for final results.'
              : 'The contest has not begun yet. Please wait for the organizers to start Round 1.'
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {hasEnded && (
              <button 
                onClick={handleRound2Click}
                className="w-full l:w-auto px-10 py-3 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
              >
                Advance to Round 2
              </button>
            )}
            <button 
              onClick={() => window.location.href = '/leaderboard'}
              className="w-full sm:w-auto px-8 py-3 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
            >
              View Leaderboard
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-8 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
            >
              Refresh Status
            </button>
            <button 
              onClick={handleLogoutClick}
              className="w-full sm:w-auto px-8 py-3 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
            >
              Logout
            </button>
          </div>

          {/* Optional: Show time info if ended */}
          {hasEnded && round1Status?.endTime && (
            <div className="mt-10 pt-8 border-t border-white/5">
              <p className="font-ui text-xs text-white/30 uppercase tracking-wider">
                Contest ended at {new Date(round1Status.endTime).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* Logout Modal */}
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

  const bingoIndices = getBingoIndices();
  const solvedSet = new Set(progress?.solvedIndices || []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#F2F2F2]">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 sm:mb-8 border-b border-white/10 pb-4 sm:pb-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-purple-500/30 bg-purple-500/10 rounded-lg w-fit mb-1">
              <span className="w-1.5 h-1.5 bg-purple-500 animate-pulse rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
              <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-purple-300/80">
                {teamName}
              </p>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tighter uppercase mb-2 chrome-text">
              {game?.name || 'Round 1'}
            </h1>

            <div className="flex flex-wrap items-center gap-4 font-ui text-[9px] sm:text-[10px] tracking-[0.25em] sm:tracking-[0.3em] text-purple-300/40 uppercase">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 animate-pulse rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                LIVE_CONTEST
              </span>
              <span className="h-[1px] w-8 sm:w-12 bg-white/10" />
              <span>GRID: 3×3</span>
              <span className="h-[1px] w-8 sm:w-12 bg-white/10 hidden sm:block" />
              <span className="hidden sm:inline">9 PROBLEMS</span>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.location.href = '/leaderboard'}
                className="px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
              >
                Leaderboard
              </button>

              <button 
                onClick={handleLogoutClick}
                className="px-4 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
              >
                Logout
              </button>
            </div>
            
            <p className="font-ui text-[10px] sm:text-xs text-white/30 max-w-[280px] leading-relaxed uppercase tracking-wider text-left lg:text-right">
              Solve problems to mark cells. Complete rows, columns, or diagonals for bingo bonus points.
            </p>
          </div>
        </header>

        {/* Stats Dashboard */}
        <section className="flex justify-center mb-12 sm:mb-16">
          <div className="flex w-full max-w-md sm:max-w-4xl bg-[#0b0b0b] rounded-3xl border border-purple-500/20 overflow-hidden shadow-[0_10px_40px_rgba(168,85,247,0.1)]">
            {/* Timer Display */}
            {round1Status?.isActive && (
              <>
                <div className="flex-1 min-w-0 py-4 sm:py-6 flex flex-col group hover:bg-white/5 transition-all pl-6 sm:pl-10">
                  <p className="font-ui text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1 text-left">
                    Time Left
                  </p>
                  <div className="flex items-end justify-start gap-1.5">
                    <span className={`text-2xl sm:text-4xl font-sans font-black tracking-tighter tabular-nums ${
                      timeRemaining < 300000 ? 'text-red-400 animate-pulse' : 'text-white'
                    }`}>
                      {formatTimeRemaining(timeRemaining)}
                    </span>
                  </div>
                </div>
                <div className="w-px bg-white/10 my-4 sm:my-6" />
              </>
            )}

            <div className="flex-1 min-w-0 py-4 sm:py-6 flex flex-col group hover:bg-white/5 transition-all pl-6 sm:pl-10">
              <p className="font-ui text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1 text-left">
                Total Score
              </p>
              <div className="flex items-end justify-start gap-1.5">
                <span className="text-3xl sm:text-5xl font-sans font-black tracking-tighter tabular-nums text-white">
                  {progress?.currentScore || 0}
                </span>
                <span className="font-ui text-[9px] sm:text-[10px] text-white/20 mb-1 uppercase">pts</span>
              </div>
            </div>

            <div className="w-px bg-white/10 my-4 sm:my-6" />

            <div className="flex-1 min-w-0 py-4 sm:py-6 flex flex-col group hover:bg-white/5 transition-all pl-6 sm:pl-10">
              <p className="font-ui text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1 text-left">
                Solved
              </p>
              <div className="flex items-end justify-start gap-1.5">
                <span className="text-3xl sm:text-5xl font-sans font-black tracking-tighter tabular-nums text-white">
                  {progress?.solvedIndices?.length || 0}
                </span>
                <span className="font-ui text-[9px] sm:text-[10px] text-white/20 mb-1 uppercase">/ 09</span>
              </div>
            </div>

            <div className="w-px bg-white/10 my-4 sm:my-6" />

            <div className="flex-1 min-w-0 py-4 sm:py-6 flex flex-col group hover:bg-white/5 transition-all pl-6 sm:pl-10">
              <p className="font-ui text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1 text-left">
                Bingo Lines
              </p>
              <div className="flex items-end justify-start gap-1.5">
                <span className="text-3xl sm:text-5xl font-sans font-black tracking-tighter tabular-nums text-white">
                  {progress?.bingoLines?.length || 0}
                </span>
                <span className="font-ui text-[9px] sm:text-[10px] text-white/20 mb-1 uppercase">bin</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bingo Grid */}
        <div className="grid grid-cols-3 gap-0 border border-purple-500/20 mb-6 sm:mb-8 shadow-[0_0_60px_rgba(168,85,247,0.08)]">
          {game?.problems
            .sort((a: IProblem, b: IProblem) => a.gridIndex - b.gridIndex)
            .map((problem: IProblem) => (
              <div key={problem.gridIndex} className="border border-white/5">
                <GridCell
                  problem={problem}
                  isSolved={solvedSet.has(problem.gridIndex)}
                  isBingoCell={bingoIndices.has(problem.gridIndex)}
                />
              </div>
            ))}
        </div>

        {/* Sync Button and Info */}
        <div className="flex flex-col items-center gap-8 sm:gap-12">
          <SyncButton onSync={handleSync} lastSyncTime={lastSyncTime} isRoundActive={round1Status?.isActive || false} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 w-full pt-8 sm:pt-12 border-t border-white/10">
            <div className="space-y-4">
              <p className="font-ui text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">Scoring Rules</p>
              <p className="text-white/40 text-[10px] sm:text-xs leading-relaxed font-ui uppercase">
                +10 points per solved problem. +30 bonus for each bingo line (row, column, or diagonal).
              </p>
            </div>

            <div className="space-y-4 font-ui">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">Possible Lines</p>
              <ul className="text-white/40 text-[10px] space-y-2 uppercase tracking-widest">
                <li className="flex justify-between"><span>Rows</span><span className="text-white/60">[ 03 ]</span></li>
                <li className="flex justify-between"><span>Columns</span><span className="text-white/60">[ 03 ]</span></li>
                <li className="flex justify-between"><span>Diagonals</span><span className="text-white/60">[ 02 ]</span></li>
              </ul>
            </div>

            <div className="space-y-4 font-ui">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">System Status</p>
              <div className="space-y-2">
                {round1Status?.isActive ? (
                  <div className="flex items-center gap-2 text-purple-300/40 text-[10px] uppercase">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse" />
                    Contest Active
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-300/40 text-[10px] uppercase">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    Contest Ended
                  </div>
                )}
                {lastSyncTime && (
                  <p className="text-white/20 text-[10px] uppercase">
                    Last sync: {lastSyncTime.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Legend - Tightened Spacing */}
        <div className="mt-8 sm:mt-10 pt-8 border-t border-white/5">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-black/40 border border-white/10" />
              <span className="font-ui text-[10px] uppercase tracking-wider text-white/40">Unsolved</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-white border border-white" />
              <span className="font-ui text-[10px] uppercase tracking-wider text-white/40">Solved</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-white border border-white ring-2 ring-white ring-offset-2 ring-offset-black" />
              <span className="font-ui text-[10px] uppercase tracking-wider text-white/40">Bingo Cell</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Tightened Spacing */}
      <footer className="border-t border-white/5 mt-8 sm:mt-6 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-white/20">Codeforces Bingo Contest</p>
          <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-white/20">
            Round 1 — {round1Status?.isActive ? 'Active' : 'Ended'}
          </p>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
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

      {/* Access Denied Toast */}
      {showAccessDenied && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-[#0b0b0b] border border-yellow-500/30 rounded-xl px-6 py-4 shadow-[0_10px_40px_rgba(234,179,8,0.2)] flex items-center gap-3">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <p className="font-ui text-sm text-yellow-300 uppercase tracking-wider">
              You are not qualified for Round 2
            </p>
          </div>
        </div>
      )}

      <CodeforcesDialog
        isOpen={open}
        onClose={() => {}}
        onSubmit={handleCodeforcesSubmit}
      />
    </div>
  );
}