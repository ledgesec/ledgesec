import { headers } from "next/headers";
import { BlogIndex } from "@/fsd/pages/blog/ui/blog-index";

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <BlogIndex host={host} />;
}
