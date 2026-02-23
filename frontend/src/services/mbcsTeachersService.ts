import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export interface MbcsTeacher {
  id: string;
  name: string;
  contactNumber: string;
  paymentType: string;
  monthlySalary?: number;
  perLectureRate?: number;
  subjects?: { class: number; subject: string }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMbcsTeacherDto {
  name: string;
  contactNumber: string;
  paymentType: string;
  monthlySalary?: number;
  perLectureRate?: number;
  subjects?: { class: number; subject: string }[];
}

export const mbcsTeachersService = {
  getAll: (paymentType?: string, page = 1, limit = 20): Promise<PaginatedResponse<MbcsTeacher>> => {
    const params = new URLSearchParams();
    if (paymentType) params.append("paymentType", paymentType);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/mbcs/teachers?${params.toString()}`);
  },
  getOne: (id: string) => apiGet<MbcsTeacher>(`/mbcs/teachers/${id}`),
  create: (data: CreateMbcsTeacherDto) =>
    apiPost<MbcsTeacher>("/mbcs/teachers", data),
  update: (id: string, data: Partial<CreateMbcsTeacherDto>) =>
    apiPatch<MbcsTeacher>(`/mbcs/teachers/${id}`, data),
  delete: (id: string) => apiDelete<MbcsTeacher>(`/mbcs/teachers/${id}`),
};
