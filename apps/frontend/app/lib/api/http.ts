import axios, { type AxiosInstance } from "axios";

const apiBaseUrl: string | undefined = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
}

export const http: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  // withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
