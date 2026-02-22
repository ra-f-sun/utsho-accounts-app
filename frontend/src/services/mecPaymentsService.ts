import { api } from "../lib/axios";

export interface MecPayment {
  id: string;
  studentId: string;
  student?: {
    id: string;
    name: string;
    class?: number;
    contactNumber: string;
  };
  amount: number;
  paymentMonth: string;
  paymentDate: string;
  paymentMethod: string;
  invoiceNumber: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateMecPaymentDto {
  studentId: string;
  amount: number;
  paymentMonth: string;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

export interface MecPaymentLineItem {
  amount: number;
  paymentMonth: string;
  notes?: string;
}

export interface CreateMecMultiPaymentDto {
  studentId: string;
  paymentDate: string;
  paymentMethod: string;
  lineItems: MecPaymentLineItem[];
}

export const mecPaymentsService = {
  getAll: (params?: {
    studentId?: string;
    paymentMonth?: string;
    paymentMethod?: string;
  }) => api.get("/mec/payments", { params }),

  getOne: (id: string) => api.get(`/mec/payments/${id}`),

  getStudentSummary: (studentId: string) =>
    api.get(`/mec/payments/student/${studentId}/summary`),

  create: (data: CreateMecPaymentDto) => api.post("/mec/payments", data),

  createMulti: (data: CreateMecMultiPaymentDto) =>
    api.post<{ success: boolean; data: { invoiceNumber: string; payments: MecPayment[] } }>(
      "/mec/payments/multi",
      data,
    ),

  getByInvoice: (invoiceNumber: string) =>
    api.get<{ success: boolean; data: MecPayment[] }>(
      `/mec/payments/invoice/${invoiceNumber}`,
    ),

  update: (id: string, data: Partial<CreateMecPaymentDto>) =>
    api.patch(`/mec/payments/${id}`, data),

  remove: (id: string) => api.delete(`/mec/payments/${id}`),
};
