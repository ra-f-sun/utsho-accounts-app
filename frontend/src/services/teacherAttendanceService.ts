import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/axios";

export interface TeacherAttendance {
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

export interface CreateAttendanceDto {
  teacherId: string;
  class?: number;
  subject?: string;
  attendanceDate: string; // ISO DateString
  lecturesTaken: number;
}

export const teacherAttendanceService = {
  getAll: (filters?: { teacherId?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.teacherId) params.append("teacherId", filters.teacherId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    return apiGet<TeacherAttendance[]>(`/uac/teacher-attendance?${params.toString()}`);
  },
  getOne: (id: string) =>
    apiGet<TeacherAttendance>(`/uac/teacher-attendance/${id}`),
  getMonthlySummary: (teacherId: string, month: string) =>
    apiGet<{ totalLectures: number }>(`/uac/teacher-attendance/summary/${teacherId}/${month}`),
  create: (data: CreateAttendanceDto) =>
    apiPost<TeacherAttendance>("/uac/teacher-attendance", data),
  createMonthlySummary: (data: { teacherId: string; month: string; totalLectures: number }) =>
    apiPost<TeacherAttendance>("/uac/teacher-attendance/monthly-summary", data),
  update: (id: string, data: Partial<CreateAttendanceDto>) =>
    apiPatch<TeacherAttendance>(`/uac/teacher-attendance/${id}`, data),
  delete: (id: string) => apiDelete<TeacherAttendance>(`/uac/teacher-attendance/${id}`),
};
