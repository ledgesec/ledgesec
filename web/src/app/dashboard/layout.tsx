import { ClientCabinet } from "@/fsd/pages/cabinet/ui/cabinet-route";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientCabinet>{children}</ClientCabinet>;
}
