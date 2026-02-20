import { api } from "../lib/axios";

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
}

export interface CreatePayrollDto {
  payableType: string;
  payableId: string;
  paymentMonth: string; // ISO DateString (e.g., 2024-01-01T00:00:00.000Z)
  amount: number;
  totalLectures?: number;
  paymentDate: string; // ISO DateString
  paymentMethod: string; // 'cash' | 'bkash' | 'nagad' | 'bank_transfer'
  notes?: string;
}

export const payrollService = {
  getAll: (filters?: {
    payableType?: string;
    payableId?: string;
    paymentMonth?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.payableType) params.append("payableType", filters.payableType);
    if (filters?.payableId) params.append("payableId", filters.payableId);
    if (filters?.paymentMonth)
      params.append("paymentMonth", filters.paymentMonth);

    return api.get<{ success: boolean; data: Payroll[] }>(
      `/uac/payroll?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: Payroll }>(`/uac/payroll/${id}`);
  },

  calculateTeacherPayroll: (teacherId: string, month: string) => {
    // month format: YYYY-MM
    return api.get<{
      success: boolean;
      data: {
        teacherId: string;
        month: string;
        paymentType: string;
        amount: number;
        totalLectures: number | null;
      };
    }>(`/uac/payroll/calculate/teacher/${teacherId}/${month}`);
  },

  create: (data: CreatePayrollDto) => {
    return api.post<{ success: boolean; data: Payroll }>("/uac/payroll", data);
  },

  update: (id: string, data: Partial<CreatePayrollDto>) => {
    return api.patch<{ success: boolean; data: Payroll }>(
      `/uac/payroll/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: Payroll }>(
      `/uac/payroll/${id}`,
    );
  },
};
