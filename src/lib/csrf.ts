// ===========================================
// CSRF PROTECTION UTILITY
// Client-side utility for CSRF token handling
// ===========================================

/**
 * Get the CSRF token from cookies
 * This token must be sent as X-CSRF-Token header with POST requests
 */
export function getCSRFToken(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf-token') {
            return decodeURIComponent(value);
        }
    }
    return null;
}

/**
 * Create fetch options with CSRF token header
 * Use this for all POST/PUT/DELETE requests to protected endpoints
 */
export function withCSRF(options: RequestInit = {}): RequestInit {
    const csrfToken = getCSRFToken();

    return {
        ...options,
        headers: {
            ...options.headers,
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
    };
}

/**
 * Secure fetch wrapper that automatically includes CSRF token
 * Use this instead of fetch() for state-changing requests
 */
export async function secureFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const method = options.method?.toUpperCase() || 'GET';

    // Add CSRF token for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        options = withCSRF(options);
    }

    return fetch(url, options);
}

/**
 * Hook-friendly CSRF token getter
 * Returns null on server, token on client
 */
export function useCSRFToken(): string | null {
    if (typeof window === 'undefined') return null;
    return getCSRFToken();
}
