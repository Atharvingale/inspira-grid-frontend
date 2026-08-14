import { auth } from './firebase';

// Updated to use Next.js API routes instead of Express backend
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Returns a promise that resolves once Firebase Auth has finished restoring
 * its persisted state (from IndexedDB / localStorage on page load).
 *
 * Uses auth.authStateReady() when available (Firebase 10.14+), otherwise falls
 * back to a one-shot onAuthStateChanged listener to avoid a race condition where
 * API calls fire before the SDK has re-hydrated the current user from persistence.
 */
async function waitForAuthReady(): Promise<void> {
  // auth.authStateReady() is available in Firebase 10.14+ but not in the
  // type definitions yet — use a safe runtime call via a cast.
  const authInstance = auth as unknown as { authStateReady?: () => Promise<void> };
  if (typeof authInstance.authStateReady === 'function') {
    return authInstance.authStateReady();
  }

  // Fallback: wait for the first onAuthStateChanged emission (covers both
  // signed-in and signed-out states).
  return new Promise<void>((resolve) => {
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
  });
}

/**
 * Generic API function for making requests to the Next.js API routes.
 * Automatically includes Firebase ID token for authenticated requests.
 *
 * Waits for Firebase Auth to finish resolving its persisted state before
 * attempting to get a token — this prevents 401s on page load where the
 * SDK hasn't yet restored the session from IndexedDB/localStorage.
 */
export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  // Wait for Firebase to resolve the persisted auth state before reading currentUser.
  await waitForAuthReady();

  const user = auth.currentUser;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };

  // Add Firebase ID token if user is authenticated.
  // We do NOT force-refresh (getIdToken(true)) on every call — Firebase handles
  // token expiry automatically and refreshes when needed. Forcing a refresh on
  // every request wastes a round-trip and can cause auth quota issues.
  if (user) {
    try {
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } catch (error) {
      console.error('Failed to get Firebase ID token:', error);
      throw new Error('Authentication failed. Please try logging in again.');
    }
  }

  const requestInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetch(url, requestInit);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  } catch (error) {
    // Suppress logging for expected 404 on GitHub profile endpoint (user hasn't connected GitHub yet)
    const isExpectedGitHubError =
      path === '/github/profile' && (error as Error).message?.includes('404');

    if (!isExpectedGitHubError) {
      console.error('API request error:', error);
    }

    throw error;
  }
}

/**
 * Helper function to get auth headers for the current user.
 * Used by components that need to make authenticated requests directly.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  await waitForAuthReady();

  const user = auth.currentUser;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (user) {
    try {
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } catch (error) {
      console.error('Failed to get Firebase ID token:', error);
      throw new Error('Authentication failed. Please try logging in again.');
    }
  } else {
    console.warn('No authenticated user found when getting auth headers');
  }

  return headers;
}

/**
 * Convenience API object with common HTTP methods.
 */
export const apiClient = {
  async get<T = unknown>(path: string): Promise<T> {
    const response = await api(path, { method: 'GET' });
    return response.json();
  },

  async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    const response = await api(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  },

  async put<T = unknown>(path: string, data?: unknown): Promise<T> {
    const response = await api(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  },

  async patch<T = unknown>(path: string, data?: unknown): Promise<T> {
    const response = await api(path, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  },

  async delete<T = unknown>(path: string): Promise<T> {
    const response = await api(path, { method: 'DELETE' });
    return response.json();
  },
};
