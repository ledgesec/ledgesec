import { AdminSection } from "@/fsd/pages/cabinet/ui/section-page";

export default function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  return <AdminSection params={params} />;
}
