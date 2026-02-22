import { api } from "../lib/axios";

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
  getAll: async (): Promise<User[]> => {
    const response = await api.get("/users");
    return response.data || [];
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUserDto): Promise<User> => {
    const response = await api.post("/users", data);
    return response.data;
  },

  update: async (id: string, data: UpdateUserDto): Promise<User> => {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
