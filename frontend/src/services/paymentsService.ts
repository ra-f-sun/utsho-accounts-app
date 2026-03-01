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
  // Due collection fields (Feature 6B)
  isDueCollection?: boolean;
  parentInvoiceNumber?: string;
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
  additionalDiscount?: number;
  dueAmount?: number;
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
  getDueProfile: (studentId: string) =>
    apiGet<{ studentId: string; profiles: DueProfile[] }>(
      `/uac/payments/student/${studentId}/due-profile`,
    ),
  collectDue: (data: CollectDueDto) =>
    apiPost<{ invoiceNumber: string; payments: Payment[]; remainingDue: number }>(
      "/uac/payments/collect-due",
      data,
    ),
  getDueSummary: (studentId: string) =>
    apiGet<DueSummary>(`/uac/payments/student/${studentId}/due-summary`),
};

export interface DueProfileItem {
  paymentType: string;
  originalAmount: number;
  paidSoFar: number;
  remainingDue: number;
}

export interface DueProfile {
  invoiceNumber: string;
  paymentDate: string;
  originalTotalDue: number;
  priorCollectedTotal: number;
  remainingDue: number;
  perItemDues: DueProfileItem[];
}

export interface CollectDueDto {
  parentInvoiceNumber: string;
  paidAmount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

export interface DueSummaryItem {
  due: number;
  status: 'due' | 'paid' | 'na';
}

export interface DueSummary {
  studentId: string;
  totalDue: number;
  breakdown: {
    tuition: DueSummaryItem;
    admission: DueSummaryItem;
    readmission: DueSummaryItem;
    others: DueSummaryItem;
  };
}
