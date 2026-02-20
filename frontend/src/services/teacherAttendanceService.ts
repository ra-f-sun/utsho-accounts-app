import { api } from "../lib/axios";

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
  getAll: (filters?: {
    teacherId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.teacherId) params.append("teacherId", filters.teacherId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    return api.get<{ success: boolean; data: TeacherAttendance[] }>(
      `/uac/teacher-attendance?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: TeacherAttendance }>(
      `/uac/teacher-attendance/${id}`,
    );
  },

  getMonthlySummary: (teacherId: string, month: string) => {
    return api.get(`/uac/teacher-attendance/summary/${teacherId}/${month}`);
  },

  create: (data: CreateAttendanceDto) => {
    return api.post<{ success: boolean; data: TeacherAttendance }>(
      "/uac/teacher-attendance",
      data,
    );
  },

  createMonthlySummary: (data: {
    teacherId: string;
    month: string;
    totalLectures: number;
  }) => {
    return api.post<{ success: boolean; data: TeacherAttendance }>(
      "/uac/teacher-attendance/monthly-summary",
      data,
    );
  },

  update: (id: string, data: Partial<CreateAttendanceDto>) => {
    return api.patch<{ success: boolean; data: TeacherAttendance }>(
      `/uac/teacher-attendance/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete(`/uac/teacher-attendance/${id}`);
  },
};
