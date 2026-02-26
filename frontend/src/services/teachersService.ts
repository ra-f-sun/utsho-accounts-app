import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export interface Teacher {
  id: string;
  name: string;
  contactNumber: string;
  paymentType: "fixed" | "lecture_based";
  monthlySalary?: number;
  perLectureRate?: number;
  subjects?: string;
  isActive: boolean;
  associationEndDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherDto {
  name: string;
  contactNumber: string;
  paymentType: "fixed" | "lecture_based";
  monthlySalary?: number;
  perLectureRate?: number;
  subjects?: string;
}

export interface FilterTeacherDto {
  paymentType?: "fixed" | "lecture_based";
  search?: string;
}

export const teachersService = {
  getAll: (filters?: FilterTeacherDto, page = 1, limit = 20): Promise<PaginatedResponse<Teacher>> => {
    const params = new URLSearchParams();
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);
    if (filters?.search) params.append("search", filters.search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/uac/teachers?${params.toString()}`);
  },
  getOne: (id: string) => apiGet<Teacher>(`/uac/teachers/${id}`),
  create: (data: CreateTeacherDto) => apiPost<Teacher>("/uac/teachers", data),
  update: (id: string, data: Partial<CreateTeacherDto>) =>
    apiPatch<Teacher>(`/uac/teachers/${id}`, data),
  delete: (id: string) => apiDelete<Teacher>(`/uac/teachers/${id}`),
  disassociate: (id: string) => apiPatch<Teacher>(`/uac/teachers/${id}/disassociate`, {}),
  reassociate: (id: string) => apiPatch<Teacher>(`/uac/teachers/${id}/reassociate`, {}),
};
