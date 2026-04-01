import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Team from '../src/models/Team';
import Match from '../src/models/Match';
import MatchSubmission from '../src/models/MatchSubmission';
import Round2Question from '../src/models/Round2Question';
import Round2Stage from '../src/models/Round2Stage';
import { TOW_INITIAL_SCORE } from '../src/lib/constants';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_USER_EMAIL = 'manmaychakarborty@gmail.com';
const DEV_OPPONENT_EMAIL = 'round2-dev-opponent@example.com';
const ROUND_NAMES: Record<string, string> = {
  'A': 'Round A (Easy)',
  'B': 'Round B (Medium)',
  'C': 'Round C (Hard)',
};

const ROUND_QUESTIONS = {
  1: {
    sideA: [
      { contestId: '4', problemIndex: 'A', name: 'Watermelon', url: 'https://codeforces.com/problemset/problem/4/A' },
      { contestId: '339', problemIndex: 'A', name: 'Helpful Maths', url: 'https://codeforces.com/problemset/problem/339/A' },
      { contestId: '158', problemIndex: 'B', name: 'Taxi', url: 'https://codeforces.com/problemset/problem/158/B' },
      { contestId: '71', problemIndex: 'A', name: 'Way Too Long Words', url: 'https://codeforces.com/problemset/problem/71/A' },
    ],
    sideB: [
      { contestId: '231', problemIndex: 'A', name: 'Team', url: 'https://codeforces.com/problemset/problem/231/A' },
      { contestId: '282', problemIndex: 'A', name: 'Bit++', url: 'https://codeforces.com/problemset/problem/282/A' },
      { contestId: '50', problemIndex: 'A', name: 'Domino piling', url: 'https://codeforces.com/problemset/problem/50/A' },
      { contestId: '112', problemIndex: 'A', name: 'Petya and Strings', url: 'https://codeforces.com/problemset/problem/112/A' },
    ],
  },
  2: {
    sideA: [
      { contestId: '1891', problemIndex: 'A', name: 'Sorting with Twos', url: 'https://codeforces.com/contest/1891/problem/A' },
      { contestId: '1891', problemIndex: 'B', name: 'Deja Vu', url: 'https://codeforces.com/contest/1891/problem/B' },
      { contestId: '1890', problemIndex: 'A', name: "Doremy's Paint 3", url: 'https://codeforces.com/contest/1890/problem/A' },
      { contestId: '1890', problemIndex: 'B', name: 'Qingshan Loves Strings', url: 'https://codeforces.com/contest/1890/problem/B' },
    ],
    sideB: [
      { contestId: '1883', problemIndex: 'A', name: 'Morning', url: 'https://codeforces.com/contest/1883/problem/A' },
      { contestId: '1883', problemIndex: 'B', name: 'Chemistry', url: 'https://codeforces.com/contest/1883/problem/B' },
      { contestId: '1882', problemIndex: 'A', name: 'Increasing Sequence', url: 'https://codeforces.com/contest/1882/problem/A' },
      { contestId: '1882', problemIndex: 'B', name: 'Sets and Union', url: 'https://codeforces.com/contest/1882/problem/B' },
    ],
  },
  3: {
    sideA: [
      { contestId: '1881', problemIndex: 'B', name: 'Three Threadlets', url: 'https://codeforces.com/contest/1881/problem/B' },
      { contestId: '1879', problemIndex: 'A', name: 'Rigged!', url: 'https://codeforces.com/contest/1879/problem/A' },
      { contestId: '1879', problemIndex: 'B', name: 'Chips on the Board', url: 'https://codeforces.com/contest/1879/problem/B' },
      { contestId: '1877', problemIndex: 'A', name: 'Goals of Victory', url: 'https://codeforces.com/contest/1877/problem/A' },
    ],
    sideB: [
      { contestId: '1875', problemIndex: 'A', name: 'Jellyfish and Undertale', url: 'https://codeforces.com/contest/1875/problem/A' },
      { contestId: '1875', problemIndex: 'B', name: 'Jellyfish and Game', url: 'https://codeforces.com/contest/1875/problem/B' },
      { contestId: '1873', problemIndex: 'A', name: 'Short Sort', url: 'https://codeforces.com/contest/1873/problem/A' },
      { contestId: '1873', problemIndex: 'B', name: 'Good Kid', url: 'https://codeforces.com/contest/1873/problem/B' },
    ],
  },
} as const;

async function seedRound2Questions() {
  await Round2Question.deleteMany({});

  for (const [roundNumber, roundData] of Object.entries(ROUND_QUESTIONS)) {
    const numericRound = Number(roundNumber);

    for (const question of roundData.sideA) {
      await Round2Question.create({
        roundNumber: numericRound,
        side: 'A',
        ...question,
      });
    }

    for (const question of roundData.sideB) {
      await Round2Question.create({
        roundNumber: numericRound,
        side: 'B',
        ...question,
      });
    }
  }
}

async function setupRound2TestData() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not found in .env.local');
  }

  const userEmail = process.argv[2] || DEFAULT_USER_EMAIL;
  const requestedRoundStr = process.argv[3] || 'A';
  
  if (!['A', 'B', 'C'].includes(requestedRoundStr)) {
    throw new Error('Round must be A, B, or C');
  }

  const STAGES = ['A', 'B', 'C'];
  const stageIndex = STAGES.indexOf(requestedRoundStr);
  const requestedRoundNumeric = stageIndex + 1; 

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  console.log('🧹 Resetting Round 2 collections...');
  await Promise.all([
    MatchSubmission.deleteMany({}),
    Match.deleteMany({}),
    Round2Stage.deleteMany({}),
  ]);
  await seedRound2Questions();
  console.log('Round 2 collections reset and questions seeded');

  console.log(`Preparing player team for ${userEmail}...`);
  const playerTeam = await Team.findOneAndUpdate(
    { email: userEmail },
    {
      $setOnInsert: {
        teamName: 'Dev Player',
        email: userEmail,
        codeforcesHandle: null,
      },
      $set: {
        hasRound2Access: true,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  console.log('Preparing opponent team...');
  const opponentTeam = await Team.findOneAndUpdate(
    { email: DEV_OPPONENT_EMAIL },
    {
      $setOnInsert: {
        teamName: 'Dev Opponent',
        email: DEV_OPPONENT_EMAIL,
        codeforcesHandle: 'tourist',
      },
      $set: {
        hasRound2Access: true,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  const questionPoolA = await Round2Question.find({ roundNumber: requestedRoundNumeric, side: 'A' }).sort({ createdAt: 1 }).limit(4);
  const questionPoolB = await Round2Question.find({ roundNumber: requestedRoundNumeric, side: 'B' }).sort({ createdAt: 1 }).limit(4);

  if (questionPoolA.length < 4 || questionPoolB.length < 4) {
    throw new Error('Failed to seed enough Round 2 questions for the test match');
  }

  const duration = 2 * 60 * 60;
  const startTime = new Date(Date.now() - 60 * 1000);
  const endTime = new Date(startTime.getTime() + duration * 1000);

  if (stageIndex > 0) {
    const previousRoundNumeric = stageIndex;
    const previousRoundStage = STAGES[stageIndex - 1];
    
    const previousQuestionsA = await Round2Question.find({ roundNumber: previousRoundNumeric, side: 'A' }).sort({ createdAt: 1 }).limit(4);
    const previousQuestionsB = await Round2Question.find({ roundNumber: previousRoundNumeric, side: 'B' }).sort({ createdAt: 1 }).limit(4);

    const completedMatch = await Match.create({
      roundStage: previousRoundStage,
      sideA_teamIds: [playerTeam._id],
      sideA_handles: playerTeam.codeforcesHandle ? [playerTeam.codeforcesHandle] : [],
      sideB_teamIds: [opponentTeam._id],
      sideB_handles: opponentTeam.codeforcesHandle ? [opponentTeam.codeforcesHandle] : [],
      scoreA: 75,
      scoreB: 50,
      status: 'completed',
      winningSide: 'A',
      questionPoolA: previousQuestionsA.map((question) => question._id),
      questionPoolB: previousQuestionsB.map((question) => question._id),
      startTime: new Date(startTime.getTime() - duration * 1000),
      endTime: new Date(startTime.getTime() - duration * 1000 + 30 * 60 * 1000),
      duration,
    });

    await Round2Stage.create({
      roundStage: previousRoundStage,
      roundName: ROUND_NAMES[previousRoundStage],
      matchIds: [completedMatch._id],
      status: 'completed',
      duration,
      startTime: completedMatch.startTime,
      endTime: completedMatch.endTime,
    });
  }

  console.log(`Creating active ${ROUND_NAMES[requestedRoundStr]} dev match...`);
  const match = await Match.create({
    roundStage: requestedRoundStr,
    sideA_teamIds: [playerTeam._id],
    sideA_handles: playerTeam.codeforcesHandle ? [playerTeam.codeforcesHandle] : [],
    sideB_teamIds: [opponentTeam._id],
    sideB_handles: opponentTeam.codeforcesHandle ? [opponentTeam.codeforcesHandle] : [],
    scoreA: TOW_INITIAL_SCORE,
    scoreB: TOW_INITIAL_SCORE,
    status: 'active',
    questionPoolA: questionPoolA.map((question) => question._id),
    questionPoolB: questionPoolB.map((question) => question._id),
    startTime,
    duration,
  });

  const stage = await Round2Stage.create({
    roundStage: requestedRoundStr,
    roundName: ROUND_NAMES[requestedRoundStr],
    matchIds: [match._id],
    status: 'active',
    duration,
    startTime,
    endTime,
  });

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('Round 2 test data is ready');
  console.log('═══════════════════════════════════════════════');
  console.log(`Player team:   ${playerTeam.teamName} (${playerTeam.email})`);
  console.log(`Round 2 access:${playerTeam.hasRound2Access ? ' enabled' : ' disabled'}`);
  console.log(`Round:         ${ROUND_NAMES[requestedRoundStr]}`);
  console.log(`Match ID:      ${match._id}`);
  console.log(`Stage ID:      ${stage._id}`);
  console.log(`Match status:  ${match.status}`);
  console.log(`Team side:     A`);
  console.log(`Started at:    ${startTime.toISOString()}`);
  console.log(`Ends at:       ${endTime.toISOString()}`);
  console.log('');
  if (!playerTeam.codeforcesHandle) {
    console.log('Note: your team does not have a Codeforces handle yet.');
    console.log('After login, set it once on /round2 to dismiss the handle prompt.');
    console.log('');
  }
  console.log('Open after login:');
  console.log(`  /round2`);
  console.log(`  /round2/match/${match._id}`);
  console.log('═══════════════════════════════════════════════');
}

setupRound2TestData()
  .catch((error) => {
    console.error('Failed to set up Round 2 test data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
