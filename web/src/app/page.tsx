import { headers } from "next/headers";
import { HomePage } from "@/fsd/pages/home/ui/home-page";

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <HomePage host={host} />;
}
