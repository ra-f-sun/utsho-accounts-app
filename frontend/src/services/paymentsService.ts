import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

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

export interface PaymentLineItem {
  paymentType: string;
  amount: number;
  paymentMonth: string;
  notes?: string;
}

export interface CreateMultiPaymentDto {
  studentId: string;
  paymentDate: string;
  paymentMethod: string;
  lineItems: PaymentLineItem[];
}

export interface FilterPaymentDto {
  studentId?: string;
  paymentType?: string;
  paymentMonth?: string;
  paymentMethod?: string;
}

export const UAC_PAYMENT_TYPES = [
  { value: "tuition", label: "Tuition Fee" },
  { value: "admission", label: "Admission Fee" },
  { value: "readmission", label: "Re-admission Fee" },
  { value: "exam", label: "Exam Fee" },
  { value: "sheet", label: "Sheet Fee" },
  { value: "session_charge", label: "Session Charge" },
  { value: "study_materials", label: "Study Materials" },
  { value: "study_tour", label: "Study Tour" },
  { value: "other", label: "Other" },
];

export const paymentsService = {
  getAll: (filters?: FilterPaymentDto, page = 1, limit = 20): Promise<PaginatedResponse<Payment>> => {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append("studentId", filters.studentId);
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);
    if (filters?.paymentMonth)
      params.append("paymentMonth", filters.paymentMonth);
    if (filters?.paymentMethod)
      params.append("paymentMethod", filters.paymentMethod);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/uac/payments?${params.toString()}`);
  },
  getOne: (id: string) => apiGet<Payment>(`/uac/payments/${id}`),
  getStudentSummary: (studentId: string) =>
    apiGet<{ studentId: string; totalPaid: number; paymentCount: number; payments: Payment[] }>(
      `/uac/payments/student/${studentId}/summary`,
    ),
  create: (data: CreatePaymentDto) => apiPost<Payment>("/uac/payments", data),
  createMulti: (data: CreateMultiPaymentDto) =>
    apiPost<{ invoiceNumber: string; payments: Payment[] }>("/uac/payments/multi", data),
  getByInvoice: (invoiceNumber: string) =>
    apiGet<Payment[]>(`/uac/payments/invoice/${invoiceNumber}`),
  update: (id: string, data: Partial<CreatePaymentDto>) =>
    apiPatch<Payment>(`/uac/payments/${id}`, data),
  delete: (id: string) => apiDelete<Payment>(`/uac/payments/${id}`),
};
