import { api } from "../lib/axios";

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
  getAll: (filters?: FilterMbcsPaymentDto) => {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append("studentId", filters.studentId);
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);
    if (filters?.paymentMonth)
      params.append("paymentMonth", filters.paymentMonth);
    if (filters?.paymentMethod)
      params.append("paymentMethod", filters.paymentMethod);

    return api.get<{ success: boolean; data: MbcsPayment[] }>(
      `/mbcs/payments?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: MbcsPayment }>(
      `/mbcs/payments/${id}`,
    );
  },

  getStudentSummary: (studentId: string) => {
    return api.get<{
      success: boolean;
      data: {
        studentId: string;
        totalPaid: number;
        paymentCount: number;
        payments: MbcsPayment[];
      };
    }>(`/mbcs/payments/student/${studentId}/summary`);
  },

  create: (data: CreateMbcsPaymentDto) => {
    return api.post<{ success: boolean; data: MbcsPayment }>(
      "/mbcs/payments",
      data,
    );
  },

  createMulti: (data: CreateMbcsMultiPaymentDto) => {
    return api.post<{ success: boolean; data: { invoiceNumber: string; payments: MbcsPayment[] } }>(
      "/mbcs/payments/multi",
      data,
    );
  },

  getByInvoice: (invoiceNumber: string) => {
    return api.get<{ success: boolean; data: MbcsPayment[] }>(
      `/mbcs/payments/invoice/${invoiceNumber}`,
    );
  },

  update: (id: string, data: Partial<CreateMbcsPaymentDto>) => {
    return api.patch<{ success: boolean; data: MbcsPayment }>(
      `/mbcs/payments/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: MbcsPayment }>(
      `/mbcs/payments/${id}`,
    );
  },
};
