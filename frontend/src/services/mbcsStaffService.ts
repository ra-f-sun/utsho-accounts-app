import { api } from "../lib/axios";

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
  getAll: () => {
    return api.get<{ success: boolean; data: MbcsStaff[] }>("/mbcs/staff");
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: MbcsStaff }>(`/mbcs/staff/${id}`);
  },

  create: (data: CreateMbcsStaffDto) => {
    return api.post<{ success: boolean; data: MbcsStaff }>("/mbcs/staff", data);
  },

  update: (id: string, data: Partial<CreateMbcsStaffDto>) => {
    return api.patch<{ success: boolean; data: MbcsStaff }>(
      `/mbcs/staff/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: MbcsStaff }>(
      `/mbcs/staff/${id}`,
    );
  },
};
