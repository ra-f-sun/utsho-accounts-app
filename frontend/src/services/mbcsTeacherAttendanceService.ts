import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/axios";

export interface MbcsTeacherAttendance {
  id: string;
  teacherId: string;
  class?: number;
  subject?: string;
  attendanceDate: string;
  lecturesTaken: number;
  teacher?: {
    id: string;
    name: string;
    contactNumber?: string;
    paymentType?: string;
  };
  createdAt: string;
}

export interface CreateMbcsAttendanceDto {
  teacherId: string;
  class?: number;
  subject?: string;
  attendanceDate: string; // ISO DateString
  lecturesTaken: number;
}

export const mbcsTeacherAttendanceService = {
  getAll: (filters?: { teacherId?: string; month?: string }) => {
    const params = new URLSearchParams();
    if (filters?.teacherId) params.append("teacherId", filters.teacherId);
    if (filters?.month) params.append("month", filters.month);
    return apiGet<MbcsTeacherAttendance[]>(`/mbcs/teacher-attendance?${params.toString()}`);
  },
  getOne: (id: string) =>
    apiGet<MbcsTeacherAttendance>(`/mbcs/teacher-attendance/${id}`),
  getMonthlySummary: (teacherId: string, month: string) =>
    apiGet<{ totalLectures: number }>(`/mbcs/teacher-attendance/summary/${teacherId}/${month}`),
  create: (data: CreateMbcsAttendanceDto) =>
    apiPost<MbcsTeacherAttendance>("/mbcs/teacher-attendance", data),
  createMonthlySummary: (data: { teacherId: string; month: string; totalLectures: number }) =>
    apiPost<MbcsTeacherAttendance>("/mbcs/teacher-attendance/monthly-summary", data),
  update: (id: string, data: Partial<CreateMbcsAttendanceDto>) =>
    apiPatch<MbcsTeacherAttendance>(`/mbcs/teacher-attendance/${id}`, data),
  delete: (id: string) =>
    apiDelete<MbcsTeacherAttendance>(`/mbcs/teacher-attendance/${id}`),
};
