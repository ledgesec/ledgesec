export function HostInstall({
  hostId,
  secret,
  collector = "nginx",
}: {
  hostId: string;
  secret: string;
  collector?: string;
}) {
  const daemon = collector === "linux";
  const proxy = collector === "coolify";
  const lines = [
    `LEDGESEC_SITE_ID=${hostId}`,
    secret ? `LEDGESEC_INGEST_SECRET=${secret}` : "",
    proxy ? "LEDGESEC_LOG=/data/coolify/proxy/access.log" : "",
    proxy ? "LEDGESEC_EDGE_ID=eu" : "",
  ]
    .filter(Boolean)
    .join("\n");
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
            Put the format and the log line in the http block, so every server on that nginx is included. A server block that already has an access_log must repeat the ledgesec line. ledgesec-agent reads /var/log/nginx/ledgesec.log. The request is not changed.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-cyber-cyan/15 bg-black/40 p-4 font-mono text-xs leading-6 text-cyber-cyan">
            {`log_format ledgesec '$msec $remote_addr $host "$request" $status $request_time';\naccess_log /var/log/nginx/ledgesec.log ledgesec;`}
          </pre>
        </>
      ) : null}
      {proxy ? (
        <p className="text-sm text-muted-foreground">
          Run ledgesec-agent on the Coolify server. It reads every request in /data/coolify/proxy/access.log, including a name or path that is not an application. The request is not changed.
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        A site name comes from the request Host header. A request for a name that is not an application is still recorded. Turn off a site you do not want to monitor.
      </p>
    </div>
  );
}
