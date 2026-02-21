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

  update: (id: string, data: Partial<CreateMecPaymentDto>) =>
    api.patch(`/mec/payments/${id}`, data),

  remove: (id: string) => api.delete(`/mec/payments/${id}`),
};
