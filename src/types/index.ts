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
