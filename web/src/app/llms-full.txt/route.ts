import { llmsFullText } from "@/fsd/pages/site/llms";

export function GET() {
  return new Response(llmsFullText(), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
