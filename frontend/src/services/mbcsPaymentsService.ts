import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export interface MbcsPayment {
  id: string;
  studentId: string;
  student?: {
    id: string;
    name: string;
    class: number;
    shift?: string;
    contactNumber: string;
  };
  // MBCS includes 'stationary' payment type
  paymentType: string;
  amount: number;
  paymentMethod: string;
  paymentMonth: string;
  paymentDate: string;
  invoiceNumber: string;
  notes?: string;
  createdBy?: string;
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

export interface CreateMbcsPaymentDto {
  studentId: string;
  paymentType: string;
  amount: number;
  paymentMethod: string;
  paymentMonth: string;
  paymentDate: string;
  notes?: string;
}

export interface MbcsPaymentLineItem {
  paymentType: string;
  amount: number;
  paymentMonth: string;
  notes?: string;
}

export interface CreateMbcsMultiPaymentDto {
  studentId: string;
  paymentDate: string;
  paymentMethod: string;
  lineItems: MbcsPaymentLineItem[];
  additionalDiscount?: number;
  dueAmount?: number;
}

export interface FilterMbcsPaymentDto {
  studentId?: string;
  paymentType?: string;
  paymentMonth?: string;
  paymentMethod?: string;
}

export const MBCS_PAYMENT_TYPES = [
  { value: "tuition", label: "Tuition" },
  { value: "admission", label: "Admission" },
  { value: "readmission", label: "Readmission" },
  { value: "exam", label: "Exam" },
  { value: "session_charge", label: "Session Charge" },
  { value: "study_materials", label: "Study Materials" },
  { value: "study_tour", label: "Study Tour" },
  { value: "stationary", label: "Stationary" }, // MBCS-specific
  { value: "other", label: "Other" },
];

export const mbcsPaymentsService = {
  getAll: (filters?: FilterMbcsPaymentDto, page = 1, limit = 20): Promise<PaginatedResponse<MbcsPayment>> => {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append("studentId", filters.studentId);
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);
    if (filters?.paymentMonth)
      params.append("paymentMonth", filters.paymentMonth);
    if (filters?.paymentMethod)
      params.append("paymentMethod", filters.paymentMethod);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/mbcs/payments?${params.toString()}`);
  },
  getOne: (id: string) => apiGet<MbcsPayment>(`/mbcs/payments/${id}`),
  getStudentSummary: (studentId: string) =>
    apiGet<{ studentId: string; totalPaid: number; paymentCount: number; payments: MbcsPayment[] }>(
      `/mbcs/payments/student/${studentId}/summary`,
    ),
  create: (data: CreateMbcsPaymentDto) =>
    apiPost<MbcsPayment>("/mbcs/payments", data),
  createMulti: (data: CreateMbcsMultiPaymentDto) =>
    apiPost<{ invoiceNumber: string; payments: MbcsPayment[] }>("/mbcs/payments/multi", data),
  getByInvoice: (invoiceNumber: string) =>
    apiGet<MbcsPayment[]>(`/mbcs/payments/invoice/${invoiceNumber}`),
  update: (id: string, data: Partial<CreateMbcsPaymentDto>) =>
    apiPatch<MbcsPayment>(`/mbcs/payments/${id}`, data),
  delete: (id: string) => apiDelete<MbcsPayment>(`/mbcs/payments/${id}`),
};
