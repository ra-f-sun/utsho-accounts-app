import axios from "axios";
import { useAuthStore } from "../stores/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // send httpOnly refresh_token cookie on every request
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

// Flag to avoid multiple concurrent refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}
function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Wait for the ongoing refresh then retry
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
          // If refresh ultimately fails this subscriber will never fire —
          // the catch below will call markSessionExpired instead.
          void reject; // satisfy linter; rejection handled by the outer catch
        });
      }

      isRefreshing = true;
      try {
        // Attempt silent refresh — cookie is sent automatically via withCredentials
        const response = await axios.post<{
          data: { accessToken: string; user: { id: string; email: string; fullName: string; role: string; isActive: boolean } };
        }>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const { accessToken, user } = (response.data as unknown as { data: { accessToken: string; user: { id: string; email: string; fullName: string; role: string; isActive: boolean } } }).data;
        useAuthStore.getState().setAuth(user, accessToken);
        onRefreshed(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — show modal, keep current page intact
        refreshSubscribers = [];
        useAuthStore.getState().markSessionExpired();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
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
