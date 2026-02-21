import { api } from "../lib/axios";

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
  getAll: (params?: { class?: number; search?: string }) =>
    api.get("/mec/students", { params }),

  getOne: (id: string) => api.get(`/mec/students/${id}`),

  create: (data: CreateMecStudentDto) => api.post("/mec/students", data),

  update: (id: string, data: Partial<CreateMecStudentDto>) =>
    api.patch(`/mec/students/${id}`, data),

  remove: (id: string) => api.delete(`/mec/students/${id}`),
};
