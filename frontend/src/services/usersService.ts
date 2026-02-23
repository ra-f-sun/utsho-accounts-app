import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from "../lib/axios";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
  isActive?: boolean;
}

export const usersService = {
  getAll: (page = 1, limit = 20): Promise<PaginatedResponse<User>> =>
    apiGet(`/users?page=${page}&limit=${limit}`),
  getById: (id: string) => apiGet<User>(`/users/${id}`),
  create: (data: CreateUserDto) => apiPost<User>("/users", data),
  update: (id: string, data: UpdateUserDto) =>
    apiPatch<User>(`/users/${id}`, data),
  delete: (id: string) => apiDelete<void>(`/users/${id}`),
};
