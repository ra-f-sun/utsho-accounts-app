import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

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
  readmissionFee?: number;
  discountTuition?: number;
  discountAdmission?: number;
  discountReadmission?: number;
  isActive: boolean;
  associationEndDate?: string | null;
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
  admissionFee?: number;
  admissionDate?: string;
  readmissionFee?: number;
  discountTuition?: number;
  discountAdmission?: number;
  discountReadmission?: number;
}

export interface FilterStudentDto {
  class?: number;
  group?: string;
  school?: string;
  search?: string;
}

export const studentsService = {
  getAll: (filters?: FilterStudentDto, page = 1, limit = 20): Promise<PaginatedResponse<Student>> => {
    const params = new URLSearchParams();
    if (filters?.class) params.append("class", filters.class.toString());
    if (filters?.group) params.append("group", filters.group);
    if (filters?.school) params.append("school", filters.school);
    if (filters?.search) params.append("search", filters.search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/uac/students?${params.toString()}`);
  },
  getOne: (id: string) => apiGet<Student>(`/uac/students/${id}`),
  create: (data: CreateStudentDto) => apiPost<Student>("/uac/students", data),
  update: (id: string, data: Partial<CreateStudentDto>) =>
    apiPatch<Student>(`/uac/students/${id}`, data),
  delete: (id: string) => apiDelete<Student>(`/uac/students/${id}`),
  disassociate: (id: string) => apiPatch<Student>(`/uac/students/${id}/disassociate`, {}),
  reassociate: (id: string) => apiPatch<Student>(`/uac/students/${id}/reassociate`, {}),
  promote: (id: string, data: { toClass: number; notes?: string }) =>
    apiPost<Student>(`/uac/students/${id}/promote`, data),
  promoteBulk: (data: { fromClass: number; toClass: number; notes?: string }) =>
    apiPost<{ promoted: number }>('/uac/students/promote-bulk', data),
};
