import { humansText } from "@/fsd/pages/site/llms";

export function GET() {
  return new Response(humansText(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
