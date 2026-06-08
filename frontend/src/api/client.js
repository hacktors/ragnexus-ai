import axios from "axios";

const DEFAULT_API_ORIGIN = import.meta.env.PROD
  ? "https://ragnexus-ai.onrender.com"
  : "http://localhost:5000";

const normalizeApiBaseUrl = (value) => {
  const cleanValue = String(value || "").trim().replace(/\/+$/, "");
  if (!cleanValue) return `${DEFAULT_API_ORIGIN}/api`;
  return cleanValue.endsWith("/api") ? cleanValue : `${cleanValue}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_ORIGIN);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.response?.data?.reason || error.message;
    return Promise.reject(new Error(message));
  }
);
