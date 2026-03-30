import { Types } from 'mongoose';
import { IMatch } from '@/models/Match';
import { IRound2Question } from '@/models/Round2Question';
import Match from '@/models/Match';
import MatchSubmission from '@/models/MatchSubmission';
import Round2Question from '@/models/Round2Question';
import Team from '@/models/Team';
import {
  TOW_INITIAL_SCORE,
  TOW_POINTS_CORRECT,
  TOW_POINTS_WRONG,
  TOW_WIN_THRESHOLD,
} from '@/lib/constants';

/**
 * Codeforces Submission interface (from API)
 */

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
  verdict: string;
}

/**
 * Win condition result
 */
interface WinConditionResult {
  hasWinner: boolean;
  winningSide: 'A' | 'B' | null;
  isTimeout: boolean;
}

/**
 * Submission processing result
 */

interface ProcessedSubmission {
  submissionId: number;
  side: 'A' | 'B';
  handle: string;
  contestId: string;
  problemIndex: string;
  verdict: string;
  points: number;
  isNew: boolean;
}

/**
 * Sync result
 */

interface SyncResult {
  scoreA: number;
  scoreB: number;
  newSubmissions: ProcessedSubmission[];
  winningSide: 'A' | 'B' | null;
  isTimeout: boolean;
  timeRemaining: number;
  matchStatus: 'waiting' | 'active' | 'completed';
}

// ============================================
// TUG OF WAR SCORER SERVICE
// ============================================

/**
 * Check win condition for a match
 * - Winner declared when threshold (75 points) is reached
 * - On timeout: higher score wins automatically
 */

export function checkWinCondition(match: IMatch): WinConditionResult {

  if (match.scoreA >= TOW_WIN_THRESHOLD) {
    return { hasWinner: true, winningSide: 'A', isTimeout: false };
  }

  if (match.scoreB >= TOW_WIN_THRESHOLD) {
    return { hasWinner: true, winningSide: 'B', isTimeout: false };
  }

  if (match.startTime) {
    const timeElapsed = Date.now() - match.startTime.getTime();
    const timeExpired = timeElapsed >= match.duration * 1000;

    if (timeExpired) {

      if (match.scoreA > match.scoreB) {
        return { hasWinner: true, winningSide: 'A', isTimeout: true };
      } else if (match.scoreB > match.scoreA) {
        return { hasWinner: true, winningSide: 'B', isTimeout: true };
      }

      return { hasWinner: false, winningSide: null, isTimeout: true };
    }
  }

  return { hasWinner: false, winningSide: null, isTimeout: false };
}

/**
 * Calculate time remaining in a match (in seconds)
 */

export function getTimeRemaining(match: IMatch): number {
  if (!match.startTime) {
    return match.duration;
  }

  const elapsed = Math.floor((Date.now() - match.startTime.getTime()) / 1000);
  const remaining = match.duration - elapsed;

  return Math.max(0, remaining);
}

/**
 * Calculate points for a submission verdict
 */

export function calculatePoints(verdict: string): number {
  if (verdict === 'OK') {
    return TOW_POINTS_CORRECT;
  }

  return TOW_POINTS_WRONG;
}

/**
 * Determine which side a handle belongs to
 */

export function getSideForHandle(
  handle: string,
  sideA_handles: string[],
  sideB_handles: string[]
): 'A' | 'B' | null {
  const normalizedHandle = handle.toLowerCase();

  if (sideA_handles.some(h => h.toLowerCase() === normalizedHandle)) {
    return 'A';
  }

  if (sideB_handles.some(h => h.toLowerCase() === normalizedHandle)) {
    return 'B';
  }

  return null;
}

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find team ID for a given Codeforces handle within a side
 */

export async function getTeamIdForHandle(
  handle: string,
  teamIds: Types.ObjectId[]
): Promise<Types.ObjectId | null> {
  // Escape special regex characters to prevent ReDoS attacks
  const escapedHandle = escapeRegex(handle);
  const team = await Team.findOne({
    _id: { $in: teamIds },
    codeforcesHandle: { $regex: new RegExp(`^${escapedHandle}$`, 'i') },
  });

  return team ? team._id : null;
}

/**
 * Check if a question belongs to a side's question pool
 */

export function isQuestionInPool(
  contestId: string,
  problemIndex: string,
  questionPool: IRound2Question[]
): IRound2Question | null {
  return questionPool.find(
    q => q.contestId === String(contestId) &&
      q.problemIndex.toUpperCase() === problemIndex.toUpperCase()
  ) || null;
}

/**
 * Check if a submission has already been processed
 */

export async function isSubmissionProcessed(submissionId: number): Promise<boolean> {
  const existing = await MatchSubmission.findOne({ submissionId });
  return !!existing;
}

/**
 * Process Codeforces submissions and update match scores
 */

export async function processMatchSubmissions(
  matchId: Types.ObjectId | string,
  cfSubmissions: CFSubmission[]
): Promise<SyncResult> {
  const match = await Match.findById(matchId);
  if (!match) {
    throw new Error('Match not found');
  }

  const [questionsA, questionsB] = await Promise.all([
    Round2Question.find({ _id: { $in: match.questionPoolA } }),
    Round2Question.find({ _id: { $in: match.questionPoolB } }),
  ]);

  const newSubmissions: ProcessedSubmission[] = [];
  let scoreADelta = 0;
  let scoreBDelta = 0;

  const matchStartTime = match.startTime ? match.startTime.getTime() / 1000 : 0;
  const validSubmissions = cfSubmissions.filter(
    sub => sub.creationTimeSeconds >= matchStartTime
  );

  for (const sub of validSubmissions) {

    const alreadyProcessed = await isSubmissionProcessed(sub.id);
    if (alreadyProcessed) {
      continue;
    }

    const handle = sub.author.members[0]?.handle;
    if (!handle) continue;

    const side = getSideForHandle(handle, match.sideA_handles, match.sideB_handles);
    if (!side) continue;

    const questionPool = side === 'A' ? questionsA : questionsB;
    const question = isQuestionInPool(
      String(sub.contestId),
      sub.problem.index,
      questionPool
    );

    if (!question) continue;

    const points = calculatePoints(sub.verdict);

    const teamIds = side === 'A' ? match.sideA_teamIds : match.sideB_teamIds;
    const teamId = await getTeamIdForHandle(handle, teamIds);

    if (!teamId) continue;


    if (sub.verdict === 'OK') {
      const alreadySolved = await MatchSubmission.findOne({
        matchId: match._id,
        side,
        questionId: question._id,
        verdict: 'OK',
      });

      if (alreadySolved) {
        const submission = new MatchSubmission({
          matchId: match._id,
          side,
          teamId,
          codeforcesHandle: handle,
          questionId: question._id,
          contestId: String(sub.contestId),
          problemIndex: sub.problem.index,
          submissionId: sub.id,
          verdict: sub.verdict,
          points: 0,
          timestamp: new Date(sub.creationTimeSeconds * 1000),
          processed: true,
        });

        await submission.save();
        continue;
      }
    }

    const submission = new MatchSubmission({
      matchId: match._id,
      side,
      teamId,
      codeforcesHandle: handle,
      questionId: question._id,
      contestId: String(sub.contestId),
      problemIndex: sub.problem.index,
      submissionId: sub.id,
      verdict: sub.verdict,
      points,
      timestamp: new Date(sub.creationTimeSeconds * 1000),
      processed: true,
    });

    await submission.save();

    if (side === 'A') {
      scoreADelta += points;
    } else {
      scoreBDelta += points;
    }

    newSubmissions.push({
      submissionId: sub.id,
      side,
      handle,
      contestId: String(sub.contestId),
      problemIndex: sub.problem.index,
      verdict: sub.verdict,
      points,
      isNew: true,
    });
  }

  const newScoreA = match.scoreA + scoreADelta;
  const newScoreB = match.scoreB + scoreBDelta;

  match.scoreA = newScoreA;
  match.scoreB = newScoreB;

  const winResult = checkWinCondition(match);

  if (winResult.hasWinner && match.status === 'active') {
    match.status = 'completed';
    match.winningSide = winResult.winningSide || undefined;
    match.endTime = new Date();
  }

  await match.save();

  return {
    scoreA: newScoreA,
    scoreB: newScoreB,
    newSubmissions,
    winningSide: match.winningSide || null,
    isTimeout: winResult.isTimeout,
    timeRemaining: getTimeRemaining(match),
    matchStatus: match.status,
  };
}

/**
 * Get match state with solved questions
 */

export async function getMatchState(matchId: Types.ObjectId | string) {
  const match = await Match.findById(matchId)
    .populate('sideA_teamIds', 'teamName codeforcesHandle')
    .populate('sideB_teamIds', 'teamName codeforcesHandle')
    .populate('questionPoolA')
    .populate('questionPoolB');

  if (!match) {
    throw new Error('Match not found');
  }

  const submissions = await MatchSubmission.find({
    matchId: match._id,
    verdict: 'OK',
  });

  const solvedByA = new Set(
    submissions
      .filter(s => s.side === 'A')
      .map(s => s.questionId.toString())
  );

  const solvedByB = new Set(
    submissions
      .filter(s => s.side === 'B')
      .map(s => s.questionId.toString())
  );

  return {
    match,
    solvedByA,
    solvedByB,
    timeRemaining: getTimeRemaining(match),
  };
}

/**
 * Get winning teams from a completed match
 */

export function getWinningTeamIds(match: IMatch): Types.ObjectId[] {
  if (!match.winningSide) {
    return [];
  }

  return match.winningSide === 'A'
    ? match.sideA_teamIds
    : match.sideB_teamIds;
}

/**
 * Get losing teams from a completed match
 */

export function getLosingTeamIds(match: IMatch): Types.ObjectId[] {
  if (!match.winningSide) {
    return [];
  }

  return match.winningSide === 'A'
    ? match.sideB_teamIds
    : match.sideA_teamIds;
}

export default {
  checkWinCondition,
  getTimeRemaining,
  calculatePoints,
  getSideForHandle,
  getTeamIdForHandle,
  isQuestionInPool,
  isSubmissionProcessed,
  processMatchSubmissions,
  getMatchState,
  getWinningTeamIds,
  getLosingTeamIds,
  TOW_INITIAL_SCORE,
  TOW_POINTS_CORRECT,
  TOW_POINTS_WRONG,
  TOW_WIN_THRESHOLD,
};
