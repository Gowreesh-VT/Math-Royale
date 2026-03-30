// ===========================================
// BINGO SCORE CALCULATOR
// ===========================================

import { BINGO_LINES, POINTS_PER_PROBLEM, BINGO_BONUS_POINTS } from '@/lib/constants';
import type { IProblem, CFSubmission } from '@/types';

interface ScoreResult {
    solvedIndices: number[];
    currentScore: number;
    bingoLines: number[][];
}

/**
 * Matches team submissions against the grid problems
 * @param submissions - Combined accepted submissions from all team members
 * @param problems - The 9 problems in the grid
 * @returns Array of solved grid indices (0-8)
 */
export function matchSolvedProblems(
    submissions: CFSubmission[],
    problems: IProblem[]
): number[] {
    const solvedIndices: number[] = [];

    for (const problem of problems) {
        const isSolved = submissions.some(
            (sub) =>
                String(sub.problem.contestId) === String(problem.contestId) &&
                sub.problem.index.toUpperCase() === problem.problemIndex.toUpperCase()
        );

        if (isSolved) {
            solvedIndices.push(problem.gridIndex);
        }
    }

    return solvedIndices.sort((a, b) => a - b);
}

/**
 * Finds all completed Bingo lines
 * @param solvedIndices - Array of solved grid indices
 * @returns Array of winning lines (each line is an array of 3 indices)
 */
export function findCompletedBingoLines(solvedIndices: number[]): number[][] {
    const solvedSet = new Set(solvedIndices);
    const completedLines: number[][] = [];

    for (const line of BINGO_LINES) {
        const isComplete = line.every((index) => solvedSet.has(index));
        if (isComplete) {
            completedLines.push(line);
        }
    }

    return completedLines;
}

/**
 * Calculates total score including problem points and bingo bonuses
 * @param solvedIndices - Array of solved grid indices
 * @param problems - The 9 problems in the grid (for custom point values)
 * @returns Total score
 */
export function calculateScore(
    solvedIndices: number[],
    problems: IProblem[]
): number {
    const completedLines = findCompletedBingoLines(solvedIndices);
    
    // Track all boxes included in completed bingo lines
    const boxesInBingo = new Set<number>();
    for (const line of completedLines) {
        for (const index of line) {
            boxesInBingo.add(index);
        }
    }
    
    // Score from completed bingo lines (60 points per line)
    let score = completedLines.length * 60;
    
    // Add points for solved boxes NOT in any bingo line (10 points each)
    for (const index of solvedIndices) {
        if (!boxesInBingo.has(index)) {
            const problem = problems.find((p) => p.gridIndex === index);
            score += problem?.points || POINTS_PER_PROBLEM;
        }
    }
    
    return score;
}

/**
 * Full score calculation combining all steps
 * @param submissions - Team's accepted submissions
 * @param problems - Grid problems
 * @returns Complete scoring result
 */
export function calculateTeamScore(
    submissions: CFSubmission[],
    problems: IProblem[]
): ScoreResult {
    const solvedIndices = matchSolvedProblems(submissions, problems);
    const bingoLines = findCompletedBingoLines(solvedIndices);
    const currentScore = calculateScore(solvedIndices, problems);

    return {
        solvedIndices,
        currentScore,
        bingoLines,
    };
}