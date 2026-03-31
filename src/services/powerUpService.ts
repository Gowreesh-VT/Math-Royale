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
  key: 'semifinals-steal',
  title: 'Steal Option',
  contestId: '1771',
  problemIndex: 'A',
  name: 'Hossam and Combinatorics',
  url: 'https://codeforces.com/problemset/problem/1771/A',
  fullMarks: 10,
};

function isStealSubmission(submission: CFSubmission) {
  return (
    String(submission.contestId) === STEAL_POWER_UP.contestId &&
    submission.problem.index.toUpperCase() === STEAL_POWER_UP.problemIndex
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

  if (!match || match.roundNumber !== 2) {
    return null;
  }

  const validSubmissions = cfSubmissions.filter((submission) => {
    const handle = submission.author.members[0]?.handle;
    return (
      submission.creationTimeSeconds >= (match.startTime ? match.startTime.getTime() / 1000 : 0) &&
      !!handle &&
      isStealSubmission(submission)
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
      powerUpKey: STEAL_POWER_UP.key,
      verdict: 'OK',
    });

    if (alreadySolved) {
      continue;
    }

    const pointsDelta = submission.verdict === 'OK'
      ? STEAL_POWER_UP.fullMarks
      : calculateStealPenalty(submission);

    await PowerUpAttempt.create({
      matchId: match._id,
      teamId,
      side,
      powerUpKey: STEAL_POWER_UP.key,
      codeforcesHandle: handle,
      contestId: STEAL_POWER_UP.contestId,
      problemIndex: STEAL_POWER_UP.problemIndex,
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
  const attempts = await PowerUpAttempt.find({
    matchId,
    teamId,
    powerUpKey: STEAL_POWER_UP.key,
  })
    .sort({ timestamp: 1 })
    .lean();

  const solvedAttempt = attempts.find((attempt) => attempt.verdict === 'OK');
  const totalDelta = attempts.reduce((sum, attempt) => sum + attempt.pointsDelta, 0);

  return {
    key: STEAL_POWER_UP.key,
    title: STEAL_POWER_UP.title,
    question: {
      contestId: STEAL_POWER_UP.contestId,
      problemIndex: STEAL_POWER_UP.problemIndex,
      name: STEAL_POWER_UP.name,
      url: STEAL_POWER_UP.url,
    },
    available: true,
    solved: Boolean(solvedAttempt),
    attemptCount: attempts.length,
    totalDelta,
    fullMarks: STEAL_POWER_UP.fullMarks,
    attempts: attempts.map((attempt) => ({
      submissionId: attempt.submissionId,
      verdict: attempt.verdict,
      passedTestCount: attempt.passedTestCount,
      pointsDelta: attempt.pointsDelta,
      timestamp: attempt.timestamp,
    })),
  };
}
