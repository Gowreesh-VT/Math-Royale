'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import { secureFetch } from '@/lib/csrf';

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
  teams: Array<{ id: string; name: string; handle: string | null }>;
  handles: string[];
}

interface PowerUpState {
  key: string;
  title: string;
  available: boolean;
  solved: boolean;
  swapCompleted?: boolean;
  attemptCount: number;
  totalDelta: number;
  fullMarks: number;
  effectLabel: 'ADD_POINTS' | 'DOUBLE_OR_HALF' | 'SWAP_QUESTIONS';
  question: {
    contestId: string;
    problemIndex: string;
    name: string;
    url: string;
  };
  attempts: Array<{
    submissionId: number;
    verdict: string;
    pointsDelta: number;
    timestamp: string;
  }>;
}

interface MatchResponse {
  success: boolean;
  match: {
    roundNumber: number;
    roundName: string;
    status: 'active' | 'completed';
    timeRemaining: number;
    winningSide: 'A' | 'B' | null;
    sideA: SideData;
    sideB: SideData;
    powerUp: PowerUpState | null;
  };
}

export default function Round2MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPowerUpIntro, setShowPowerUpIntro] = useState(false);
  const [showPowerUpOverlay, setShowPowerUpOverlay] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [data, setData] = useState<MatchResponse | null>(null);
  const [mySide, setMySide] = useState<'A' | 'B'>('A');
  const [timeRemaining, setTimeRemaining] = useState<number>(1800);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerQuestion, setSelectedPlayerQuestion] = useState<number | null>(null);

  const teamId = session?.user?.teamId || '';

  const handleConfirmLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const fetchMatch = useCallback(async () => {
    const res = await fetch(`/api/Round-2/match/${matchId}`);
    const json: MatchResponse = await res.json();

    if (!json.success) {
      router.push('/round2');
      return;
    }

    setData(json);

    if (json.match.timeRemaining !== undefined) {
      setTimeRemaining(json.match.timeRemaining);
    }

    if (teamId) {
      const isInSideA = json.match.sideA.teams.some((team) => team.id === teamId);
      const isInSideB = json.match.sideB.teams.some((team) => team.id === teamId);

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
  }, [matchId, router, session?.user?.codeforcesHandle, teamId]);

  useEffect(() => {
    fetchMatch();
    const poll = setInterval(fetchMatch, 7000);
    return () => clearInterval(poll);
  }, [fetchMatch]);

  useEffect(() => {
    if (!data || data.match.status !== 'active') {
      return;
    }

    const countdown = setInterval(() => {
      setTimeRemaining((prev) => {
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
  }, [data?.match?.status, fetchMatch, matchId]);

  useEffect(() => {
    if (!data || data.match.status !== 'active') {
      return;
    }

    const sync = async () => {
      try {
        const res = await secureFetch('/api/Round-2/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId }),
        });
        const result = await res.json();

        if (result.success) {
          fetchMatch();
        }
      } catch (error) {
        console.error('[Sync] Failed:', error);
      }
    };

    sync();

    const interval = setInterval(sync, 30000);
    return () => clearInterval(interval);
  }, [data?.match?.status, fetchMatch, matchId]);

  const handleExecuteSwap = async () => {
    if (selectedPlayerQuestion === null) {
      return;
    }

    try {
      const res = await secureFetch('/api/Round-2/steal-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          playerUnansweredIndex: selectedPlayerQuestion,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setShowSwapModal(false);
        setSelectedPlayerQuestion(null);
        fetchMatch();
      }
    } catch (error) {
      console.error('[Swap] Failed:', error);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/40 uppercase tracking-widest text-xs">
        Loading Match...
      </div>
    );
  }

  const my = mySide === 'A' ? data.match.sideA : data.match.sideB;
  const opp = mySide === 'A' ? data.match.sideB : data.match.sideA;
  const powerUp = data.match.powerUp;
  const hasRoundPowerUp = (data.match.roundNumber === 2 || data.match.roundNumber === 3) && !!powerUp?.available;
  const isSemifinalSwapLockActive = Boolean(
    data.match.roundNumber === 2 &&
    powerUp?.effectLabel === 'SWAP_QUESTIONS' &&
    !powerUp?.swapCompleted
  );
  const powerUpLabel = data.match.roundNumber === 3 ? 'Finals Power-Up' : 'Semifinals Power-Up';
  const powerUpSummary = data.match.roundNumber === 3
    ? 'Double your points earned above 50 on one special problem. Clear it fully to double, else they are halved.'
    : 'Replace one of your unanswered match questions with the Steal question after solving it.';
  const introTitle = data.match.roundNumber === 3 ? 'Double or Half' : 'Steal & Swap';
  const introBody = data.match.roundNumber === 3
    ? [
        'In Finals, your team can gamble your success by attempting one special "Double or Half" problem.',
        'If you solve it completely, your points earned above the base score (50) will be doubled.',
        'If even one test case fails, your points earned above 50 will be halved (rounded down).',
      ]
    : [
        'In Semifinals, your team can attempt a special Steal problem that is easier and adds points directly to your score.',
        'If you solve the Steal problem, you unlock the ability to replace one of your unanswered match questions with the Steal question.',
        'All scoring still happens through Codeforces submissions on your saved handle.',
      ];
  const rewardText = powerUp?.effectLabel === 'DOUBLE_OR_HALF' ? 'Double Points' : powerUp?.effectLabel === 'SWAP_QUESTIONS' ? 'Swap Questions' : `+${powerUp?.fullMarks ?? 0}`;
  const failedText = powerUp?.effectLabel === 'DOUBLE_OR_HALF'
    ? 'Half Points'
    : 'Penalty';
  const failedDescription = powerUp?.effectLabel === 'DOUBLE_OR_HALF'
    ? 'Any non-accepted verdict will halve your points above 50.'
    : 'A fixed penalty of -10 points is applied for failed attempts.';

  const BASE_SCORE = 50;
  const MAX_SCORE = 2147483647;
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

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6 py-8">
      <main className="max-w-5xl mx-auto space-y-12">
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
              <div
                className={`px-5 py-2 rounded-lg border ${
                  timeRemaining <= 300
                    ? 'border-red-500/50 bg-red-500/10'
                    : timeRemaining <= 600
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-white/20 bg-white/5'
                }`}
              >
                <div className="flex flex-col items-center">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">Time Remaining</p>
                  <p
                    className={`text-3xl font-mono font-bold ${
                      timeRemaining <= 300
                        ? 'text-red-400'
                        : timeRemaining <= 600
                          ? 'text-yellow-400'
                          : 'text-white'
                    }`}
                  >
                    {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:
                    {(timeRemaining % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="px-4 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex justify-between text-sm uppercase tracking-widest text-white/60">
            <span>Your Side</span>
            <span>Opponent</span>
          </div>

          <div className="flex justify-between text-4xl font-black">
            <span className={my.score >= MAX_SCORE ? 'text-green-400' : ''}>{my.score}</span>
            <span className={opp.score >= MAX_SCORE ? 'text-purple-400/80' : ''}>{opp.score}</span>
          </div>

          <div className="relative h-6 rounded-full overflow-hidden bg-white/5 border border-white/10">
            <div className="absolute inset-0 flex">
              <div className="w-1/4 bg-white/5" />
              <div className="w-1/2 bg-white/10" />
              <div className="w-1/4 bg-white/5" />
            </div>

            <div className="absolute left-1/2 top-0 h-full w-[2px] bg-white/30" />

            <motion.div
              animate={{ left: `${pullPercentage}%` }}
              transition={{
                type: 'spring',
                stiffness: my.score >= MAX_SCORE || opp.score >= MAX_SCORE ? 80 : 140,
                damping: my.score >= MAX_SCORE || opp.score >= MAX_SCORE ? 12 : 18,
              }}
              className={`absolute top-0 -translate-x-1/2 w-36 h-full bg-white ring-1 ring-white/40 z-10 ${
                my.score >= MAX_SCORE || opp.score >= MAX_SCORE
                  ? 'shadow-[0_0_40px_rgba(34,197,94,0.9)]'
                  : 'shadow-[0_0_30px_rgba(255,255,255,0.8)]'
              }`}
            />

            <div className="absolute left-2 top-0 h-full w-[2px] bg-white/40" />
            <div className="absolute right-2 top-0 h-full w-[2px] bg-white/40" />
          </div>

          <div className="flex justify-center gap-6 text-[10px] uppercase tracking-widest text-white/40">
            <span>✔ Accepted: +10</span>
            <span>✖ Wrong: 0</span>
            <span></span>
          </div>

          <div className="mt-3 text-center">
            <span className="inline-block px-4 py-1 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-widest text-white/70">
              You are playing as <span className="font-bold text-white">Side {mySide}</span>
            </span>
          </div>

          {data.match.status === 'completed' && (
            <motion.p
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-center text-purple-300/80 uppercase tracking-widest text-sm font-bold"
            >
              Match Completed — Winner: Side {data.match.winningSide}
            </motion.p>
          )}
        </section>

        {hasRoundPowerUp && powerUp && (
          <section className="border border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(8,8,8,0.96))] p-6 space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300/80">
                  {powerUpLabel}
                </p>
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                  {powerUp.title}
                </h2>
                <p className="max-w-2xl text-sm uppercase tracking-wider text-white/60">
                  {powerUpSummary}
                </p>
              </div>

              <button
                onClick={() => setShowPowerUpIntro(true)}
                className="px-5 py-3 border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-200 font-ui text-[10px] uppercase tracking-[0.3em] transition-all rounded-lg"
              >
                {powerUp.swapCompleted ? 'Swap Completed' : powerUp.solved ? 'Proceed to Swap' : 'Activate Power-Up'}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-white/10 bg-black/20 p-4 rounded-lg">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Reward</p>
                <p className="mt-2 text-2xl font-black text-emerald-300">{rewardText}</p>
              </div>
              <div className="border border-white/10 bg-black/20 p-4 rounded-lg">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Attempts Logged</p>
                <p className="mt-2 text-2xl font-black text-white">{powerUp.attemptCount}</p>
              </div>
              <div className="border border-white/10 bg-black/20 p-4 rounded-lg">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Score Delta</p>
                <p className={`mt-2 text-2xl font-black ${powerUp.totalDelta >= 0 ? 'text-amber-200' : 'text-red-300'}`}>
                  {powerUp.totalDelta > 0 ? `+${powerUp.totalDelta}` : powerUp.totalDelta}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase tracking-widest">
            Your Questions
          </h2>

          {isSemifinalSwapLockActive && (
            <div className="border border-amber-400/30 bg-amber-400/10 p-4 rounded-lg">
              <p className="text-xs uppercase tracking-widest text-amber-200">
                Submissions are locked until you complete Steal swap. Open Power-Up, solve Steal, then replace one unanswered question.
              </p>
            </div>
          )}

          <div className="divide-y divide-white/10 border border-white/10 bg-[#0b0b0b]">
            {my.questions.map((question, index) => (
              <div
                key={question.id}
                onClick={() => {
                  if (isSemifinalSwapLockActive) {
                    return;
                  }
                  window.open(`https://codeforces.com/contest/${question.contestId}/problem/${question.problemIndex}`, '_blank');
                }}
                className={`p-4 flex justify-between items-center ${isSemifinalSwapLockActive ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-white/5'}`}
              >
                <div>
                  <p className="font-bold">
                    {question.problemIndex}. {question.name}
                  </p>
                  <p className="text-xs text-white/40">
                    Contest {question.contestId}
                  </p>
                </div>

                <span className={`text-xs uppercase tracking-widest ${question.solved ? 'text-green-400' : 'text-white/30'}`}>
                  {question.solved ? 'Solved' : 'Unsolved'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 pt-8 text-xs uppercase tracking-widest text-white/50 space-y-2">
          <p>Scoring System</p>
          <ul className="space-y-1">
            <li>✔ Correct submission: +10 points</li>
            <li>✖ Wrong answer: 0 points</li>
            <li>🏁 Timeout concludes the match</li>
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

      {showPowerUpIntro && powerUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl border border-amber-400/30 bg-[#090909] p-8 shadow-[0_24px_80px_rgba(245,158,11,0.15)]">
            <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300/80">Power-Up Briefing</p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-widest text-white">
              {introTitle}
            </h2>
            <div className="mt-6 space-y-4 text-sm uppercase tracking-wider text-white/70">
              {introBody.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => window.open(powerUp.question.url, '_blank')}
                className="border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Target Problem</p>
                <p className="mt-2 text-lg font-bold text-white">
                  {powerUp.question.problemIndex}. {powerUp.question.name}
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  Contest {powerUp.question.contestId} • Click to open on Codeforces
                </p>
              </button>
              <div className="border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Detection</p>
                <p className="mt-2 text-sm uppercase tracking-wider text-white/70">
                  The overlay does not submit code itself. Open the problem, submit on Codeforces, and this match screen will sync the result.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowPowerUpIntro(false)}
                className="px-5 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-ui text-[10px] uppercase tracking-[0.3em] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPowerUpIntro(false);
                  setShowPowerUpOverlay(true);
                }}
                className="px-5 py-3 border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 font-ui text-[10px] uppercase tracking-[0.3em] rounded-lg"
              >
                I Agree, Open Power-Up
              </button>
            </div>
          </div>
        </div>
      )}

      {showPowerUpOverlay && powerUp && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="mx-auto max-w-5xl border border-amber-400/30 bg-[#050505]">
              <div className="flex flex-col gap-4 border-b border-white/10 p-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300/80">Steal & Swap Overlay</p>
                  <h2 className="text-3xl font-black uppercase tracking-widest text-white">
                    {powerUp.question.problemIndex}. {powerUp.question.name}
                  </h2>
                  <p className="text-sm uppercase tracking-wider text-white/60">
                    Contest {powerUp.question.contestId} • {data.match.roundName} power-up
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPowerUpOverlay(false)}
                    className="px-5 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-ui text-[10px] uppercase tracking-[0.3em] rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <div className="border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">How to Use It</p>
                    <div className="mt-4 space-y-3 text-sm uppercase tracking-wider text-white/70">
                      <p>Solve the Steal problem first. You can click the target problem card in the briefing to open Codeforces.</p>
                      <p>Come back to this match screen after submitting. The live sync runs automatically every 30 seconds, so your score update will be reflected here.</p>
                      <p>Once Steal is solved, choose one of your unanswered match questions to replace with the Steal question, then continue solving from Codeforces.</p>
                    </div>
                  </div>

                  <div className="border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Scoring Rules</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="border border-emerald-400/20 bg-emerald-400/10 p-4 rounded-lg">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-200/70">Solved</p>
                        <p className="mt-2 text-3xl font-black text-emerald-300">{rewardText}</p>
                        <p className={`mt-2 text-xs uppercase tracking-widest ${powerUp.effectLabel === 'DOUBLE_OR_HALF' ? 'text-emerald-100/60' : 'text-emerald-100/60'}`}>
                          {powerUp.effectLabel === 'DOUBLE_OR_HALF' ? 'Your points above 50 are doubled' : powerUp.effectLabel === 'SWAP_QUESTIONS' ? 'Unlock question swap ability' : 'Full marks granted instantly'}
                        </p>
                      </div>
                      <div className="border border-red-400/20 bg-red-400/10 p-4 rounded-lg">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-red-200/70">Failed</p>
                        <p className="mt-2 text-3xl font-black text-red-300">{failedText}</p>
                        <p className="mt-2 text-xs uppercase tracking-widest text-red-100/60">
                          {failedDescription}
                        </p>
                      </div>
                    </div>
                  </div>

                  {powerUp.solved && powerUp.effectLabel === 'SWAP_QUESTIONS' && (
                    <button
                      onClick={() => {
                        setShowPowerUpOverlay(false);
                        setShowSwapModal(true);
                      }}
                      className="w-full px-6 py-4 border border-cyan-400/40 bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-200 font-ui text-[10px] uppercase tracking-[0.3em] rounded-lg"
                    >
                      Proceed to Question Swap
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Current State</p>
                    <div className="mt-4 space-y-3 text-sm uppercase tracking-wider text-white/70">
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <span className={powerUp.solved ? 'text-emerald-300' : 'text-amber-200'}>
                          {powerUp.solved ? 'Solved' : 'Available'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Attempts</span>
                        <span>{powerUp.attemptCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total Delta</span>
                        <span className={powerUp.totalDelta >= 0 ? 'text-amber-200' : 'text-red-300'}>
                          {powerUp.totalDelta > 0 ? `+${powerUp.totalDelta}` : powerUp.totalDelta}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Attempt Log</p>
                    <div className="mt-4 space-y-3">
                      {powerUp.attempts.length === 0 && (
                        <p className="text-xs uppercase tracking-widest text-white/35">
                          No steal submissions detected yet.
                        </p>
                      )}
                      {powerUp.attempts.map((attempt) => (
                        <div
                          key={attempt.submissionId}
                          className="border border-white/10 bg-black/20 p-3 rounded-lg"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-xs uppercase tracking-widest text-white/70">
                              {attempt.verdict}
                            </p>
                            <p className={`text-xs font-bold uppercase tracking-widest ${attempt.pointsDelta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                              {attempt.pointsDelta > 0 ? `+${attempt.pointsDelta}` : attempt.pointsDelta}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSwapModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="mx-auto max-w-5xl border border-cyan-400/30 bg-[#050505] p-6">
              <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-6">
                Swap Questions
              </h2>
              <p className="text-sm uppercase tracking-wider text-white/60 mb-8">
                Select one of your unanswered questions to replace with the Steal question
              </p>

              <div className="grid gap-8 lg:grid-cols-2 mb-8">
                {/* Player Questions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold uppercase tracking-widest text-cyan-200">
                    Your Unanswered Questions
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {my.questions
                      .map((q, idx) => ({ question: q, index: idx }))
                      .filter(({ question }) => !question.solved)
                      .map(({ question, index }) => (
                        <button
                          key={question.id}
                          onClick={() => setSelectedPlayerQuestion(index)}
                          className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                            selectedPlayerQuestion === index
                              ? 'border-cyan-400 bg-cyan-400/20'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <p className="font-bold">
                            {question.problemIndex}. {question.name}
                          </p>
                          <p className="text-xs text-white/40">
                            Contest {question.contestId}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Steal Question */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold uppercase tracking-widest text-amber-200">
                    Steal Question (Hardcoded)
                  </h3>
                  <button
                    type="button"
                    onClick={() => powerUp && window.open(powerUp.question.url, '_blank')}
                    className="w-full p-4 border-2 border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 rounded-lg text-left transition-all"
                  >
                    <p className="font-bold text-amber-100">
                      {powerUp?.question.problemIndex}. {powerUp?.question.name}
                    </p>
                    <p className="text-xs text-amber-200/70 mt-1">
                      Contest {powerUp?.question.contestId} • Click to open on Codeforces
                    </p>
                    <p className="text-xs uppercase tracking-widest text-amber-200/60 mt-3">
                      This problem will replace your selected unanswered question.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end border-t border-white/10 pt-6">
                <button
                  onClick={() => {
                    setShowSwapModal(false);
                    setSelectedPlayerQuestion(null);
                  }}
                  className="px-6 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-ui text-[10px] uppercase tracking-[0.3em] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteSwap}
                  disabled={selectedPlayerQuestion === null}
                  className="px-6 py-3 border border-cyan-400/40 bg-cyan-400/15 hover:bg-cyan-400/25 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-200 font-ui text-[10px] uppercase tracking-[0.3em] rounded-lg"
                >
                  Replace With Steal Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}