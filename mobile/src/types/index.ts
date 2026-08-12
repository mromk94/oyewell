export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: string;
  roles?: string[];
  balanceKobo: number;
}

export interface ApiError {
  error?: string;
  message?: string;
}
