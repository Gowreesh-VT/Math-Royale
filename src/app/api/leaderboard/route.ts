// ===========================================
// LEADERBOARD API - Round 1
// ===========================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import { TeamScore, Team } from '@/models';
import { authOptions } from '../auth/[...nextauth]/route';
import type { LeaderboardResponse, LeaderboardEntry } from '@/types';

export async function GET() {
    try {
        // Authentication check
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json<LeaderboardResponse>(
                { success: false, error: 'Unauthorized - Please login to view leaderboard' },
                { status: 401 }
            );
        }

        await connectDB();

        const teamScores = await TeamScore.find({}).lean();

        const teams = await Team.find({}).lean();
        const teamMap = new Map(teams.map(t => [t._id.toString(), t]));

        const leaderboard: LeaderboardEntry[] = teamScores
            .map((score) => {
                const team = teamMap.get(score.teamId);
                if (!team) return null;

                return {
                    rank: 0,
                    teamName: team.teamName,
                    score: score.currentScore,
                    lastSubmissionTime: score.lastSubmissionTime,
                };
            })
            .filter((entry): entry is LeaderboardEntry => entry !== null);

        leaderboard.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            const timeA = a.lastSubmissionTime ? new Date(a.lastSubmissionTime).getTime() : Infinity;
            const timeB = b.lastSubmissionTime ? new Date(b.lastSubmissionTime).getTime() : Infinity;
            return timeA - timeB;
        });

        let currentRank = 1;
        for (let i = 0; i < leaderboard.length; i++) {
            if (i > 0 && leaderboard[i].score < leaderboard[i - 1].score) {
                currentRank = i + 1;
            }
            leaderboard[i].rank = currentRank;
        }

        return NextResponse.json<LeaderboardResponse>({
            success: true,
            leaderboard,
        });
    } catch (error) {
        console.error('Leaderboard API error:', error);
        return NextResponse.json<LeaderboardResponse>(
            { success: false, error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}
