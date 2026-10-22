import { ClientSection } from "@/fsd/pages/cabinet/ui/section-page";

export default function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  return <ClientSection params={params} />;
}
