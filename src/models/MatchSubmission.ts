import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Match Submission Interface
 * Records every submission attempt during matches for scoring
 */
export interface IMatchSubmission extends Document {
  matchId: Types.ObjectId;
  side: 'A' | 'B';
  teamId: Types.ObjectId;
  codeforcesHandle: string;
  questionId: Types.ObjectId;
  contestId: string;
  problemIndex: string;
  submissionId: number;
  verdict: string;
  points: number;
  timestamp: Date;
  processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSubmissionSchema = new Schema<IMatchSubmission>(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    side: {
      type: String,
      required: true,
      enum: ['A', 'B'],
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    codeforcesHandle: {
      type: String,
      required: true,
      trim: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Round2Question',
      required: true,
    },
    contestId: {
      type: String,
      required: true,
    },
    problemIndex: {
      type: String,
      required: true,
    },
    submissionId: {
      type: Number,
      required: true,
      unique: true,
    },
    verdict: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    processed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


MatchSubmissionSchema.index({ matchId: 1, processed: 1 });
MatchSubmissionSchema.index({ matchId: 1, side: 1 });
MatchSubmissionSchema.index({ teamId: 1, timestamp: -1 });
MatchSubmissionSchema.index({ matchId: 1, questionId: 1, side: 1, verdict: 1 });

export const MatchSubmission: Model<IMatchSubmission> =
  mongoose.models.MatchSubmission ||
  mongoose.model<IMatchSubmission>('MatchSubmission', MatchSubmissionSchema);

export default MatchSubmission;
