import { findSpans } from "@/shared/lib/find";

export function FindText({ text, query }: { text: string; query: string }) {
  const spans = findSpans(text, query);
  if (!spans.some((span) => span.hit)) return text;
  return spans.map((span, index) =>
    span.hit ? (
      <mark key={index} className="rounded-sm bg-cyber-cyan/30 px-0.5 text-slate-50">
        {span.text}
      </mark>
    ) : (
      <span key={index}>{span.text}</span>
    ),
  );
}
