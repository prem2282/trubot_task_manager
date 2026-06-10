const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** True when the UI is running locally (Vite dev server or localhost deploy). */
export function isLocalDev(): boolean {
  return import.meta.env.DEV || LOCAL_HOSTS.has(window.location.hostname);
}

export const MAILPIT_URL = 'http://localhost:8025';
