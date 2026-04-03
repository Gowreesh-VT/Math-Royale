import { Types } from 'mongoose';
import Match from '@/models/Match';
import PowerUpAttempt from '@/models/PowerUpAttempt';
import MatchSubmission from '@/models/MatchSubmission';
import Round2Question from '@/models/Round2Question';
import { checkWinCondition, getSideForHandle, getTeamIdForHandle, getTimeRemaining } from '@/services/TugOfWarScores';
import { STEAL_POINTS_CORRECT, STEAL_POINTS_WRONG } from '@/lib/constants';

interface CFSubmission {
  id: number;
  creationTimeSeconds: number;
  contestId: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
  };
  author: {
    members: Array<{ handle: string }>;
  };
  verdict?: string;
}

export const STEAL_POWER_UP = {
  roundStage: 'B',
  key: 'semifinals-steal',
  title: 'Steal & Swap',
  contestId: '1771',
  problemIndex: 'A',
  name: 'Hossam and Combinatorics',
  url: 'https://codeforces.com/problemset/problem/1771/A',
  fullMarks: STEAL_POINTS_CORRECT,
};

export const DOUBLE_OR_HALF_POWER_UP = {
  roundStage: 'C',
  key: 'finals-double-or-half',
  title: 'Double or Half',
  contestId: '2171',
  problemIndex: 'C1',
  name: 'A Gift From Orangutan',
  url: 'https://codeforces.com/problemset/problem/2171/C1',
  fullMarks: 0,
};

const POWER_UPS = [STEAL_POWER_UP, DOUBLE_OR_HALF_POWER_UP] as const;

type PowerUpConfig = (typeof POWER_UPS)[number];

interface QuestionSwap {
  playerUnansweredIndex: string;
  stealQuestionIndex: string;
  timestamp: Date;
}

function getPowerUpForRound(roundStage: string): PowerUpConfig | null {
  return POWER_UPS.find((powerUp) => powerUp.roundStage === roundStage) || null;
}

function isPowerUpSubmission(submission: CFSubmission, powerUp: PowerUpConfig) {
  return (
    String(submission.contestId) === powerUp.contestId &&
    submission.problem.index.toUpperCase() === powerUp.problemIndex
  );
}

function calculateStealPenalty() {
  return STEAL_POINTS_WRONG;
}

export async function processStealPowerUpSubmissions(
  matchId: Types.ObjectId | string,
  cfSubmissions: CFSubmission[]
) {
  const match = await Match.findById(matchId);

  if (!match) {
    return null;
  }

  const powerUp = getPowerUpForRound(match.roundStage);

  if (!powerUp) {
    return null;
  }

  const validSubmissions = cfSubmissions.filter((submission) => {
    const handle = submission.author.members[0]?.handle;
    return (
      submission.creationTimeSeconds >= (match.startTime ? match.startTime.getTime() / 1000 : 0) &&
      !!handle &&
      isPowerUpSubmission(submission, powerUp)
    );
  });

  let scoreADelta = 0;
  let scoreBDelta = 0;

  for (const submission of validSubmissions) {
    const alreadyProcessed = await PowerUpAttempt.findOne({ submissionId: submission.id });
    if (alreadyProcessed) {
      continue;
    }

    const handle = submission.author.members[0]?.handle;
    if (!handle) {
      continue;
    }

    const side = getSideForHandle(handle, match.sideA_handles, match.sideB_handles);
    if (!side) {
      continue;
    }

    const teamId = await getTeamIdForHandle(
      handle,
      side === 'A' ? match.sideA_teamIds : match.sideB_teamIds
    );

    if (!teamId) {
      continue;
    }

    const alreadySolved = await PowerUpAttempt.findOne({
      matchId: match._id,
      teamId,
      powerUpKey: powerUp.key,
      verdict: 'OK',
    });

    if (alreadySolved) {
      continue;
    }

    let pointsDelta = 0;

    if (powerUp.key === STEAL_POWER_UP.key) {
      pointsDelta = submission.verdict === 'OK'
        ? STEAL_POWER_UP.fullMarks
        : calculateStealPenalty();
    } else if (powerUp.key === DOUBLE_OR_HALF_POWER_UP.key) {
      const currentScore = side === 'A' ? match.scoreA : match.scoreB;
      const earned = Math.max(0, currentScore - 50);
      
      if (submission.verdict === 'OK') {
        pointsDelta = earned;
      } else {
        pointsDelta = -(earned - Math.floor(earned / 2));
      }
    }

    await PowerUpAttempt.create({
      matchId: match._id,
      teamId,
      side,
      powerUpKey: powerUp.key,
      codeforcesHandle: handle,
      contestId: powerUp.contestId,
      problemIndex: powerUp.problemIndex,
      submissionId: submission.id,
      verdict: submission.verdict || 'UNKNOWN',
      pointsDelta,
      timestamp: new Date(submission.creationTimeSeconds * 1000),
    });

    if (side === 'A') {
      scoreADelta += pointsDelta;
    } else {
      scoreBDelta += pointsDelta;
    }
  }

  if (scoreADelta !== 0 || scoreBDelta !== 0) {
    match.scoreA += scoreADelta;
    match.scoreB += scoreBDelta;

    const winResult = checkWinCondition(match);
    if (winResult.hasWinner && match.status === 'active') {
      match.status = 'completed';
      match.winningSide = winResult.winningSide || undefined;
      match.endTime = new Date();
    }

    await match.save();
  }

  return {
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    status: match.status,
    winningSide: match.winningSide || null,
    timeRemaining: getTimeRemaining(match),
  };
}

export async function getStealPowerUpState(matchId: Types.ObjectId | string, teamId: Types.ObjectId | string) {
  const match = await Match.findById(matchId).lean();

  if (!match) {
    return null;
  }

  const powerUp = getPowerUpForRound(match.roundStage);

  if (!powerUp) {
    return null;
  }

  const attempts = await PowerUpAttempt.find({
    matchId,
    teamId,
    powerUpKey: powerUp.key,
  })
    .sort({ timestamp: 1 })
    .lean();

  const solvedAttempt = attempts.find((attempt) => attempt.verdict === 'OK');
  const totalDelta = attempts.reduce((sum, attempt) => sum + attempt.pointsDelta, 0);
  const swapCompleted = powerUp.key === STEAL_POWER_UP.key
    ? Boolean(await PowerUpAttempt.exists({
        matchId,
        teamId,
        powerUpKey: `${STEAL_POWER_UP.key}-swap`,
        verdict: 'SWAP_EXECUTED',
      }))
    : false;

  return {
    key: powerUp.key,
    title: powerUp.title,
    question: {
      contestId: powerUp.contestId,
      problemIndex: powerUp.problemIndex,
      name: powerUp.name,
      url: powerUp.url,
    },
    available: true,
    solved: Boolean(solvedAttempt),
    swapCompleted,
    attemptCount: attempts.length,
    totalDelta,
    fullMarks: powerUp.fullMarks,
    effectLabel: powerUp.key === DOUBLE_OR_HALF_POWER_UP.key ? 'DOUBLE_OR_HALF' : 'SWAP_QUESTIONS',
    attempts: attempts.map((attempt) => ({
      submissionId: attempt.submissionId,
      verdict: attempt.verdict,
      pointsDelta: attempt.pointsDelta,
      timestamp: attempt.timestamp,
    })),
  };
}

/**
 * Execute a question swap when the steal powerup is successfully used
 * Player swaps one of their unanswered questions with one of the opponent's questions
 */
export async function executeQuestionSwap(
  matchId: Types.ObjectId | string,
  playerTeamId: string,
  playerUnansweredIndex: number
): Promise<QuestionSwap | null> {
  const match = await Match.findById(matchId);

  if (!match) {
    return null;
  }

  if (match.status !== 'active') {
    return null;
  }

  const isInSideA = match.sideA_teamIds.some((id) => id.toString() === playerTeamId);
  const isInSideB = match.sideB_teamIds.some((id) => id.toString() === playerTeamId);

  if (!isInSideA && !isInSideB) {
    return null;
  }

  // Determine sides based on team membership
  const playerSide = isInSideA ? 'A' : 'B';
  const playerPool = [...(playerSide === 'A' ? match.questionPoolA : match.questionPoolB)];

  // Validate indices
  if (playerUnansweredIndex < 0 || playerUnansweredIndex >= playerPool.length) {
    return null;
  }

  // Verify player's question is unanswered
  const playerQuestionId = playerPool[playerUnansweredIndex];
  const alreadySolved = await MatchSubmission.exists({
    matchId: match._id,
    teamId: new Types.ObjectId(playerTeamId),
    questionId: playerQuestionId,
    verdict: 'OK',
  });

  if (alreadySolved) {
    return null;
  }

  // Replace selected unanswered match question with hardcoded Steal question.
  const stealQuestion = await Round2Question.findOneAndUpdate(
    {
      contestId: STEAL_POWER_UP.contestId,
      problemIndex: STEAL_POWER_UP.problemIndex,
    },
    {
      $setOnInsert: {
        roundNumber: 2,
        side: 'A',
        name: STEAL_POWER_UP.name,
        url: STEAL_POWER_UP.url,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  if (!stealQuestion) {
    return null;
  }

  playerPool[playerUnansweredIndex] = stealQuestion._id as Types.ObjectId;

  if (playerSide === 'A') {
    match.questionPoolA = playerPool;
  } else {
    match.questionPoolB = playerPool;
  }

  await match.save();

  const swappedInQuestion = await Round2Question.findById(playerPool[playerUnansweredIndex])
    .select('problemIndex')
    .lean();
  return {
    playerUnansweredIndex: swappedInQuestion?.problemIndex || '',
    stealQuestionIndex: STEAL_POWER_UP.problemIndex,
    timestamp: new Date(),
  };
}