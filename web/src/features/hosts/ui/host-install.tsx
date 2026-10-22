export function HostInstall({ hostId, secret }: { hostId: string; secret: string }) {
  const lines = secret
    ? `LEDGESEC_SITE_ID=${hostId}\nLEDGESEC_INGEST_SECRET=${secret}`
    : `LEDGESEC_SITE_ID=${hostId}`;
  return (
    <div className="mt-4 grid gap-3">
      <p className="text-sm text-muted-foreground">On the server, write this to /etc/ledgesec/agent.env.</p>
      <pre className="overflow-x-auto rounded-lg border border-cyber-cyan/15 bg-black/40 p-4 font-mono text-xs leading-6 text-cyber-cyan">
        {lines}
      </pre>
      {secret ? null : <p className="text-sm text-muted-foreground">The ingest secret is not set on the API yet.</p>}
      <p className="text-sm text-muted-foreground">
        A site name comes from the request Host header. Turn off a site you do not want to monitor.
      </p>
    </div>
  );
}
