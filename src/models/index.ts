// Export all models from a single file for easier imports

export { default as Team } from './Team';

// Round 2 Models
export { default as Round2Round } from './Round2Stage';
export { default as Match } from './Match';
export { default as MatchSubmission } from './MatchSubmission';
export { default as PowerUpAttempt } from './PowerUpAttempt';
export { default as Round2Question } from './Round2Question';

export type { ITeam } from './Team';
export type { IRound2Round } from './Round2Stage';
export type { IMatch } from './Match';
export type { IMatchSubmission } from './MatchSubmission';
export type { IPowerUpAttempt } from './PowerUpAttempt';
export type { IRound2Question } from './Round2Question';
