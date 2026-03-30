import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Round1Session from '@/models/Round1Session';

/**
 * GET /api/round1/status
 * 
 * Returns the current status of Round 1:
 * - isActive: whether Round 1 is currently running
 * - startTime: when Round 1 started
 * - endTime: when Round 1 is scheduled to end
 * - duration: total duration in minutes
 * - timeRemaining: milliseconds remaining (if active)
 * - hasEnded: whether the time has expired
 */
export async function GET() {
  try {
    await connectDB();

    // Get or create the session
    let session = await Round1Session.findOne();
    
    if (!session) {
      // Create default session if it doesn't exist
      session = await Round1Session.create({
        isActive: false,
        startTime: null,
        endTime: null,
        duration: 60,
        autoStop: true,
      });
    }

    const now = new Date();
    let timeRemaining = 0;
    let hasEnded = false;

    if (session.isActive && session.startTime && session.endTime) {
      const endTime = new Date(session.endTime);
      timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
      hasEnded = now.getTime() >= endTime.getTime();

      // Auto-stop if time has expired and autoStop is enabled
      if (hasEnded && session.autoStop) {
        session.isActive = false;
        await session.save();
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        isActive: session.isActive,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        timeRemaining,
        hasEnded,
        autoStop: session.autoStop,
      },
    });
  } catch (error) {
    console.error('Error fetching Round 1 status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch Round 1 status',
      },
      { status: 500 }
    );
  }
}
