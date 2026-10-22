export type ClientFields = {
  protocol: string;
  tls: string;
  bytesSent: number;
};

export function clientStack(row: ClientFields) {
  const parts = [row.protocol, row.tls];
  if (row.bytesSent > 0) parts.push(`${row.bytesSent} B`);
  return parts.filter((part) => part !== "").join(" · ");
}
