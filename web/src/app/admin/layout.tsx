import { AdminCabinet } from "@/fsd/pages/cabinet/ui/cabinet-route";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminCabinet>{children}</AdminCabinet>;
}
