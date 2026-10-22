import { redirect } from "next/navigation";
import { cabinetRoot, sectionFromParts } from "@/shared/lib/cabinet-section";
import { ADMIN, CLIENT, type CabinetMode } from "@/shared/lib/role";

export async function CabinetSection({
  mode,
  params,
}: {
  mode: CabinetMode;
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  if (sectionFromParts(section, mode) === null) redirect(cabinetRoot(mode));
  return null;
}

export function ClientSection({ params }: { params: Promise<{ section?: string[] }> }) {
  return <CabinetSection mode={CLIENT} params={params} />;
}

export function AdminSection({ params }: { params: Promise<{ section?: string[] }> }) {
  return <CabinetSection mode={ADMIN} params={params} />;
}
