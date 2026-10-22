export type FindSpan = { text: string; hit: boolean };

export function findSpans(text: string, query: string): FindSpan[] {
  const needle = query.trim();
  if (needle === "" || text === "") return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const want = needle.toLowerCase();
  const spans: FindSpan[] = [];
  let cursor = 0;
  let at = lower.indexOf(want, cursor);
  while (at !== -1) {
    if (at > cursor) spans.push({ text: text.slice(cursor, at), hit: false });
    spans.push({ text: text.slice(at, at + needle.length), hit: true });
    cursor = at + needle.length;
    at = lower.indexOf(want, cursor);
  }
  if (cursor < text.length) spans.push({ text: text.slice(cursor), hit: false });
  return spans.length > 0 ? spans : [{ text, hit: false }];
}
