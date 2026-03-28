import axios from "axios";
import { useAuthStore } from "../stores/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    // Normalize validation error arrays into a single string
    if (
      error.response?.data?.message &&
      Array.isArray(error.response.data.message)
    ) {
      error.response.data.message = error.response.data.message.join("; ");
    }
    return Promise.reject(error);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Typed API helpers — eliminate `as any` casts across the codebase
// The response interceptor above strips the AxiosResponse wrapper at runtime,
// but TypeScript still infers AxiosResponse<T>. These wrappers tell TS the
// resolved type matches our server envelope so callers can use `data?.data`.
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Paginated API response — `response.data.data` is the items array */
export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

export const apiGet = <T>(
  url: string,
  config?: Parameters<typeof api.get>[1],
): Promise<ApiResponse<T>> =>
  api.get(url, config) as unknown as Promise<ApiResponse<T>>;

export const apiPost = <T>(
  url: string,
  body?: unknown,
  config?: Parameters<typeof api.post>[2],
): Promise<ApiResponse<T>> =>
  api.post(url, body, config) as unknown as Promise<ApiResponse<T>>;

export const apiPatch = <T>(
  url: string,
  body?: unknown,
  config?: Parameters<typeof api.patch>[2],
): Promise<ApiResponse<T>> =>
  api.patch(url, body, config) as unknown as Promise<ApiResponse<T>>;

export const apiDelete = <T>(
  url: string,
  config?: Parameters<typeof api.delete>[1],
): Promise<ApiResponse<T>> =>
  api.delete(url, config) as unknown as Promise<ApiResponse<T>>;
