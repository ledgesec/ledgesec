import type { Metadata } from "next";
import { headers } from "next/headers";
import { FUTURE_DESCRIPTION, FUTURE_TITLE } from "@/fsd/pages/future/pains";
import { FutureIndex } from "@/fsd/pages/future/ui/future-index";
import { SITE_URL } from "@/fsd/pages/home/overview";

export const metadata: Metadata = {
  title: FUTURE_TITLE,
  description: FUTURE_DESCRIPTION,
  alternates: { canonical: "/future" },
  openGraph: {
    title: FUTURE_TITLE,
    description: FUTURE_DESCRIPTION,
    url: `${SITE_URL}/future`,
  },
};

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <FutureIndex host={host} />;
}
