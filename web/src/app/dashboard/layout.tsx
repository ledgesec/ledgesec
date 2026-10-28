import type { Metadata } from "next";
import { ClientCabinet } from "@/fsd/pages/cabinet/ui/cabinet-route";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientCabinet>{children}</ClientCabinet>;
}
