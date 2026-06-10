import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
const ACCESS_TOKEN_KEY = 'taskManager.accessToken';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000,
});

let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);
let onTokenRefreshed: (() => void) | null = null;

export function setOnTokenRefreshed(handler: (() => void) | null) {
  onTokenRefreshed = handler;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getAccessToken() {
  return accessToken;
}

export function loadStoredAccessToken(): string | null {
  accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (!accessToken) {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(({ data }) => {
        const token = data.data?.accessToken as string | undefined;
        if (token) {
          setAccessToken(token);
          onTokenRefreshed?.();
          return token;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = original?.url ?? '';
    const skipRefresh =
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/verify-email') ||
      url.includes('/auth/resend-verification') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password') ||
      url.includes('/invites/');

    if (error.response?.status === 401 && original && !original._retry && !skipRefresh) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);
