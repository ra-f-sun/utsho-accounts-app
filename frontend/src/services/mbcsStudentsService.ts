import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

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
  readmissionFee?: number;
  discountTuition?: number;
  discountAdmission?: number;
  discountReadmission?: number;
  admissionDate?: string;
  isActive: boolean;
  associationEndDate?: string | null;
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
  readmissionFee?: number;
  discountTuition?: number;
  discountAdmission?: number;
  discountReadmission?: number;
  admissionDate?: string;
}

export interface FilterMbcsStudentDto {
  class?: number;
  shift?: string;
  branch?: string;
  search?: string;
}

export const mbcsStudentsService = {
  getAll: (filters?: FilterMbcsStudentDto, page = 1, limit = 20): Promise<PaginatedResponse<MbcsStudent>> => {
    const params = new URLSearchParams();
    if (filters?.class) params.append("class", filters.class.toString());
    if (filters?.shift) params.append("shift", filters.shift);
    if (filters?.branch) params.append("branch", filters.branch);
    if (filters?.search) params.append("search", filters.search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/mbcs/students?${params.toString()}`);
  },
  getOne: (id: string) => apiGet<MbcsStudent>(`/mbcs/students/${id}`),
  create: (data: CreateMbcsStudentDto) =>
    apiPost<MbcsStudent>("/mbcs/students", data),
  update: (id: string, data: Partial<CreateMbcsStudentDto>) =>
    apiPatch<MbcsStudent>(`/mbcs/students/${id}`, data),
  delete: (id: string) => apiDelete<MbcsStudent>(`/mbcs/students/${id}`),
  disassociate: (id: string) => apiPatch<MbcsStudent>(`/mbcs/students/${id}/disassociate`, {}),
  reassociate: (id: string) => apiPatch<MbcsStudent>(`/mbcs/students/${id}/reassociate`, {}),
  promote: (id: string, data: { toClass: number; notes?: string }) =>
    apiPost<MbcsStudent>(`/mbcs/students/${id}/promote`, data),
  promoteBulk: (data: { fromClass: number; toClass: number; notes?: string }) =>
    apiPost<{ promoted: number }>('/mbcs/students/promote-bulk', data),
  importStudents: (students: CreateMbcsStudentDto[]) =>
    apiPost<MbcsStudent[]>('/mbcs/students/import', { students }),
};
