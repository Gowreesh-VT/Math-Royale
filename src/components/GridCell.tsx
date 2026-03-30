'use client';

import type { IProblem } from '@/types';

interface GridCellProps {
    problem: IProblem;
    isSolved: boolean;
    isBingoCell?: boolean;
}

// singular cell in the bingo grid
export function GridCell({ problem, isSolved, isBingoCell = false }: GridCellProps) {
    const cfUrl = problem.url || `https://codeforces.com/contest/${problem.contestId}/problem/${problem.problemIndex}`;

    return (
        <a
            href={cfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
                relative flex flex-col items-center justify-center p-3 sm:p-4 border transition-all duration-500 group overflow-hidden
                min-h-[100px] sm:min-h-[120px] cursor-pointer
                ${isSolved
                    ? 'bg-white border-white'
                    : 'bg-black/40 border-white/10 hover:border-white/40 hover:bg-black/60'
                }
                ${isBingoCell && isSolved ? 'ring-offset-2 ring-offset-black ring-2 ring-white' : ''}
            `}
        >
            {/* hidden X/O behind text */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                {isSolved ? (
                    // big X
                    <svg viewBox="0 0 100 100" className={`w-full h-full p-4 ${isSolved ? 'text-black' : 'text-white'}`}>
                        <line x1="10" y1="10" x2="90" y2="90" stroke="currentColor" strokeWidth="2" />
                        <line x1="90" y1="10" x2="10" y2="90" stroke="currentColor" strokeWidth="2" />
                    </svg>
                ) : (
                    // dotted O
                    <svg viewBox="0 0 100 100" className="w-full h-full p-8 text-white">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                    </svg>
                )}
            </div>

            {/* problem ID badge */}
            <div
                className={`
                    absolute top-0 left-0 px-2 sm:px-3 py-1 font-ui text-[9px] sm:text-[10px] uppercase tracking-widest z-20
                    ${isSolved ? 'bg-black text-white' : 'bg-white/10 text-gray-400 group-hover:text-white group-hover:bg-white/20'}
                `}
            >
                {problem.contestId}-{problem.problemIndex}
            </div>

            {/* shows points */}
            <div
                className={`
                    absolute top-2 right-2 font-ui text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 border z-20
                    ${isSolved ? 'border-black/20 text-black' : 'border-white/10 text-white/40 group-hover:border-white/30 group-hover:text-white/60'}
                `}
            >
                +{problem.points} PT
            </div>

            {/* problem title - clickable */}
            <div className="z-10 text-center relative px-2">
                <p className={`
                    text-xs-plus sm:text-base-plus font-display font-semibold tracking-tight mb-1 line-clamp-2
                    ${isSolved ? 'text-black' : 'text-white'}
                `}>
                    {problem.name || `Problem ${problem.problemIndex}`}
                </p>
                <div className={`
                    h-[2px] w-0 group-hover:w-full transition-all duration-700 mx-auto
                    ${isSolved ? 'bg-black' : 'bg-white'}
                `} />
            </div>

            {/* Click to solve hint */}
            <div className="absolute bottom-2 sm:bottom-3 left-0 right-0 flex justify-center z-20">
                {isSolved ? (
                    <span className="font-ui text-[8px] sm:text-[9px] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-black font-bold">
                        [ SOLVED ]
                    </span>
                ) : (
                    <span className="font-ui text-[8px] sm:text-[9px] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white/20 group-hover:text-white/40">
                        [ CLICK TO SOLVE ]
                    </span>
                )}
            </div>

            {/* shininess when solved */}
            {isSolved && (
                <div className="absolute inset-0 pointer-events-none opacity-30">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-black/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
            )}
        </a>
    );
}