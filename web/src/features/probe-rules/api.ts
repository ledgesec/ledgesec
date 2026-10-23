import { apiError } from "@/shared/lib/api-error";

export type ProbeRule = { id: string; code: string; label: string; kind: string; pattern: string; custom: boolean };

export async function readProbeRules(): Promise<ProbeRule[]> {
  const response = await fetch("/api/v1/probe-rules", { credentials: "include" });
  if (!response.ok) throw new Error(apiError.unavailable);
  const body = (await response.json()) as { rules: ProbeRule[] };
  return body.rules;
}

export async function createProbeRule(label: string, kind: string, pattern: string): Promise<ProbeRule> {
  const response = await fetch("/api/v1/probe-rules", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "", label, kind, pattern }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? apiError.unavailable);
  }
  return (await response.json()) as ProbeRule;
}

export async function deleteProbeRule(id: string): Promise<void> {
  const response = await fetch(`/api/v1/probe-rules/${id}`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw new Error(apiError.unavailable);
}
