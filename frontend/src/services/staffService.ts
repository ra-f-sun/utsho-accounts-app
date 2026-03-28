import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export type StaffOrg = "uac" | "mbcs";

export interface Staff {
  id: string;
  name: string;
  contactNumber: string;
  designation?: string;
  monthlySalary: number;
  isActive: boolean;
  associationEndDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffDto {
  name: string;
  contactNumber: string;
  designation?: string;
  monthlySalary: number;
}

export const staffService = {
  getAll: (org: StaffOrg, search?: string, page = 1, limit = 20): Promise<PaginatedResponse<Staff>> => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/${org}/staff?${params.toString()}`);
  },
  getOne: (org: StaffOrg, id: string) => apiGet<Staff>(`/${org}/staff/${id}`),
  create: (org: StaffOrg, data: CreateStaffDto) => apiPost<Staff>(`/${org}/staff`, data),
  update: (org: StaffOrg, id: string, data: Partial<CreateStaffDto>) =>
    apiPatch<Staff>(`/${org}/staff/${id}`, data),
  delete: (org: StaffOrg, id: string) => apiDelete<Staff>(`/${org}/staff/${id}`),
  disassociate: (org: StaffOrg, id: string) => apiPatch<Staff>(`/${org}/staff/${id}/disassociate`, {}),
  reassociate: (org: StaffOrg, id: string) => apiPatch<Staff>(`/${org}/staff/${id}/reassociate`, {}),
};
