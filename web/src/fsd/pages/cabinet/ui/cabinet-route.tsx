import { Suspense } from "react";
import { headers } from "next/headers";
import { CabinetPage } from "@/fsd/pages/cabinet/ui/cabinet-page";
import { ADMIN, CLIENT, type CabinetMode } from "@/shared/lib/role";

export async function CabinetRoute({ mode, children }: { mode: CabinetMode; children: React.ReactNode }) {
  const host = (await headers()).get("host") ?? "";
  return (
    <>
      <Suspense fallback={null}>
        <CabinetPage host={host} mode={mode} />
      </Suspense>
      {children}
    </>
  );
}

export function ClientCabinet({ children }: { children: React.ReactNode }) {
  return <CabinetRoute mode={CLIENT}>{children}</CabinetRoute>;
}

export function AdminCabinet({ children }: { children: React.ReactNode }) {
  return <CabinetRoute mode={ADMIN}>{children}</CabinetRoute>;
}
