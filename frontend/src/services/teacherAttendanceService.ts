import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/axios";

export type AttendanceOrg = "uac" | "mbcs";

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

export interface FilterAttendanceDto {
  teacherId?: string;
  startDate?: string; // UAC: date range start
  endDate?: string;   // UAC: date range end
  month?: string;     // MBCS: "YYYY-MM"
}

export const teacherAttendanceService = {
  getAll: (org: AttendanceOrg, filters?: FilterAttendanceDto) => {
    const params = new URLSearchParams();
    if (filters?.teacherId) params.append("teacherId", filters.teacherId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.month) params.append("month", filters.month);
    return apiGet<TeacherAttendance[]>(`/${org}/teacher-attendance?${params.toString()}`);
  },
  getOne: (org: AttendanceOrg, id: string) =>
    apiGet<TeacherAttendance>(`/${org}/teacher-attendance/${id}`),
  getMonthlySummary: (org: AttendanceOrg, teacherId: string, month: string) =>
    apiGet<{ totalLectures: number }>(`/${org}/teacher-attendance/summary/${teacherId}/${month}`),
  create: (org: AttendanceOrg, data: CreateAttendanceDto) =>
    apiPost<TeacherAttendance>(`/${org}/teacher-attendance`, data),
  createMonthlySummary: (org: AttendanceOrg, data: { teacherId: string; month: string; totalLectures: number }) =>
    apiPost<TeacherAttendance>(`/${org}/teacher-attendance/monthly-summary`, data),
  update: (org: AttendanceOrg, id: string, data: Partial<CreateAttendanceDto>) =>
    apiPatch<TeacherAttendance>(`/${org}/teacher-attendance/${id}`, data),
  delete: (org: AttendanceOrg, id: string) =>
    apiDelete<TeacherAttendance>(`/${org}/teacher-attendance/${id}`),
};
