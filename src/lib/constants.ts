// ===========================================
// CONSTANTS - Single source of truth
// ===========================================

// Scoring - General
export const POINTS_PER_PROBLEM = 10;

// Scoring - Tug of War (Rounds 2 & 3)
export const TOW_INITIAL_SCORE = 50;
export const TOW_POINTS_CORRECT = 10;
export const TOW_POINTS_WRONG = 0;
export const TOW_WIN_THRESHOLD = 2147483647;

// Scoring - Steal Power-Up (Round 2)
export const STEAL_POINTS_CORRECT = 10;
export const STEAL_POINTS_WRONG = -10;

// Round Durations (seconds)
export const ROUND_A_DURATION = 1800;
export const ROUND_B_DURATION = 2400;
export const ROUND_C_DURATION = 3000;

// Rate limiting
export const SYNC_COOLDOWN_MS = 30 * 1000;
export const LEADERBOARD_REFRESH_MS = 20 * 1000;

// Codeforces API
export const CF_API_BASE = 'https://codeforces.com/api';
export const CF_USER_STATUS_ENDPOINT = '/user.status';

// JWT
export const JWT_EXPIRY = '24h';
