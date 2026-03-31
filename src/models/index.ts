// Export all models from a single file for easier imports

// Round 1 Models
export { default as Question } from './Question';
export { default as TeamScore, TeamScoreR2 } from './TeamScore';
export { default as Team } from './Team';

// Round 2 Models
export { default as Round2Round } from './Round2Stage';
export { default as Match } from './Match';
export { default as MatchSubmission } from './MatchSubmission';
export { default as Round2Question } from './Round2Question';

// Type exports
export type { IQuestion } from './Question';
export type { ITeamScore } from './TeamScore';
export type { ITeam } from './Team';
export type { IRound2Round } from './Round2Stage';
export type { IMatch } from './Match';
export type { IMatchSubmission } from './MatchSubmission';
export type { IRound2Question } from './Round2Question';
