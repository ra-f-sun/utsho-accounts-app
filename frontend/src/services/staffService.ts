import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export interface Staff {
  id: string;
  name: string;
  contactNumber: string;
  designation: string;
  monthlySalary: number;
  isActive: boolean;
  associationEndDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffDto {
  name: string;
  contactNumber: string;
  designation: string;
  monthlySalary: number;
}

export const staffService = {
  getAll: (search?: string, page = 1, limit = 20): Promise<PaginatedResponse<Staff>> => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/uac/staff?${params.toString()}`);
  },
  getOne: (id: string) => apiGet<Staff>(`/uac/staff/${id}`),
  create: (data: CreateStaffDto) => apiPost<Staff>("/uac/staff", data),
  update: (id: string, data: Partial<CreateStaffDto>) =>
    apiPatch<Staff>(`/uac/staff/${id}`, data),
  delete: (id: string) => apiDelete<Staff>(`/uac/staff/${id}`),
  disassociate: (id: string) => apiPatch<Staff>(`/uac/staff/${id}/disassociate`, {}),
  reassociate: (id: string) => apiPatch<Staff>(`/uac/staff/${id}/reassociate`, {}),
};
