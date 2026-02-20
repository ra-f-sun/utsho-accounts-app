import { api } from "../lib/axios";

export interface MbcsStudent {
  id: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  class: number;
  shift?: string; // 'morning' | 'day'
  section?: string;
  branch?: string; // replaces 'school'
  serialNo?: string;
  nationality?: string;
  religion?: string;
  bloodGroup?: string;
  healthCondition?: string;
  presentAddress?: string;
  studentLivingWith?: string;
  lastSchoolAttended?: string;
  fatherName?: string;
  fatherMobile?: string;
  fatherOccupation?: string;
  fatherEmail?: string;
  motherName?: string;
  motherMobile?: string;
  motherOccupation?: string;
  motherEmail?: string;
  guardianName: string;
  contactNumber: string;
  monthlyTuitionFee: number;
  admissionFee?: number;
  admissionDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMbcsStudentDto {
  name: string;
  gender: string;
  dateOfBirth: string;
  class: number;
  shift?: string;
  section?: string;
  branch?: string;
  serialNo?: string;
  nationality?: string;
  religion?: string;
  bloodGroup?: string;
  healthCondition?: string;
  presentAddress?: string;
  studentLivingWith?: string;
  lastSchoolAttended?: string;
  fatherName?: string;
  fatherMobile?: string;
  fatherOccupation?: string;
  fatherEmail?: string;
  motherName?: string;
  motherMobile?: string;
  motherOccupation?: string;
  motherEmail?: string;
  guardianName: string;
  contactNumber: string;
  monthlyTuitionFee: number;
  admissionFee?: number;
  admissionDate?: string;
}

export interface FilterMbcsStudentDto {
  class?: number;
  shift?: string;
  branch?: string;
  search?: string;
}

export const mbcsStudentsService = {
  getAll: (filters?: FilterMbcsStudentDto) => {
    const params = new URLSearchParams();
    if (filters?.class) params.append("class", filters.class.toString());
    if (filters?.shift) params.append("shift", filters.shift);
    if (filters?.branch) params.append("branch", filters.branch);
    if (filters?.search) params.append("search", filters.search);

    return api.get<{ success: boolean; data: MbcsStudent[] }>(
      `/mbcs/students?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: MbcsStudent }>(
      `/mbcs/students/${id}`,
    );
  },

  create: (data: CreateMbcsStudentDto) => {
    return api.post<{ success: boolean; data: MbcsStudent }>(
      "/mbcs/students",
      data,
    );
  },

  update: (id: string, data: Partial<CreateMbcsStudentDto>) => {
    return api.patch<{ success: boolean; data: MbcsStudent }>(
      `/mbcs/students/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: MbcsStudent }>(
      `/mbcs/students/${id}`,
    );
  },
};
