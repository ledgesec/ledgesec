export function HostInstall({
  hostId,
  secret,
  collector = "nginx",
}: {
  hostId: string;
  secret: string;
  collector?: string;
}) {
  const lines = secret
    ? `LEDGESEC_SITE_ID=${hostId}\nLEDGESEC_INGEST_SECRET=${secret}`
    : `LEDGESEC_SITE_ID=${hostId}`;
  const daemon = collector === "linux";
  const release = process.env.NEXT_PUBLIC_LEDGESEC_VERSION ?? "";
  return (
    <div className="mt-4 grid gap-3">
      {release ? (
        <p className="text-sm text-muted-foreground">This release is v{release}. The agent on the server reports the same number.</p>
      ) : null}
      <p className="text-sm text-muted-foreground">On the server, write this to /etc/ledgesec/agent.env.</p>
      <pre className="overflow-x-auto rounded-lg border border-cyber-cyan/15 bg-black/40 p-4 font-mono text-xs leading-6 text-cyber-cyan">
        {lines}
      </pre>
      {secret ? null : <p className="text-sm text-muted-foreground">The ingest secret is not set on the API yet.</p>}
      {daemon ? (
        <>
          <p className="text-sm text-muted-foreground">
            Put the format in the http block and the log line in that site’s server block, next to the log that is already there. ledgesec-agent reads /var/log/nginx/ledgesec.log. The request is not changed.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-cyber-cyan/15 bg-black/40 p-4 font-mono text-xs leading-6 text-cyber-cyan">
            {`log_format ledgesec '$msec $remote_addr $host "$request" $status';\naccess_log /var/log/nginx/ledgesec.log ledgesec;`}
          </pre>
          <p className="text-sm text-muted-foreground">
            A site name comes from the request Host header. Turn off a site you do not want to monitor.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          A site name comes from the request Host header. Turn off a site you do not want to monitor.
        </p>
      )}
    </div>
  );
}
