import { Types } from 'mongoose';
import Match from '@/models/Match';
import PowerUpAttempt from '@/models/PowerUpAttempt';
import { checkWinCondition, getSideForHandle, getTeamIdForHandle, getTimeRemaining } from '@/services/TugOfWarScores';

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
  passedTestCount?: number;
}

export const STEAL_POWER_UP = {
  roundStage: 'B',
  key: 'semifinals-steal',
  title: 'Steal Option',
  contestId: '1771',
  problemIndex: 'A',
  name: 'Hossam and Combinatorics',
  url: 'https://codeforces.com/problemset/problem/1771/A',
  fullMarks: 10,
};

export const DOUBLE_OR_NOTHING_POWER_UP = {
  roundStage: 'C',
  key: 'finals-double-or-nothing',
  title: 'Double or Nothing',
  contestId: '2171',
  problemIndex: 'C1',
  name: 'A Gift From Orangutan',
  url: 'https://codeforces.com/problemset/problem/2171/C1',
  fullMarks: 0,
};

const POWER_UPS = [STEAL_POWER_UP, DOUBLE_OR_NOTHING_POWER_UP] as const;

type PowerUpConfig = (typeof POWER_UPS)[number];

function getPowerUpForRound(roundStage: string): PowerUpConfig | null {
  return POWER_UPS.find((powerUp) => powerUp.roundStage === roundStage) || null;
}

function isPowerUpSubmission(submission: CFSubmission, powerUp: PowerUpConfig) {
  return (
    String(submission.contestId) === powerUp.contestId &&
    submission.problem.index.toUpperCase() === powerUp.problemIndex
  );
}

function calculateStealPenalty(submission: CFSubmission) {
  // Codeforces exposes `passedTestCount`, not total failed tests, so we approximate
  // the deduction by the first failed test index. This keeps the penalty progressive.
  return -Math.max(1, (submission.passedTestCount ?? 0) + 1);
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
        : calculateStealPenalty(submission);
    } else if (powerUp.key === DOUBLE_OR_NOTHING_POWER_UP.key) {
      if (submission.verdict === 'OK') {
        pointsDelta = side === 'A' ? match.scoreA : match.scoreB;
      } else {
        pointsDelta = 0;
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
      passedTestCount: submission.passedTestCount ?? 0,
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
    attemptCount: attempts.length,
    totalDelta,
    fullMarks: powerUp.fullMarks,
    effectLabel: powerUp.key === DOUBLE_OR_NOTHING_POWER_UP.key ? 'DOUBLE_CURRENT_SCORE' : 'ADD_POINTS',
    attempts: attempts.map((attempt) => ({
      submissionId: attempt.submissionId,
      verdict: attempt.verdict,
      passedTestCount: attempt.passedTestCount,
      pointsDelta: attempt.pointsDelta,
      timestamp: attempt.timestamp,
    })),
  };
}
