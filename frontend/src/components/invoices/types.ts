/** Shared invoice data types for all org × entity invoice templates. */

export interface StudentInfo {
  name: string;
  class?: number;
  group?: string;
  shift?: string;
  branch?: string;
  contactNumber?: string;
  fatherName?: string;
  guardianName?: string;
}

/** One row in a multi-payment invoice. */
export interface PaymentLineItem {
  paymentType?: string; // undefined for MEC (tuition only)
  amount: number;
  paymentMonth: string;
  notes?: string;
}

/** Data contract for student payment invoices (UAC, MBCS, MEC). */
export interface StudentPaymentInvoiceData {
  invoiceNumber: string;
  /** Total amount — sum of all lineItems if present, else single amount. */
  amount: number;
  paymentDate: string;
  paymentMonth: string;
  paymentMethod: string;
  paymentType?: string;
  notes?: string;
  createdAt?: string;
  student?: StudentInfo;
  /** Present when the invoice has multiple line items. */
  lineItems?: PaymentLineItem[];
}


/** Data contract for teacher / staff payroll invoices. */
export interface PayrollInvoiceData {
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  paymentMonth: string;
  paymentMethod: string;
  notes?: string;
  createdAt?: string;
  /** "teacher" | "staff" */
  payableType?: string;
  /** Resolved name of the teacher or staff member */
  payableName?: string;
  /** Only for teacher payroll */
  totalLectures?: number;
}
