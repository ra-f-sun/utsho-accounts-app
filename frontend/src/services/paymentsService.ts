import { api } from "../lib/axios";

export interface Payment {
  id: string;
  studentId: string;
  student?: {
    name: string;
    class: number;
    contactNumber: string;
  };
  paymentType: "tuition" | "admission" | "exam" | "other";
  amount: number;
  paymentMethod: "cash" | "bkash" | "nagad" | "bank_transfer";
  invoiceNumber: string;
  month?: string;
  year?: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  studentId: string;
  paymentType: "tuition" | "admission" | "exam" | "other";
  amount: number;
  paymentMethod: "cash" | "bkash" | "nagad" | "bank_transfer";
  month?: string;
  year?: number;
  notes?: string;
}

export interface FilterPaymentDto {
  studentId?: string;
  paymentType?: string;
  month?: string;
  paymentMethod?: string;
}

export const paymentsService = {
  getAll: (filters?: FilterPaymentDto) => {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append("studentId", filters.studentId);
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);
    if (filters?.month) params.append("month", filters.month);
    if (filters?.paymentMethod)
      params.append("paymentMethod", filters.paymentMethod);

    return api.get<{ success: boolean; data: Payment[] }>(
      `/uac/payments?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: Payment }>(`/uac/payments/${id}`);
  },

  getStudentPayments: (studentId: string) => {
    return api.get<{
      success: boolean;
      data: {
        student: any;
        payments: Payment[];
        total: { amount: number; count: number };
      };
    }>(`/uac/payments/student/${studentId}/summary`);
  },

  create: (data: CreatePaymentDto) => {
    return api.post<{ success: boolean; data: Payment }>("/uac/payments", data);
  },

  update: (id: string, data: Partial<CreatePaymentDto>) => {
    return api.patch<{ success: boolean; data: Payment }>(
      `/uac/payments/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: Payment }>(
      `/uac/payments/${id}`,
    );
  },
};
