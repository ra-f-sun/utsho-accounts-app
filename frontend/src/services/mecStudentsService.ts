import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export interface MecStudent {
  id: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  class?: number;
  group?: string;
  section?: string;
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
}

export interface CreateMecStudentDto {
  name: string;
  gender: string;
  dateOfBirth: string;
  guardianName: string;
  contactNumber: string;
  monthlyTuitionFee: number;
  class?: number;
  group?: string;
  section?: string;
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
  admissionFee?: number;
  admissionDate?: string;
}

export const mecStudentsService = {
  getAll: (params?: { class?: number; search?: string }, page = 1, limit = 20): Promise<PaginatedResponse<MecStudent>> => {
    const p = new URLSearchParams();
    if (params?.class) p.append("class", params.class.toString());
    if (params?.search) p.append("search", params.search);
    p.append("page", page.toString());
    p.append("limit", limit.toString());
    return apiGet(`/mec/students?${p.toString()}`);
  },

  getOne: (id: string) => apiGet<MecStudent>(`/mec/students/${id}`),

  create: (data: CreateMecStudentDto) => apiPost<MecStudent>("/mec/students", data),

  update: (id: string, data: Partial<CreateMecStudentDto>) =>
    apiPatch<MecStudent>(`/mec/students/${id}`, data),

  remove: (id: string) => apiDelete<MecStudent>(`/mec/students/${id}`),
};
