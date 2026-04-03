import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { TOW_INITIAL_SCORE, ROUND_A_DURATION } from '../lib/constants';

/**
 * Match Interface - Updated for Multi-Round Format (A, B, C)
 * - Round A (Easy): Multiple 4v4 matches (eliminates 40%)
 * - Round B (Medium): Multiple matches (eliminates 60% of remaining)
 * - Round C (Hard): Finals (only top 3 winners)
 */
export interface IMatch extends Document {
  roundStage: 'A' | 'B' | 'C'; // Round difficulty (REPLACES roundNumber)
  matchNumber: number; // Match 1, 2, 3, etc within a round
  
  sideA_teamIds: Types.ObjectId[];
  sideA_handles: string[];

  sideB_teamIds: Types.ObjectId[];
  sideB_handles: string[];
  
  scoreA: number;
  scoreB: number;
  
  status: 'waiting' | 'active' | 'completed';
  winningSide?: 'A' | 'B';

  questionPoolA: Types.ObjectId[];
  questionPoolB: Types.ObjectId[];
  
  startTime?: Date;
  endTime?: Date;
  duration: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    roundStage: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C'],
    },
    
    matchNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    
    sideA_teamIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    }],
    sideA_handles: [{
      type: String,
      required: true,
      trim: true,
    }],
    
    sideB_teamIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    }],
    sideB_handles: [{
      type: String,
      required: true,
      trim: true,
    }],
    
    scoreA: {
      type: Number,
      required: true,
      default: TOW_INITIAL_SCORE,
    },
    scoreB: {
      type: Number,
      required: true,
      default: TOW_INITIAL_SCORE,
    },
    
    status: {
      type: String,
      required: true,
      enum: ['waiting', 'active', 'completed'],
      default: 'waiting',
    },
    winningSide: {
      type: String,
      enum: ['A', 'B'],
    },

    questionPoolA: [{
      type: Schema.Types.ObjectId,
      ref: 'Round2Question',
      required: true,
    }],
    questionPoolB: [{
      type: Schema.Types.ObjectId,
      ref: 'Round2Question',
      required: true,
    }],
    
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
      required: true,
      default: ROUND_A_DURATION,
    },
  },
  {
    timestamps: true,
  }
);

MatchSchema.index({ roundStage: 1, matchNumber: 1 }, { unique: true });
MatchSchema.index({ status: 1 });
MatchSchema.index({ roundStage: 1, status: 1 });
MatchSchema.index({ sideA_teamIds: 1 });
MatchSchema.index({ sideB_teamIds: 1 });

export const Match: Model<IMatch> =
  mongoose.models.Match ||
  mongoose.model<IMatch>('Match', MatchSchema);

export default Match;