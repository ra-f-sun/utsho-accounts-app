import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export type PayrollOrg = "uac" | "mbcs";

export interface Payroll {
  id: string;
  payableType: string; // 'teacher' | 'staff'
  payableId: string;
  paymentMonth: string;
  amount: number;
  totalLectures?: number;
  paymentDate: string;
  paymentMethod: string;
  invoiceNumber: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  // Due fields
  paidAmount?: number;
  dueAmount?: number;
  isDueCollection?: boolean;
  parentPayrollId?: string;
}

export interface CreatePayrollDto {
  payableType: string;
  payableId: string;
  paymentMonth: string; // ISO DateString (e.g., 2024-01-01T00:00:00.000Z)
  amount: number;
  paidAmount?: number; // If not set, defaults to amount (full payment)
  totalLectures?: number;
  paymentDate: string; // ISO DateString
  paymentMethod: string;
  notes?: string;
}

export const payrollService = {
  getAll: (
    org: PayrollOrg,
    filters?: { payableType?: string; payableId?: string; paymentMonth?: string },
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Payroll>> => {
    const params = new URLSearchParams();
    if (filters?.payableType) params.append("payableType", filters.payableType);
    if (filters?.payableId) params.append("payableId", filters.payableId);
    if (filters?.paymentMonth) params.append("paymentMonth", filters.paymentMonth);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/${org}/payroll?${params.toString()}`);
  },
  getOne: (org: PayrollOrg, id: string) => apiGet<Payroll>(`/${org}/payroll/${id}`),
  calculateTeacherPayroll: (org: PayrollOrg, teacherId: string, month: string) =>
    apiGet<{ teacherId: string; month: string; paymentType: string; amount: number; totalLectures: number | null }>(
      `/${org}/payroll/calculate/teacher/${teacherId}/${month}`,
    ),
  create: (org: PayrollOrg, data: CreatePayrollDto) => apiPost<Payroll>(`/${org}/payroll`, data),
  update: (org: PayrollOrg, id: string, data: Partial<CreatePayrollDto>) =>
    apiPatch<Payroll>(`/${org}/payroll/${id}`, data),
  delete: (org: PayrollOrg, id: string) => apiDelete<Payroll>(`/${org}/payroll/${id}`),
  collectDue: (org: PayrollOrg, id: string, data: { paidAmount: number; paymentDate: string; paymentMethod: string; notes?: string }) =>
    apiPost<Payroll>(`/${org}/payroll/${id}/collect-due`, data),
};
