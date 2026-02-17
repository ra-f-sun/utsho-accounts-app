import { api } from "../lib/axios";

export interface Expense {
  id: string;
  organizationId: string;
  expenseType: string;
  amount: number;
  paymentMethod: "cash" | "bkash" | "nagad" | "bank_transfer";
  description?: string;
  date: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDto {
  expenseType: string;
  amount: number;
  paymentMethod: "cash" | "bkash" | "nagad" | "bank_transfer";
  description?: string;
  date: string;
}

export const expensesService = {
  getAll: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);

    return api.get<{ success: boolean; data: Expense[] }>(
      `/expenses?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: Expense }>(`/expenses/${id}`);
  },

  getSummary: (month: string, year: number) => {
    return api.get<{
      success: boolean;
      data: {
        total: number;
        count: number;
        byType: Record<string, number>;
      };
    }>(`/expenses/summary?month=${month}&year=${year}`);
  },

  create: (data: CreateExpenseDto) => {
    return api.post<{ success: boolean; data: Expense }>("/expenses", data);
  },

  update: (id: string, data: Partial<CreateExpenseDto>) => {
    return api.patch<{ success: boolean; data: Expense }>(
      `/expenses/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: Expense }>(`/expenses/${id}`);
  },
};
