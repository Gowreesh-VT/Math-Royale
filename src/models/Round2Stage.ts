import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Round2Stage - Updated for Multi-Round Format (A, B, C)
 * Tracks each round with multiple matches
 */
export interface IRound2Round extends Document {
  roundStage: 'A' | 'B' | 'C'; // REPLACES roundNumber
  roundName: string; // 'Round A (Easy)' | 'Round B (Medium)' | 'Round C (Hard)'
  matchIds: Types.ObjectId[];
  totalTeams: number; // Teams participating in this round
  status: 'pending' | 'active' | 'completed';
  duration: number;
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const Round2RoundSchema = new Schema<IRound2Round>(
  {
    roundStage: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C'],
      unique: true,
    },
    roundName: {
      type: String,
      required: true,
      enum: ['Round A (Easy)', 'Round B (Medium)', 'Round C (Hard)'],
    },
    matchIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Match',
    }],
    totalTeams: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'active', 'completed'],
      default: 'pending',
    },
    duration: {
      type: Number,
      required: true,
      default: 1800, // 30 mins
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

Round2RoundSchema.index({ status: 1 });
Round2RoundSchema.index({ roundStage: 1 });

const Round2Stage: Model<IRound2Round> =
  mongoose.models.Round2Stage ||
  mongoose.model<IRound2Round>('Round2Stage', Round2RoundSchema, 'round2stages');

export default Round2Stage;