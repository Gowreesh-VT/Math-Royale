'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CodeforcesDialog from '@/components/CodeforcesHandle';
import { secureFetch } from '@/lib/csrf';

export default function Round2LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState('Round has not started yet. Please wait for organizers.');
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/login');
      return;
    }

    if (!session.user.hasRound2Access) {
      setMessage('You have not qualified for Round 2.');
      return;
    }

    if (session.user.setCodeforcesHandle) {
      setOpen(true);
    }

  }, [session, status, router]);

  const fetchActiveMatch = async () => {
    try {
      setChecking(true);

      const res = await fetch('/api/Round-2/active-match');
      const data = await res.json();

      if (data.matchId && data.status === 'active') {
        router.push(`/round2/match/${data.matchId}`);
      } else if (data.matchId && data.status === 'waiting') {
        setMessage('Round has not started yet. Click check once organizers start it.');
      } else if (data.message === 'not_qualified') {
        setMessage('You have not qualified for Round 2.');
      } else if (data.message === 'no_match') {
        setMessage('Round has not started yet. No match is assigned at this moment.');
      } else if (data.message === 'completed') {
        setMessage('Your latest Round 2 match has completed.');
      } else {
        setMessage('Unable to find your match. Please contact organizers.');
      }
    } catch {
      setMessage('Error loading match. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleCodeforcesSubmit = async (handle: string) => {
    const res = await secureFetch('/api/team/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeforcesHandle: handle }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to update handle');
    }

    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center gap-2 px-4 py-2 border border-purple-500/30 bg-purple-500/10 rounded-lg">
          <span className="w-2 h-2 bg-purple-500 animate-pulse rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
          <span className="text-purple-300 text-xs uppercase tracking-widest font-ui">
            Round 2
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-sans font-black tracking-tighter uppercase chrome-text">
          Tug of War
        </h1>

        <div className="flex flex-col items-center gap-3">
          <p className="text-white/60 font-ui text-xs uppercase tracking-widest">
            {message}
          </p>
          <button
            onClick={fetchActiveMatch}
            disabled={checking || !session?.user?.hasRound2Access}
            className="px-6 py-3 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 disabled:opacity-60 disabled:cursor-not-allowed text-purple-300 font-ui text-[10px] uppercase tracking-widest transition-all rounded-lg"
          >
            {checking ? 'Checking...' : 'Check Round Status'}
          </button>
        </div>
      </div>

      <CodeforcesDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={handleCodeforcesSubmit}
      />
    </div>
  );
}
