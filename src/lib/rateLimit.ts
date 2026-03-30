import RateLimit from "@/models/MongoDB-RateLimit";

// ===========================================
// RATE LIMITING UTILITY (MongoDB + TTL)
// Uses atomic operations to prevent race conditions
// ===========================================

/**
 * MongoDB-backed rate limiter with TTL
 * Uses atomic operations to prevent TOCTOU race conditions
 * @param identifier - Unique identifier (IP address or teamId)
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60000
): Promise<{ limited: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const expiresAt = new Date(now + windowMs);

  // Atomic operation: Try to increment counter for existing valid record
  const existingRecord = await RateLimit.findOneAndUpdate(
    {
      key: identifier,
      expiresAt: { $gt: new Date(now) } // Only match non-expired records
    },
    {
      $inc: { count: 1 } // Atomic increment
    },
    {
      new: true // Return the updated document
    }
  );

  // If we found and updated an existing record
  if (existingRecord) {
    const isLimited = existingRecord.count > limit;
    return {
      limited: isLimited,
      remaining: isLimited ? 0 : Math.max(0, limit - existingRecord.count),
      resetTime: existingRecord.expiresAt.getTime(),
    };
  }

  // No valid record exists - create new one atomically
  // Use upsert with $setOnInsert to handle race condition on creation
  const newRecord = await RateLimit.findOneAndUpdate(
    { key: identifier },
    {
      $setOnInsert: {
        key: identifier,
      },
      $set: {
        count: 1,
        expiresAt, // Set expiry for both new and expired records
      },
    },
    {
      upsert: true,
      new: true
    }
  );

  return {
    limited: false,
    remaining: limit - 1,
    resetTime: newRecord.expiresAt.getTime(),
  };
}

