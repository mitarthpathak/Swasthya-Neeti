import { apiRequest, parseApiJson } from './api';
import type { User } from '../types';

export async function signInRequest(payload: {
  username: string;
  password: string;
}) {
  const response = await apiRequest('/api/auth/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseApiJson<{
    success?: boolean;
    error?: string;
    user?: User;
  }>(response);
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to sign in');
  }

  return data.user as User;
}

export async function signUpRequest(payload: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: string;
  gender: string;
}) {
  const response = await apiRequest('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseApiJson<{
    success?: boolean;
    error?: string;
    user?: User;
  }>(response);
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to create account');
  }

  return data.user as User;
}
