import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  gridIndex: number;
  contestId: string;
  problemIndex: string;
  name: string;
  points: number;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

// Base Schema structure used for both rounds
const QuestionSchema = new Schema<IQuestion>(
  {
    gridIndex: { type: Number, required: true },
    contestId: { type: String, required: true },
    problemIndex: { type: String, required: true },
    name: { type: String, required: true },
    points: { type: Number, required: true, default: 10 },
    url: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// --- ROUND 1 MODEL ---
// Uses the default 'questions' collection
export const Question = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

// --- ROUND 2 MODEL ---
// Explicitly uses the 'questions_r2' collection
export const QuestionR2 = mongoose.models.QuestionR2 || mongoose.model<IQuestion>('QuestionR2', QuestionSchema, 'questions_r2');

// We keep Question as the default export so Round 1 files still work without changes
export default Question;