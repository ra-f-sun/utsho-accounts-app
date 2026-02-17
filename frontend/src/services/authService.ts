import { api } from "../lib/axios";

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

export const authApi = {
  login: async (data: LoginData) => {
    return api.post("/auth/login", data);
  },

  register: async (data: RegisterData) => {
    return api.post("/auth/register", data);
  },

  getMe: async () => {
    return api.get("/auth/me");
  },

  logout: async () => {
    return api.post("/auth/logout");
  },
};
