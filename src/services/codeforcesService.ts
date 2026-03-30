// ===========================================
// CODEFORCES API SERVICE
// ===========================================

import axios, { AxiosError } from 'axios';
import Bottleneck from 'bottleneck';
import { CF_API_BASE, CF_USER_STATUS_ENDPOINT } from '@/lib/constants';
import type { CFApiResponse, CFSubmission } from '@/types';

// Rate limiter for Codeforces API
// Codeforces allows ~2 requests per second

const cfLimiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 500,
    reservoir: 10,
    reservoirRefreshAmount: 10,
    reservoirRefreshInterval: 5000,
});

interface FetchSubmissionsResult {
    success: boolean;
    submissions?: CFSubmission[];
    error?: string;
}

/**
 * Fetches submissions for a Codeforces user
 * @param handle - Codeforces username
 * @param includeAll - If true, includes all verdicts (for penalties). If false, only OK submissions
 * @returns Array of submissions
 */
export async function fetchUserSubmissions(
    handle: string,
    includeAll: boolean = false
): Promise<FetchSubmissionsResult> {
    try {
        const url = `${CF_API_BASE}${CF_USER_STATUS_ENDPOINT}?handle=${encodeURIComponent(handle)}`;

        const response = await cfLimiter.schedule(() =>
            axios.get<CFApiResponse>(url, {
                timeout: 10000,
            })
        );

        if (response.data.status !== 'OK') {
            return {
                success: false,
                error: response.data.comment || 'Codeforces API error',
            };
        }

        const allSubmissions = response.data.result || [];
        
        const filteredSubmissions = includeAll 
            ? allSubmissions.filter((sub: CFSubmission) => {

                const finalVerdicts = ['OK', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 
                                      'COMPILATION_ERROR', 'MEMORY_LIMIT_EXCEEDED', 'IDLENESS_LIMIT_EXCEEDED',
                                      'SECURITY_VIOLATED', 'CRASHED', 'INPUT_PREPARATION_CRASHED',
                                      'CHALLENGED', 'SKIPPED', 'REJECTED'];
                return finalVerdicts.includes(sub.verdict);
              })
            : allSubmissions.filter((sub: CFSubmission) => sub.verdict === 'OK');

        return {
            success: true,
            submissions: filteredSubmissions,
        };
    } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 400) {
            return {
                success: false,
                error: `User "${handle}" not found on Codeforces`,
            };
        }

        if (axiosError.code === 'ECONNABORTED') {
            return {
                success: false,
                error: 'Codeforces API timeout - please try again',
            };
        }

        return {
            success: false,
            error: 'Failed to fetch from Codeforces API',
        };
    }
}

/**
 * Fetches submissions for multiple users and merges them
 * @param handles - Array of Codeforces usernames
 * @returns Combined array of accepted submissions from all users
 */
export async function fetchTeamSubmissions(
    handles: string[]
): Promise<FetchSubmissionsResult> {
    try {
        // Fetch all members' submissions in parallel
        const results = await Promise.all(
            handles.map((handle) => fetchUserSubmissions(handle))
        );

        // Check if any requests failed
        const errors = results.filter((r) => !r.success);
        if (errors.length === handles.length) {
            // All failed
            return {
                success: false,
                error: errors[0]?.error || 'Failed to fetch submissions',
            };
        }

        // Merge all submissions
        const allSubmissions: CFSubmission[] = [];
        for (const result of results) {
            if (result.success && result.submissions) {
                allSubmissions.push(...result.submissions);
            }
        }

        // Remove duplicates (same contest + problem index)
        const uniqueProblems = new Map<string, CFSubmission>();
        for (const sub of allSubmissions) {
            if (!sub?.problem?.contestId || !sub?.problem?.index) {
                console.warn('[Codeforces] Invalid submission data, skipping:', sub);
                continue;
            }

            const key = `${sub.problem.contestId}-${sub.problem.index.toUpperCase()}`;
            if (!uniqueProblems.has(key)) {
                uniqueProblems.set(key, sub);
            }
        }

        return {
            success: true,
            submissions: Array.from(uniqueProblems.values()),
        };
    } catch (error) {
        return {
            success: false,
            error: 'Unexpected error fetching team submissions',
        };
    }
}

/**
 * Checks if a problem has been solved
 * @param submissions - Array of accepted submissions
 * @param contestId - Contest ID to check
 * @param problemIndex - Problem index (letter) to check
 * @returns True if problem is solved
 */
export function isProblemSolved(
    submissions: CFSubmission[],
    contestId: number,
    problemIndex: string
): boolean {
    return submissions.some(
        (sub) =>
            String(sub.problem.contestId) === String(contestId) &&
            sub.problem.index.toUpperCase() === problemIndex.toUpperCase()
    );
}