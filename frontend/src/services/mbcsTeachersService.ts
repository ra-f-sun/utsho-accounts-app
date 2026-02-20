import { api } from "../lib/axios";

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
  getAll: (paymentType?: string) => {
    const params = new URLSearchParams();
    if (paymentType) params.append("paymentType", paymentType);
    return api.get<{ success: boolean; data: MbcsTeacher[] }>(
      `/mbcs/teachers?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: MbcsTeacher }>(
      `/mbcs/teachers/${id}`,
    );
  },

  create: (data: CreateMbcsTeacherDto) => {
    return api.post<{ success: boolean; data: MbcsTeacher }>(
      "/mbcs/teachers",
      data,
    );
  },

  update: (id: string, data: Partial<CreateMbcsTeacherDto>) => {
    return api.patch<{ success: boolean; data: MbcsTeacher }>(
      `/mbcs/teachers/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: MbcsTeacher }>(
      `/mbcs/teachers/${id}`,
    );
  },
};
