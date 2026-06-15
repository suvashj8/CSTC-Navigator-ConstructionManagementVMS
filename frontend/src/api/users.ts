import type { Paginated, User, UserRole } from "@/types/domain";
import { api, unwrap, unwrapPaginated } from "./client";
import { MOCK_USERS, delay, paginate } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockUsers = [...MOCK_USERS];

export async function listUsers(params: { page?: number; per_page?: number; search?: string } = {}): Promise<Paginated<User>> {
  if (useMock) {
    await delay();
    return paginate(mockUsers, params.page ?? 1, params.per_page ?? 10, params.search, (u, q) =>
      `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q)
    ) as Paginated<User>;
  }
  return unwrapPaginated<User>(api.get("/api/v1/users", { params }));
}

export async function createUser(body: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  location_id?: string | null;
}) {
  if (useMock) {
    await delay();
    const user: User = {
      id: `user-${Date.now()}`,
      name: body.name,
      email: body.email.toLowerCase(),
      role: body.role,
      status: "active",
      location_id: body.location_id ?? null,
    };
    mockUsers = [user, ...mockUsers];
    return user;
  }
  return unwrap(api.post("/api/v1/users", body)) as Promise<User>;
}

export async function updateUser(
  id: string,
  body: Partial<{
    name: string;
    role: UserRole;
    status: "active" | "inactive";
    location_id: string | null;
    password: string;
  }>
) {
  if (useMock) {
    await delay();
    mockUsers = mockUsers.map((u) => (u.id === id ? { ...u, ...body } : u));
    const user = mockUsers.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    return user;
  }
  return unwrap(api.put(`/api/v1/users/${id}`, body)) as Promise<User>;
}
