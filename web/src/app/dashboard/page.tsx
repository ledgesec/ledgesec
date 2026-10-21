import { headers } from "next/headers";
import { DashboardPage } from "@/pages/dashboard/ui/dashboard-page";

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <DashboardPage host={host} />;
}
