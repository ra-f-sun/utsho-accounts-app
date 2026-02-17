import { api } from "../lib/axios";

export interface Payroll {
  id: string;
  teacherId?: string;
  staffId?: string;
  teacher?: {
    name: string;
    paymentType: string;
  };
  staff?: {
    name: string;
  };
  paymentType: "teacher" | "staff";
  amount: number;
  month: string;
  year: number;
  lectureCount?: number;
  invoiceNumber: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollDto {
  teacherId?: string;
  staffId?: string;
  paymentType: "teacher" | "staff";
  amount: number;
  month: string;
  year: number;
  lectureCount?: number;
}

export const payrollService = {
  getAll: (filters?: {
    month?: string;
    year?: number;
    paymentType?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.month) params.append("month", filters.month);
    if (filters?.year) params.append("year", filters.year.toString());
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);

    return api.get<{ success: boolean; data: Payroll[] }>(
      `/uac/payroll?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: Payroll }>(`/uac/payroll/${id}`);
  },

  calculateTeacherPayroll: (teacherId: string, month: string, year: number) => {
    return api.get<{
      success: boolean;
      data: {
        teacher: any;
        amount: number;
        lectureCount?: number;
        month: string;
        year: number;
      };
    }>(`/uac/payroll/calculate/${teacherId}?month=${month}&year=${year}`);
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
