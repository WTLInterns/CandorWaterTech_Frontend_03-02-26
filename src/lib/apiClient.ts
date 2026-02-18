import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.candorwatertech.com/api/v1",
  withCredentials: true,
});

export default api;
