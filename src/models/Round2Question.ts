import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Stores Codeforces problems used in Round 2 Tug of War matches
 */
export interface IRound2Question extends Document {
  roundNumber: number;
  side: 'A' | 'B';
  contestId: string;
  problemIndex: string;
  name: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

const Round2QuestionSchema = new Schema<IRound2Question>(
  {
    roundNumber: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },
    side: {
      type: String,
      required: true,
      enum: ['A', 'B'],
    },
    contestId: {
      type: String,
      required: true,
      trim: true,
    },
    problemIndex: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

Round2QuestionSchema.index(
  { contestId: 1, problemIndex: 1 },
  { unique: true }
);
Round2QuestionSchema.index({ roundNumber: 1, side: 1 });

export const Round2Question: Model<IRound2Question> =
  mongoose.models.Round2Question ||
  mongoose.model<IRound2Question>('Round2Question', Round2QuestionSchema);

export default Round2Question;
