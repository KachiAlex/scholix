'use client';

const TOKEN_STORAGE_KEY = 'scholix:accessToken';

export function saveAccessToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}
