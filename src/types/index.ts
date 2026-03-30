// ===========================================
// TYPE DEFINITIONS FOR CODEFORCES BINGO
// ===========================================

export interface ITeam {
    _id?: string;
    teamName: string;
    members: string[];
    codeforcesHandle: string;
    lastSync: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IProblem {
    gridIndex: number;
    contestId: string;
    problemIndex: string;
    name: string;
    points: number;
    url: string;
}

export interface ITeamScore {
    _id?: string;
    teamId: string;
    questionOrder: number[];
    solvedIndices: number[];
    currentScore: number;
    bingoLines: number[][];
    lastSubmissionTime: Date | null;
    syncCount: number;
}

export interface LoginRequest {
    teamName: string;
}

export interface LoginResponse {
    success: boolean;
    token?: string;
    team?: {
        id: string;
        teamName: string;
        members: string[];
    };
    error?: string;
}

export interface SyncRequest {
    teamId: string;
}

export interface SyncResponse {
    success: boolean;
    progress?: {
        solvedIndices: number[];
        currentScore: number;
        bingoLines: number[][];
    };
    error?: string;
    cooldownRemaining?: number;
}

export interface LeaderboardEntry {
    rank: number;
    teamName: string;
    score: number;
    solvedCount: number;
    bingoCount: number;
    lastSubmissionTime: Date | null;
}

export interface LeaderboardResponse {
    success: boolean;
    leaderboard?: LeaderboardEntry[];
    error?: string;
}

// cf api response types
export interface CFSubmission {
    id: number;
    contestId: number;
    problem: {
        contestId: number;
        index: string;
        name: string;
    };
    verdict: string;
    creationTimeSeconds: number;
}

export interface CFApiResponse {
    status: string;
    result?: CFSubmission[];
    comment?: string;
}

export interface JWTPayload {
    teamId: string;
    teamName: string;
    iat?: number;
    exp?: number;
}

export interface GridCellData {
    index: number;
    problem: IProblem;
    isSolved: boolean;
}