import { api } from "../lib/axios";

export interface Student {
  id: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  class: number;
  group?: string;
  section?: string;
  school?: string;
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

export interface CreateStudentDto {
  name: string;
  gender: string;
  dateOfBirth: string;
  class: number;
  group?: string;
  section?: string;
  school?: string;
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
}

export interface FilterStudentDto {
  class?: number;
  group?: string;
  school?: string;
  search?: string;
}

export const studentsService = {
  getAll: (filters?: FilterStudentDto) => {
    const params = new URLSearchParams();
    if (filters?.class) params.append("class", filters.class.toString());
    if (filters?.group) params.append("group", filters.group);
    if (filters?.school) params.append("school", filters.school);
    if (filters?.search) params.append("search", filters.search);

    return api.get<{ success: boolean; data: Student[] }>(
      `/uac/students?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: Student }>(`/uac/students/${id}`);
  },

  create: (data: CreateStudentDto) => {
    return api.post<{ success: boolean; data: Student }>("/uac/students", data);
  },

  update: (id: string, data: Partial<CreateStudentDto>) => {
    return api.patch<{ success: boolean; data: Student }>(
      `/uac/students/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete<{ success: boolean; data: Student }>(
      `/uac/students/${id}`,
    );
  },
};
