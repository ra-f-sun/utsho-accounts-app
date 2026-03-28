import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export type PaymentOrg = "uac" | "mbcs" | "mec";

export interface Payment {
  id: string;
  studentId: string;
  student?: {
    id: string;
    name: string;
    class?: number;       // optional — MEC nullable class
    group?: string;       // UAC only
    shift?: string;       // MBCS only
    contactNumber: string;
  };
  paymentType?: string;   // absent for MEC
  amount: number;
  paymentMethod: string;
  paymentMonth: string;
  paymentDate: string;
  invoiceNumber: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
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
  paymentType?: string;   // optional — MEC omits it
  amount: number;
  paymentMethod: string;
  paymentMonth: string;
  paymentDate: string;
  notes?: string;
}

export interface PaymentLineItem {
  paymentType?: string;   // optional — MEC omits it
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
  paymentType?: string;   // not used by MEC
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

export const MBCS_PAYMENT_TYPES = [
  { value: "tuition", label: "Tuition" },
  { value: "admission", label: "Admission" },
  { value: "readmission", label: "Readmission" },
  { value: "exam", label: "Exam" },
  { value: "session_charge", label: "Session Charge" },
  { value: "study_materials", label: "Study Materials" },
  { value: "study_tour", label: "Study Tour" },
  { value: "stationary", label: "Stationary" },
  { value: "other", label: "Other" },
];

export const PAYMENT_TYPES_BY_ORG = {
  uac: UAC_PAYMENT_TYPES,
  mbcs: MBCS_PAYMENT_TYPES,
  mec: [] as const,
} as const;

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
  status: "due" | "paid" | "na";
}

export interface DueSummary {
  studentId: string;
  totalDue: number;
  breakdown: {
    tuition: DueSummaryItem;
    admission?: DueSummaryItem;   // UAC/MBCS only
    readmission?: DueSummaryItem; // UAC/MBCS only
    others?: DueSummaryItem;      // UAC/MBCS only
  };
}

export const paymentsService = {
  getAll: (org: PaymentOrg, filters?: FilterPaymentDto, page = 1, limit = 20): Promise<PaginatedResponse<Payment>> => {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append("studentId", filters.studentId);
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);
    if (filters?.paymentMonth) params.append("paymentMonth", filters.paymentMonth);
    if (filters?.paymentMethod) params.append("paymentMethod", filters.paymentMethod);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/${org}/payments?${params.toString()}`);
  },
  getOne: (org: PaymentOrg, id: string) => apiGet<Payment>(`/${org}/payments/${id}`),
  getStudentSummary: (org: PaymentOrg, studentId: string) =>
    apiGet<{ studentId: string; totalPaid: number; paymentCount: number; payments: Payment[] }>(
      `/${org}/payments/student/${studentId}/summary`,
    ),
  create: (org: PaymentOrg, data: CreatePaymentDto) => apiPost<Payment>(`/${org}/payments`, data),
  createMulti: (org: PaymentOrg, data: CreateMultiPaymentDto) =>
    apiPost<{ invoiceNumber: string; payments: Payment[] }>(`/${org}/payments/multi`, data),
  getByInvoice: (org: PaymentOrg, invoiceNumber: string) =>
    apiGet<Payment[]>(`/${org}/payments/invoice/${invoiceNumber}`),
  update: (org: PaymentOrg, id: string, data: Partial<CreatePaymentDto>) =>
    apiPatch<Payment>(`/${org}/payments/${id}`, data),
  delete: (org: PaymentOrg, id: string) => apiDelete<Payment>(`/${org}/payments/${id}`),
  getDueProfile: (org: PaymentOrg, studentId: string) =>
    apiGet<{ studentId: string; profiles: DueProfile[] }>(
      `/${org}/payments/student/${studentId}/due-profile`,
    ),
  collectDue: (org: PaymentOrg, data: CollectDueDto) =>
    apiPost<{ invoiceNumber: string; payments: Payment[]; remainingDue: number }>(
      `/${org}/payments/collect-due`,
      data,
    ),
  getDueSummary: (org: PaymentOrg, studentId: string) =>
    apiGet<DueSummary>(`/${org}/payments/student/${studentId}/due-summary`),
};
