import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

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
  // Dual invoice fields (Feature 6A)
  guardianAmount?: number;
  officeSubTotal?: number;
  guardianSubTotal?: number;
  additionalDiscount?: number;
  officeGrandTotal?: number;
  guardianGrandTotal?: number;
  officePaid?: number;
  guardianPaid?: number;
  dueAmount?: number;
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
  additionalDiscount?: number;
  dueAmount?: number;
}

export const mecPaymentsService = {
  getAll: (
    params?: { studentId?: string; paymentMonth?: string; paymentMethod?: string },
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<MecPayment>> => {
    const p = new URLSearchParams();
    if (params?.studentId) p.append("studentId", params.studentId);
    if (params?.paymentMonth) p.append("paymentMonth", params.paymentMonth);
    if (params?.paymentMethod) p.append("paymentMethod", params.paymentMethod);
    p.append("page", page.toString());
    p.append("limit", limit.toString());
    return apiGet(`/mec/payments?${p.toString()}`);
  },

  getOne: (id: string) => apiGet<MecPayment>(`/mec/payments/${id}`),

  getStudentSummary: (studentId: string) =>
    apiGet<{ studentId: string; totalPaid: number; paymentCount: number; payments: MecPayment[] }>(
      `/mec/payments/student/${studentId}/summary`,
    ),

  create: (data: CreateMecPaymentDto) => apiPost<MecPayment>("/mec/payments", data),

  createMulti: (data: CreateMecMultiPaymentDto) =>
    apiPost<{ invoiceNumber: string; payments: MecPayment[] }>(
      "/mec/payments/multi",
      data,
    ),

  getByInvoice: (invoiceNumber: string) =>
    apiGet<MecPayment[]>(`/mec/payments/invoice/${invoiceNumber}`),

  update: (id: string, data: Partial<CreateMecPaymentDto>) =>
    apiPatch<MecPayment>(`/mec/payments/${id}`, data),

  remove: (id: string) => apiDelete<MecPayment>(`/mec/payments/${id}`),
};
