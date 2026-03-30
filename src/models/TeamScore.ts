import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamScore extends Document {
  teamId: string;
  questionOrder: number[];
  solvedIndices: number[];
  currentScore: number;
  bingoLines: number[][];
  syncCount: number;
  lastSubmissionTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeamScoreSchema = new Schema<ITeamScore>(
  {
    teamId: { type: String, required: true, unique: true },
    questionOrder: { type: [Number], required: true },
    solvedIndices: { type: [Number], default: [] },
    currentScore: { type: Number, default: 0 },
    bingoLines: { type: [[Number]], default: [] },
    syncCount: { type: Number, default: 0 },
    lastSubmissionTime: { type: Date },
  },
  {
    timestamps: true,
  }
);

// --- ROUND 1 MODEL ---
// Standard collection: 'teamscores'
export const TeamScore = mongoose.models.TeamScore || mongoose.model<ITeamScore>('TeamScore', TeamScoreSchema);

// --- ROUND 2 MODEL ---
// Isolated collection: 'team_scores_r2'
export const TeamScoreR2 = mongoose.models.TeamScoreR2 || mongoose.model<ITeamScore>('TeamScoreR2', TeamScoreSchema, 'team_scores_r2');

export default TeamScore;