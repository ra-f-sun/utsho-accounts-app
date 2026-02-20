import { api } from "../lib/axios";

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

    return api.get<{ success: boolean; data: MbcsTeacherAttendance[] }>(
      `/mbcs/teacher-attendance?${params.toString()}`,
    );
  },

  getOne: (id: string) => {
    return api.get<{ success: boolean; data: MbcsTeacherAttendance }>(
      `/mbcs/teacher-attendance/${id}`,
    );
  },

  getMonthlySummary: (teacherId: string, month: string) => {
    return api.get(`/mbcs/teacher-attendance/summary/${teacherId}/${month}`);
  },

  create: (data: CreateMbcsAttendanceDto) => {
    return api.post<{ success: boolean; data: MbcsTeacherAttendance }>(
      "/mbcs/teacher-attendance",
      data,
    );
  },

  createMonthlySummary: (data: {
    teacherId: string;
    month: string;
    totalLectures: number;
  }) => {
    return api.post<{ success: boolean; data: MbcsTeacherAttendance }>(
      "/mbcs/teacher-attendance/monthly-summary",
      data,
    );
  },

  update: (id: string, data: Partial<CreateMbcsAttendanceDto>) => {
    return api.patch<{ success: boolean; data: MbcsTeacherAttendance }>(
      `/mbcs/teacher-attendance/${id}`,
      data,
    );
  },

  delete: (id: string) => {
    return api.delete(`/mbcs/teacher-attendance/${id}`);
  },
};
