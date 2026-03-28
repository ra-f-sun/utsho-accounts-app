import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export type TeacherOrg = "uac" | "mbcs";

export interface Teacher {
  id: string;
  name: string;
  contactNumber: string;
  paymentType: string;
  monthlySalary?: number;
  perLectureRate?: number;
  subjects?: string | { class: number; subject: string }[];
  isActive: boolean;
  associationEndDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherDto {
  name: string;
  contactNumber: string;
  paymentType: string;
  monthlySalary?: number;
  perLectureRate?: number;
  subjects?: string | { class: number; subject: string }[];
}

export interface FilterTeacherDto {
  paymentType?: string;
  search?: string;
}

export const teachersService = {
  getAll: (org: TeacherOrg, filters?: FilterTeacherDto, page = 1, limit = 20): Promise<PaginatedResponse<Teacher>> => {
    const params = new URLSearchParams();
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);
    if (filters?.search) params.append("search", filters.search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/${org}/teachers?${params.toString()}`);
  },
  getOne: (org: TeacherOrg, id: string) => apiGet<Teacher>(`/${org}/teachers/${id}`),
  create: (org: TeacherOrg, data: CreateTeacherDto) => apiPost<Teacher>(`/${org}/teachers`, data),
  update: (org: TeacherOrg, id: string, data: Partial<CreateTeacherDto>) =>
    apiPatch<Teacher>(`/${org}/teachers/${id}`, data),
  delete: (org: TeacherOrg, id: string) => apiDelete<Teacher>(`/${org}/teachers/${id}`),
  disassociate: (org: TeacherOrg, id: string) => apiPatch<Teacher>(`/${org}/teachers/${id}/disassociate`, {}),
  reassociate: (org: TeacherOrg, id: string) => apiPatch<Teacher>(`/${org}/teachers/${id}/reassociate`, {}),
};
