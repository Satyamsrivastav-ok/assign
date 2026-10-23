import { Platform } from 'react-native';

const configuredBase =
  Platform.OS === 'web'
    ? process.env.EXPO_PUBLIC_API_URL_WEB ?? 'https://assign-8by4.onrender.com'
    : process.env.EXPO_PUBLIC_API_URL ??
      (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
const BASE = configuredBase.replace(/\/+$/, '');

let token: string | null = null;
export const setToken = (t: string | null) => (token = t);

export interface Loan {
  id: number;
  friendName: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'repaid';
  overdue: boolean;
}
export interface Summary {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export const api = {
  requestOtp: (phone: string) => request<{ message: string }>('/auth/request-otp', 'POST', { phone }),
  verifyOtp: (phone: string, otp: string) => request<{ token: string }>('/auth/verify-otp', 'POST', { phone, otp }),
  getLoans: () => request<{ loans: Loan[]; summary: Summary }>('/loans'),
  addLoan: (friendName: string, amount: number, dueDate: string) =>
    request<Loan>('/loans', 'POST', { friendName, amount, dueDate }),
  repay: (id: number) => request<Loan>(`/loans/${id}/repay`, 'PATCH'),
};
