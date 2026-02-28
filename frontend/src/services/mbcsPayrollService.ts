import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export interface MbcsPayroll {
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
  // Due fields (Feature 6F)
  paidAmount?: number;
  dueAmount?: number;
  isDueCollection?: boolean;
  parentPayrollId?: string;
}

export interface CreateMbcsPayrollDto {
  payableType: string;
  payableId: string;
  paymentMonth: string;
  amount: number;
  paidAmount?: number; // If not set, defaults to amount (full payment)
  totalLectures?: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

export const mbcsPayrollService = {
  getAll: (
    filters?: { payableType?: string; payableId?: string; paymentMonth?: string },
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<MbcsPayroll>> => {
    const params = new URLSearchParams();
    if (filters?.payableType) params.append("payableType", filters.payableType);
    if (filters?.payableId) params.append("payableId", filters.payableId);
    if (filters?.paymentMonth)
      params.append("paymentMonth", filters.paymentMonth);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/mbcs/payroll?${params.toString()}`);
  },
  getOne: (id: string) => apiGet<MbcsPayroll>(`/mbcs/payroll/${id}`),
  calculateTeacherPayroll: (teacherId: string, month: string) =>
    apiGet<{ teacherId: string; month: string; paymentType: string; amount: number; totalLectures: number | null }>(
      `/mbcs/payroll/calculate/teacher/${teacherId}/${month}`,
    ),
  create: (data: CreateMbcsPayrollDto) =>
    apiPost<MbcsPayroll>("/mbcs/payroll", data),
  update: (id: string, data: Partial<CreateMbcsPayrollDto>) =>
    apiPatch<MbcsPayroll>(`/mbcs/payroll/${id}`, data),
  delete: (id: string) => apiDelete<MbcsPayroll>(`/mbcs/payroll/${id}`),
  collectDue: (id: string, data: { paidAmount: number; paymentDate: string; paymentMethod: string; notes?: string }) =>
    apiPost<MbcsPayroll>(`/mbcs/payroll/${id}/collect-due`, data),
};
