import { api } from "../lib/axios";

export interface Teacher {
  id: string;
  name: string;
  contactNumber: string;
  paymentType: "fixed" | "lecture_based";
  monthlySalary?: number;
  perLectureRate?: number;
  subjects?: string;
  isActive: boolean;
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
  getAll: (filters?: FilterTeacherDto) => {
    const params = new URLSearchParams();
    if (filters?.paymentType) params.append("paymentType", filters.paymentType);
    if (filters?.search) params.append("search", filters.search);

    return api.get<{ success: boolean; data: Teacher[] }>(
      `/uac/teachers?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: Teacher }>(`/uac/teachers/${id}`);
  },

  create: (data: CreateTeacherDto) => {
    return api.post<{ success: boolean; data: Teacher }>("/uac/teachers", data);
  },

  update: (id: string, data: Partial<CreateTeacherDto>) => {
    return api.patch<{ success: boolean; data: Teacher }>(
      `/uac/teachers/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: Teacher }>(
      `/uac/teachers/${id}`,
    );
  },
};
