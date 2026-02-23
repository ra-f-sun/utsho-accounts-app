import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export interface MbcsStaff {
  id: string;
  name: string;
  contactNumber: string;
  designation?: string;
  monthlySalary: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMbcsStaffDto {
  name: string;
  contactNumber: string;
  designation?: string;
  monthlySalary: number;
}

export const mbcsStaffService = {
  getAll: (page = 1, limit = 20): Promise<PaginatedResponse<MbcsStaff>> =>
    apiGet(`/mbcs/staff?page=${page}&limit=${limit}`),

  getOne: (id: string) => apiGet<MbcsStaff>(`/mbcs/staff/${id}`),
  create: (data: CreateMbcsStaffDto) => apiPost<MbcsStaff>("/mbcs/staff", data),
  update: (id: string, data: Partial<CreateMbcsStaffDto>) =>
    apiPatch<MbcsStaff>(`/mbcs/staff/${id}`, data),
  delete: (id: string) => apiDelete<MbcsStaff>(`/mbcs/staff/${id}`),
};
