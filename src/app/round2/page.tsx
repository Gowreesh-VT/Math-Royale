'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Round2LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState('Checking your Round 2 status...');

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/login');
      return;
    }

    // Check if user has Round 2 access
    if (!session.user.hasRound2Access) {
      setMessage('You have not qualified for Round 2. Keep competing in Round 1!');
      setTimeout(() => router.push('/round1'), 3000);
      return;
    }

    fetchActiveMatch();
  }, [session, status, router]);

  const fetchActiveMatch = async () => {
    try {
      const res = await fetch('/api/Round-2/active-match');
      const data = await res.json();

      if (data.matchId) {

        router.push(`/round2/match/${data.matchId}`);
      } else if (data.message === 'not_qualified') {
        setMessage('You have not qualified for Round 2.');
        setTimeout(() => router.push('/round1'), 3000);
      } else if (data.message === 'no_match') {
        setMessage('No match found. Tournament may not have started yet.');
      } else {
        setMessage(`Unable to find your match. Please contact organizers.`);
      }
    } catch {
      setMessage('Error loading match. Please try again.');
    }
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
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 font-ui text-xs uppercase tracking-widest">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
