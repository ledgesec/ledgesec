import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { findPain, FUTURE_PATH, FUTURE_STATUS, PAINS } from "@/fsd/pages/future/pains";
import { PainPage } from "@/fsd/pages/future/ui/pain-page";
import { SITE_URL } from "@/fsd/pages/home/overview";

export function generateStaticParams() {
  return PAINS.map((pain) => ({ slug: pain.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pain = findPain(slug);
  if (!pain) return {};
  const description = `${FUTURE_STATUS}. ${pain.pain}`;
  return {
    title: pain.title,
    description,
    alternates: { canonical: `${FUTURE_PATH}/${pain.slug}` },
    openGraph: {
      title: pain.title,
      description,
      url: `${SITE_URL}${FUTURE_PATH}/${pain.slug}`,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pain = findPain(slug);
  if (!pain) notFound();
  const host = (await headers()).get("host") ?? "";
  return <PainPage host={host} pain={pain} />;
}
