// authSession.ts — chartreview-native-frontend
// Updated: 2026-09-12 — Silent Cognito session refresh.
// Problem: the app used the idToken captured once at login. The Cognito SDK only
// mints a fresh ID token when cognitoUser.getSession() is called, and nothing
// ever called it — so after the ID token TTL (default 60 min) every authenticated
// call 401'd until the user logged in again. Long summary edits silently died on save.
// Fix: refresh via the SDK (uses the ~30-day refresh token) before every API call,
// with a safe fallback to the last stored token if the SDK is unavailable.

export function readStoredToken(fallback?: string): string {
  try {
    const key = Object.keys(localStorage).find((k) => k.includes('.idToken'));
    if (key) return localStorage.getItem(key) || fallback || '';
  } catch (e) { /* localStorage unavailable */ }
  return fallback || '';
}

export function getSessionToken(cognitoUser: any, fallback?: string): Promise<string> {
  return new Promise((resolve: (t: string) => void) => {
    if (!cognitoUser || typeof cognitoUser.getSession !== 'function') {
      resolve(readStoredToken(fallback));
      return;
    }
    try {
      cognitoUser.getSession((err: any, session: any) => {
        if (err || !session || typeof session.getIdToken !== 'function') {
          resolve(readStoredToken(fallback));
          return;
        }
        const jwt: string = session.getIdToken().getJwtToken();
        resolve(jwt || readStoredToken(fallback));
      });
    } catch (e) {
      resolve(readStoredToken(fallback));
    }
  });
}
