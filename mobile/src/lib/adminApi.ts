import { api } from './api';

export interface AdminDashboard {
  today: { orders: number; newCooks: number; newRiders: number };
  attention: { pendingApprovals: number; openDisputes: number; openTickets: number; openReports: number };
  delivery: { activeDeliveries: number };
}

export interface AdminReports {
  openTickets: number;
  resolvedTickets: number;
  openDisputes: number;
  resolvedDisputes: number;
  refunds: number;
  cooksPending: number;
  cooksApproved: number;
}

export function fetchAdminDashboard() {
  return api<{ dashboard: AdminDashboard }>('/api/management/dashboard');
}

export function fetchAdminReports() {
  return api<{ reports: AdminReports }>('/api/management/reports');
}
