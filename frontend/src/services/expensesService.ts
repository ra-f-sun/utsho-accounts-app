import { api } from "../lib/axios";

export type Organization = "uac" | "mbcs" | "mec";
export type ExpenseType =
  | "rent"
  | "electricity"
  | "water"
  | "internet"
  | "salary"
  | "other";
export type PaymentMethod = "cash" | "bank" | "mobile";

export interface Expense {
  id: string;
  organization: Organization;
  expenseType: ExpenseType;
  amount: number;
  expenseMonth: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDto {
  expenseType: ExpenseType;
  amount: number;
  expenseMonth: string; // YYYY-MM-01
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
}

/** Build the base URL for a given org's expenses endpoint */
const orgBase = (org: Organization) => `/${org}/expenses`;

export const expensesService = {
  getAll: (
    org: Organization,
    expenseType?: string,
    expenseMonth?: string,
  ) => {
    const params = new URLSearchParams();
    if (expenseType) params.append("expenseType", expenseType);
    if (expenseMonth) params.append("expenseMonth", expenseMonth);
    return api.get<Expense[]>(`${orgBase(org)}?${params.toString()}`);
  },

  getOne: (org: Organization, id: string) => {
    return api.get<Expense>(`${orgBase(org)}/${id}`);
  },

  create: (org: Organization, data: CreateExpenseDto) => {
    return api.post<Expense>(orgBase(org), data);
  },

  update: (org: Organization, id: string, data: Partial<CreateExpenseDto>) => {
    return api.patch<Expense>(`${orgBase(org)}/${id}`, data);
  },

  delete: (org: Organization, id: string) => {
    return api.delete<Expense>(`${orgBase(org)}/${id}`);
  },
};
