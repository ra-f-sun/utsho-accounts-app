import { api } from "../lib/axios";

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
}

export interface CreateMbcsPayrollDto {
  payableType: string;
  payableId: string;
  paymentMonth: string;
  amount: number;
  totalLectures?: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

export const mbcsPayrollService = {
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

    return api.get<{ success: boolean; data: MbcsPayroll[] }>(
      `/mbcs/payroll?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: MbcsPayroll }>(
      `/mbcs/payroll/${id}`,
    );
  },

  calculateTeacherPayroll: (teacherId: string, month: string) => {
    return api.get<{
      success: boolean;
      data: {
        teacherId: string;
        month: string;
        paymentType: string;
        amount: number;
        totalLectures: number | null;
      };
    }>(`/mbcs/payroll/calculate/teacher/${teacherId}/${month}`);
  },

  create: (data: CreateMbcsPayrollDto) => {
    return api.post<{ success: boolean; data: MbcsPayroll }>(
      "/mbcs/payroll",
      data,
    );
  },

  update: (id: string, data: Partial<CreateMbcsPayrollDto>) => {
    return api.patch<{ success: boolean; data: MbcsPayroll }>(
      `/mbcs/payroll/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: MbcsPayroll }>(
      `/mbcs/payroll/${id}`,
    );
  },
};
