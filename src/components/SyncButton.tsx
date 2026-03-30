'use client';

import { useState, useEffect, useCallback } from 'react';
import { SYNC_COOLDOWN_MS } from '@/lib/constants';

interface SyncButtonProps {
    onSync: () => Promise<void>;
    lastSyncTime?: Date | null;
    isRoundActive?: boolean;
}

// refresh button with a cooldown timer
export function SyncButton({ onSync, lastSyncTime, isRoundActive = true }: SyncButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [error, setError] = useState('');

    // countdown for the cooldown
    useEffect(() => {
        if (!lastSyncTime) return;

        const updateCooldown = () => {
            const timeSinceSync = Date.now() - new Date(lastSyncTime).getTime();
            const remaining = Math.ceil((SYNC_COOLDOWN_MS - timeSinceSync) / 1000);
            setCooldown(remaining > 0 ? remaining : 0);
        };

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        return () => clearInterval(interval);
    }, [lastSyncTime]);

    const handleClick = useCallback(async () => {
        if (isLoading || cooldown > 0) return;

        setIsLoading(true);
        setError('');

        try {
            await onSync();
            setCooldown(Math.ceil(SYNC_COOLDOWN_MS / 1000));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setIsLoading(false);
        }
    }, [onSync, isLoading, cooldown]);

    const isDisabled = isLoading || cooldown > 0 || !isRoundActive;

    return (
        <div className="flex flex-col items-center gap-3">
            <button
                onClick={handleClick}
                disabled={isDisabled}
                className={`
                    relative px-8 sm:px-10 py-4 sm:py-5 transition-all duration-300 font-ui text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] border-2
                    ${isDisabled
                        ? 'border-white/10 text-white/20 cursor-not-allowed bg-transparent'
                        : 'border-white bg-white text-black hover:bg-black hover:text-white group active:scale-95'
                    }
                `}
            >
                {isLoading ? (
                    <span className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-current animate-ping" />
                        SYNCING
                    </span>
                ) : !isRoundActive ? (
                    <span className="flex items-center gap-3 italic">
                        ROUND ENDED
                    </span>
                ) : cooldown > 0 ? (
                    <span className="flex items-center gap-3 italic">
                        LOCKED [{cooldown}S]
                    </span>
                ) : (
                    <span className="flex items-center gap-3 font-bold">
                        <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        SYNC PROGRESS
                    </span>
                )}

                {!isDisabled && (
                    <>
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-white" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-white" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white" />
                    </>
                )}
            </button>

            {error && (
                <p className="font-ui text-red-500 text-[10px] uppercase tracking-tighter">[ ERROR: {error} ]</p>
            )}

            {cooldown > 0 && (
                <div className="flex items-center gap-2">
                    <div className="h-[1px] w-8 bg-white/10" />
                    <p className="font-ui text-white/30 text-[9px] uppercase tracking-widest">
                        Cooldown Active
                    </p>
                    <div className="h-[1px] w-8 bg-white/10" />
                </div>
            )}
        </div>
    );
}