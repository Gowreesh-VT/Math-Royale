import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Tracks each stage of Round 2 Tug of War
 */
export interface IRound2Round extends Document {
  roundNumber: number;
  roundName: string; // 'Quarterfinals' | 'Semifinals' | 'Finals'
  matchIds: Types.ObjectId[];
  status: 'pending' | 'active' | 'completed';
  duration: number;
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const Round2RoundSchema = new Schema<IRound2Round>(
  {
    roundNumber: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
      unique: true,
    },
    roundName: {
      type: String,
      required: true,
      enum: ['Quarterfinals', 'Semifinals', 'Finals'],
    },
    matchIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Match',
    }],
    status: {
      type: String,
      required: true,
      enum: ['pending', 'active', 'completed'],
      default: 'pending',
    },
    duration: {
      type: Number,
      required: true,
      default: 2700,
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

const Round2Stage: Model<IRound2Round> =
  mongoose.models.Round2Stage ||
  mongoose.model<IRound2Round>('Round2Stage', Round2RoundSchema, 'round2stages');

export default Round2Stage;
