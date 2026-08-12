import { api } from './api';

export interface AdminDashboard {
  todayRevenueKobo: number;
  todayOrders: number;
  activeCooks: number;
  activeRiders: number;
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
