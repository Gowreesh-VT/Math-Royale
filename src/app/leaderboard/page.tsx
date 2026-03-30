'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { LEADERBOARD_REFRESH_MS } from '@/lib/constants';
import type { LeaderboardEntry } from '@/types';

export default function LeaderboardPage() {
    const { data: session, status } = useSession();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [mounted, setMounted] = useState(false);

    const userTeamName = session?.user?.teamName || '';

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/api/leaderboard');
            const data = await res.json();

            if (!data.success) {
                setError(data.error || 'Failed to load leaderboard');
                return;
            }

            setLeaderboard(data.leaderboard);
            setLastUpdate(new Date());
            setError('');
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

   useEffect(() => {
  if (!session) return;

  setMounted(true);
  fetchLeaderboard();
  const interval = setInterval(fetchLeaderboard, LEADERBOARD_REFRESH_MS);

  return () => clearInterval(interval);
}, [session]);

if (status === "loading") {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <p className="text-white/50 font-ui tracking-widest text-xs">
        Checking authentication...
      </p>
    </div>
  );
}

if (status === "unauthenticated") {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <p className="text-white/50 font-ui tracking-widest text-xs">
        Redirecting to login...
      </p>
    </div>
  );
}

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 border-2 border-white/20 animate-spin" style={{ animationDuration: '3s' }} />
                        <div className="absolute inset-2 border-2 border-white/40 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                        <div className="absolute inset-4 border-2 border-white/60 animate-spin" style={{ animationDuration: '1s' }} />
                    </div>
                    <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-white/40">
                        Loading Rankings...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#F2F2F2]">
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
                <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 sm:mb-16 border-b border-white/10 pb-6 sm:pb-12">
                    <div>
                        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-sans font-black tracking-tighter uppercase mb-4 chrome-text">
                            Rankings
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-ui text-[9px] sm:text-[10px] tracking-[0.25em] sm:tracking-[0.3em] text-purple-300/40 uppercase">
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-500 animate-pulse rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                                LIVE_TELEMETRY
                            </span>
                            {mounted && lastUpdate && (
                                <>
                                    <span className="h-[1px] w-8 sm:w-12 bg-white/10" />
                                    <span className="text-white/20">
                                        {lastUpdate.toLocaleTimeString()}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4">
                        <div className="font-ui text-[9px] sm:text-[10px] text-white/30 uppercase tracking-[0.2em] border border-white/10 px-3 sm:px-4 py-2 rounded-lg">
                            AUTO_REFRESH: {(LEADERBOARD_REFRESH_MS / 1000)}s
                        </div>
                        {session?.user?.hasRound2Access && (
                            <button 
                                onClick={() => window.location.href = '/round2'}
                                className="px-3 sm:px-4 py-2 border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-300 font-ui text-[9px] sm:text-[10px] uppercase tracking-widest transition-all rounded-lg"
                            >
                                🏆 Round 2
                            </button>
                        )}
                        <button 
                            onClick={() => window.location.href = '/round1'}
                            className="px-3 sm:px-4 py-2 border border-border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-ui text-[9px] sm:text-[10px] uppercase tracking-widest transition-all rounded-lg"
                        >
                            ← Back to Round 1
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="font-ui text-[10px] text-red-400 uppercase tracking-tighter border border-red-500/20 p-4 bg-red-500/5 mb-8 sm:mb-12 rounded-lg">
                        [ ERROR: {error} ]
                    </div>
                )}

                <div className="border border-purple-500/20 bg-[#0b0b0b] shadow-[0_0_50px_rgba(168,85,247,0.08)] rounded-2xl overflow-hidden">
                    {leaderboard.length === 0 ? (
                        <div className="text-center py-16 sm:py-20 font-ui">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/20">NO_RANKING_DATA_AVAILABLE</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-left font-ui text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/40">
                                        <th className="px-4 sm:px-8 py-4 sm:py-6 font-medium">RANK</th>
                                        <th className="px-4 sm:px-8 py-4 sm:py-6 font-medium">TEAM</th>
                                        <th className="px-4 sm:px-8 py-4 sm:py-6 font-medium text-right">SCORE</th>
                                    </tr>
                                </thead>
                                <tbody className="font-ui text-xs sm:text-sm">
                                    {leaderboard.map((entry, index) => {
                                        const isOwnTeam = userTeamName && entry.teamName === userTeamName;
                                        
                                        return (
                                            <tr
                                                key={`${entry.teamName}-${index}`}
                                                className={`border-b border-white/5 transition-all duration-300 ${
                                                    isOwnTeam 
                                                        ? 'bg-white text-black' 
                                                        : 'hover:bg-white/5'
                                                }`}
                                            >
                                                <td className="px-4 sm:px-8 py-6 sm:py-8">
                                                    <span className={`text-xl sm:text-2xl font-sans font-black tracking-tight ${
                                                        isOwnTeam ? 'text-black' : 'text-white'
                                                    }`}>
                                                        {entry.rank.toString().padStart(2, '0')}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-8 py-6 sm:py-8">
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold uppercase tracking-wider ${
                                                            isOwnTeam ? 'text-black' : 'text-white'
                                                        }`}>
                                                            {entry.teamName}
                                                        </span>
                                                        {isOwnTeam && (
                                                            <span className="text-[8px] uppercase tracking-[0.2em] opacity-40 mt-1">YOUR TEAM</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-8 py-6 sm:py-8 text-right">
                                                    <span className={`text-xl sm:text-2xl font-sans font-black tracking-tight ${
                                                        isOwnTeam ? 'text-black' : 'chrome-text'
                                                    }`}>
                                                        {entry.score}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Scoring Info */}
                <aside className="mt-12 sm:mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 pt-8 sm:pt-12 border-t border-white/10">
                    <div className="space-y-4">
                        <p className="font-ui text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">Scoring Rules</p>
                        <div className="space-y-3">
                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                <span className="font-ui text-[10px] sm:text-xs text-white/40 uppercase">Problem Solved</span>
                                <span className="font-sans text-xl sm:text-2xl font-black text-white">+10</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                <span className="font-ui text-[10px] sm:text-xs text-white/40 uppercase">Bingo Line Complete</span>
                                <span className="font-sans text-xl sm:text-2xl font-black text-white">+30</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="font-ui text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">System Info</p>
                        <p className="font-ui text-[9px] sm:text-[10px] text-white/30 uppercase leading-relaxed tracking-widest">
                            Maximum achievable score: 330 points (9 problems × 10 pts + 8 bingo lines × 30 pts). 
                            Rankings update automatically from Codeforces submissions.
                        </p>
                    </div>
                </aside>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 mt-8 sm:mt-12 py-6 sm:py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                    <p className="font-ui text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/20">Codeforces Bingo Contest</p>
                    <p className="font-ui text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/20">Live Rankings</p>
                </div>
            </footer>
        </div>
    );
}
