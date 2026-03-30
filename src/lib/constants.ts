// ===========================================
// CONSTANTS - Single source of truth
// ===========================================

// Bingo winning lines (indices that form a complete line)
export const BINGO_LINES: number[][] = [
    // Rows
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    // Columns
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    // Diagonals
    [0, 4, 8],
    [2, 4, 6],
];

// Scoring - Round 1 (Bingo)
export const POINTS_PER_PROBLEM = 10;
export const BINGO_BONUS_POINTS = 30;

// Scoring - Round 2 (Tug of War)
export const TOW_INITIAL_SCORE = 50;
export const TOW_POINTS_CORRECT = 10;
export const TOW_POINTS_WRONG = -5;
export const TOW_WIN_THRESHOLD = 75;

// Rate limiting
export const SYNC_COOLDOWN_MS = 30 * 1000; // 30 seconds between syncs
export const LEADERBOARD_REFRESH_MS = 15 * 1000; // 30 seconds auto-refresh

// Codeforces API
export const CF_API_BASE = 'https://codeforces.com/api';
export const CF_USER_STATUS_ENDPOINT = '/user.status';

// JWT
export const JWT_EXPIRY = '24h';

// Grid layout
export const GRID_SIZE = 9;
export const GRID_COLS = 3;
export const GRID_ROWS = 3;
