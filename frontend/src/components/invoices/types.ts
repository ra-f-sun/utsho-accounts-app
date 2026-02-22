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

/** Data contract for student payment invoices (UAC, MBCS, MEC). */
export interface StudentPaymentInvoiceData {
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  paymentMonth: string;
  paymentMethod: string;
  paymentType?: string;
  notes?: string;
  createdAt?: string;
  student?: StudentInfo;
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
