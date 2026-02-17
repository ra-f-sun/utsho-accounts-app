import { api } from "../lib/axios";

export interface Payment {
  id: string;
  studentId: string;
  student?: {
    id: string;
    name: string;
    class: number;
    group?: string;
    contactNumber: string;
  };
  paymentType: string;
  amount: number;
  paymentMethod: string;
  paymentMonth: string;
  paymentDate: string;
  invoiceNumber: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  studentId: string;
  paymentType: string;
  amount: number;
  paymentMethod: string;
  paymentMonth: string;
  paymentDate: string;
  notes?: string;
}

export interface FilterPaymentDto {
  studentId?: string;
  paymentType?: string;
  paymentMonth?: string;
  paymentMethod?: string;
}

export const paymentsService = {
  getAll: (filters?: FilterPaymentDto) => {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append("studentId", filters.studentId);
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);
    if (filters?.paymentMonth)
      params.append("paymentMonth", filters.paymentMonth);
    if (filters?.paymentMethod)
      params.append("paymentMethod", filters.paymentMethod);

    return api.get<{ success: boolean; data: Payment[] }>(
      `/uac/payments?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: Payment }>(`/uac/payments/${id}`);
  },

  getStudentSummary: (studentId: string) => {
    return api.get<{
      success: boolean;
      data: {
        studentId: string;
        totalPaid: number;
        paymentCount: number;
        payments: Payment[];
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
