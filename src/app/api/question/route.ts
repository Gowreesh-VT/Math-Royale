// ===========================================
// QUESTION API ROUTE - Get questions and team score
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import { Question, TeamScore, Team, Round1Session } from '@/models';
import { authOptions } from '../auth/[...nextauth]/route';

function shuffleArray(array: any[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.teamId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if Round 1 is active
    const round1Session = await Round1Session.findOne();
    if (!round1Session || !round1Session.isActive) {
      return NextResponse.json(
        { success: false, error: 'Round 1 is not active. Questions are only visible during the contest.' },
        { status: 403 }
      );
    }

    const teamId = session.user.teamId;

    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    const allQuestions = await Question.find({}).sort({ gridIndex: 1 });
    if (!allQuestions || allQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No questions found' },
        { status: 404 }
      );
    }
    const randomOrder = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8]);

    const teamScore = await TeamScore.findOneAndUpdate(
      { teamId },
      {
        $setOnInsert: {
          teamId,
          questionOrder: randomOrder,
          solvedIndices: [],
          currentScore: 0,
          bingoLines: [],
        },
      },
      {
        new: true,   // return existing or newly inserted doc
        upsert: true // insert if not exists
      }
    );

    const teamQuestions = teamScore.questionOrder.map(
      (originalIndex: number, gridPosition: number) => {
        const question = allQuestions[originalIndex];
        return {
          ...question.toObject(),
          gridIndex: gridPosition,
          originalIndex,
        };
      }
    );

    const gameData = {
      name: 'Round 1',
      problems: teamQuestions,
    };

    return NextResponse.json({
      success: true,
      game: gameData,
      progress: {
        solvedIndices: teamScore.solvedIndices,
        currentScore: teamScore.currentScore,
        bingoLines: teamScore.bingoLines,
      },
      teamName: team.teamName,
    });
  } catch (error) {
    console.error('Question API error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error fetching questions' },
      { status: 500 }
    );
  }
}
