import { api } from "../lib/axios";

export interface Staff {
  id: string;
  name: string;
  contactNumber: string;
  designation: string;
  monthlySalary: number;
  isActive: boolean;
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
  getAll: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);

    return api.get<{ success: boolean; data: Staff[] }>(
      `/uac/staff?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: Staff }>(`/uac/staff/${id}`);
  },

  create: (data: CreateStaffDto) => {
    return api.post<{ success: boolean; data: Staff }>("/uac/staff", data);
  },

  update: (id: string, data: Partial<CreateStaffDto>) => {
    return api.patch<{ success: boolean; data: Staff }>(
      `/uac/staff/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: Staff }>(`/uac/staff/${id}`);
  },
};
