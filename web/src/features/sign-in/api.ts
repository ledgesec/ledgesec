export type SessionUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  site_id: string;
};

export async function readSession(): Promise<SessionUser | null> {
  const response = await fetch("/api/v1/session", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("unavailable");
  return response.json();
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const response = await fetch("/api/v1/session", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (response.status === 401) throw new Error("refused");
  if (!response.ok) throw new Error("unavailable");
  return response.json();
}

export async function signOut(): Promise<void> {
  await fetch("/api/v1/logout", { method: "POST", credentials: "include" });
}
