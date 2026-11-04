import axios from "axios";

export const STORAGE_TOKEN = "epuleam_token";

export const clienteApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

clienteApi.interceptors.request.use((configuracion) => {
  const token = localStorage.getItem(STORAGE_TOKEN);

  if (token) {
    configuracion.headers.Authorization = `Bearer ${token}`;
  }

  return configuracion;
});
