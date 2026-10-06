import type { Blog, BlogInput, RegisterInput, TokenResponse } from "./types";

const API_URL = "http://127.0.0.1:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `请求失败：${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getBlogs(): Promise<Blog[]> {
  return request<Blog[]>("/blogs");
}

export function getBlog(id: number): Promise<Blog> {
  return request<Blog>(`/blogs/${id}`);
}

export function login(username: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams({ username, password });
  return request<TokenResponse>("/login", {
    method: "POST",
    body: form,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export function register(input: RegisterInput): Promise<unknown> {
  return request<unknown>("/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function createBlog(token: string, input: BlogInput): Promise<Blog> {
  return request<Blog>("/blogs", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

export function updateBlog(token: string, id: number, input: BlogInput): Promise<Blog> {
  return request<Blog>(`/blogs/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

export function deleteBlog(token: string, id: number): Promise<void> {
  return request<void>(`/blogs/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
