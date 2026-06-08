import { api } from "./client.js";

export const authApi = {
  register: (payload) => api.post("/auth/register", payload).then((res) => res.data),
  login: (payload) => api.post("/auth/login", payload).then((res) => res.data),
  me: () => api.get("/auth/me").then((res) => res.data)
};

export const documentsApi = {
  strategies: () => api.get("/documents/strategies").then((res) => res.data),
  list: () => api.get("/documents").then((res) => res.data),
  upload: (formData) =>
    api
      .post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      .then((res) => res.data),
  remove: (id) => api.delete(`/documents/${id}`).then((res) => res.data)
};

export const chatApi = {
  history: () => api.get("/chat/history").then((res) => res.data),
  ask: (message) => api.post("/chat", { message }).then((res) => res.data),
  feedback: (payload) => api.post("/chat/feedback", payload).then((res) => res.data)
};

export const analyticsApi = {
  get: (days = 14) => api.get(`/analytics?days=${days}`).then((res) => res.data)
};

export const logsApi = {
  list: ({ level = "", page = 1 } = {}) =>
    api
      .get("/logs", {
        params: {
          level: level || undefined,
          page
        }
      })
      .then((res) => res.data)
};

export const evaluationApi = {
  exportFineTune: () =>
    api.post("/evaluation/export-fine-tune", null, { responseType: "blob" }).then((res) => ({
      blob: res.data,
      count: res.headers["x-ragnexus-example-count"] || "0"
    }))
};
