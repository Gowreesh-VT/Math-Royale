import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Match Interface
 * - Quarterfinals: 4 teams per side
 * - Semifinals: 2 teams per side
 * - Finals: 1 team per side
 */
export interface IMatch extends Document {
  roundNumber: number; // 1, 2, or 3

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
    roundNumber: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
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
      default: 50,
    },
    scoreB: {
      type: Number,
      required: true,
      default: 50,
    },
    
    // Status
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
      default: 2700,
    },
  },
  {
    timestamps: true,
  }
);

MatchSchema.index({ roundNumber: 1 }, { unique: true });
MatchSchema.index({ status: 1 });
MatchSchema.index({ sideA_teamIds: 1 });
MatchSchema.index({ sideB_teamIds: 1 });

export const Match: Model<IMatch> =
  mongoose.models.Match ||
  mongoose.model<IMatch>('Match', MatchSchema);

export default Match;
