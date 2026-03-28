import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export type Organization = "uac" | "mbcs" | "mec";

export interface Student {
  id: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  class?: number;        // optional — MEC allows nullable class
  group?: string;        // UAC + MEC
  shift?: string;        // MBCS only
  section?: string;
  school?: string;       // UAC only
  branch?: string;       // MBCS only
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
  updatedAt?: string;
}

export interface CreateStudentDto {
  name: string;
  gender: string;
  dateOfBirth: string;
  guardianName: string;
  contactNumber: string;
  monthlyTuitionFee: number;
  class?: number;
  group?: string;
  shift?: string;
  section?: string;
  school?: string;
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
  shift?: string;
  branch?: string;
  search?: string;
}

export const studentsService = {
  getAll: (
    org: Organization,
    filters?: FilterStudentDto,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Student>> => {
    const params = new URLSearchParams();
    if (filters?.class) params.append("class", filters.class.toString());
    if (filters?.group) params.append("group", filters.group);
    if (filters?.school) params.append("school", filters.school);
    if (filters?.shift) params.append("shift", filters.shift);
    if (filters?.branch) params.append("branch", filters.branch);
    if (filters?.search) params.append("search", filters.search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return apiGet(`/${org}/students?${params.toString()}`);
  },

  getOne: (org: Organization, id: string) =>
    apiGet<Student>(`/${org}/students/${id}`),

  create: (org: Organization, data: CreateStudentDto) =>
    apiPost<Student>(`/${org}/students`, data),

  update: (org: Organization, id: string, data: Partial<CreateStudentDto>) =>
    apiPatch<Student>(`/${org}/students/${id}`, data),

  delete: (org: Organization, id: string) =>
    apiDelete<Student>(`/${org}/students/${id}`),

  disassociate: (org: Organization, id: string) =>
    apiPatch<Student>(`/${org}/students/${id}/disassociate`, {}),

  reassociate: (org: Organization, id: string) =>
    apiPatch<Student>(`/${org}/students/${id}/reassociate`, {}),

  promote: (org: Organization, id: string, data: { toClass: number; notes?: string }) =>
    apiPost<Student>(`/${org}/students/${id}/promote`, data),

  promoteBulk: (
    org: Organization,
    data: { fromClass: number; toClass: number; notes?: string; studentIds?: string[] },
  ) => apiPost<{ promoted: number }>(`/${org}/students/promote-bulk`, data),

  importStudents: (org: Organization, students: CreateStudentDto[]) =>
    apiPost<Student[]>(`/${org}/students/import`, { students }),
};
