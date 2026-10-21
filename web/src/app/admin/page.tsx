import { headers } from "next/headers";
import { CabinetPage } from "@/fsd/pages/cabinet/ui/cabinet-page";

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <CabinetPage host={host} mode="admin" />;
}
