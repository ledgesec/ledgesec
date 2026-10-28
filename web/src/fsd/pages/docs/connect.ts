export const DOCS_KICKER = "Connections";
export const DOCS_TITLE = "How a server joins the journal";
export const DOCS_LEDE =
  "The visitor still reaches the application. A collector on that server reads the access log and posts a batch. Europe keeps the journal. New York does not.";

export const INGEST_URL = "https://dash.ledgesec.com/api/v1/observations";
export const AGENT_ENV = "/etc/ledgesec/agent.env";
export const NGINX_LOG = "/var/log/nginx/ledgesec.log";
export const COOLIFY_LOG = "/data/coolify/proxy/access.log";

export const DIAGRAM_VISITOR = "Visitor";
export const DIAGRAM_ORIGIN = "shop.example";
export const DIAGRAM_ORIGIN_BODY = "The application answers. The collector does not stand in front of the request.";
export const DIAGRAM_EUROPE = "Europe";
export const DIAGRAM_EUROPE_BODY = "Caddy, the site, both cabinets, and the API. Postgres holds accounts and hosts. ClickHouse holds the journal for three years.";
export const DIAGRAM_NEW_YORK = "New York";
export const DIAGRAM_NEW_YORK_BODY = "Caddy for us.ledgesec.com only. No Postgres, no ClickHouse, no cabinet.";
export const DIAGRAM_CAPTION = "The batch goes to Europe. New York is a separate edge and does not store the journal.";

export const SHARED_TITLE = "The file every collector reads";
export const SHARED_BODY = "The cabinet writes the host id and the ingest secret into this file. The examples below use placeholders.";

export const AGENT_FILE = `LEDGESEC_SITE_ID=host-from-the-cabinet
LEDGESEC_INGEST_SECRET=from-the-cabinet
LEDGESEC_INGEST_URL=${INGEST_URL}`;

export const CONNECTIONS = [
  {
    title: "OpenResty",
    diagram: "log_by_lua after the response",
    body: "After the response, log_by_lua notes the line and a worker posts the batch. The request is not changed. Plain nginx cannot load this file. That server uses the Linux daemon instead.",
    code: `env LEDGESEC_INGEST_SECRET;
env LEDGESEC_SITE_ID;

http {
    lua_package_path "/usr/local/ledgesec/lua/?.lua;;";
    lua_shared_dict ledgesec_observe 16m;

    init_worker_by_lua_block {
        require("ledgesec.observe").start()
    }

    server {
        listen 443 ssl;
        server_name shop.example;

        location / {
            log_by_lua_block {
                require("ledgesec.observe").note()
            }
            proxy_pass http://app:8080;
        }
    }
}`,
  },
  {
    title: "Linux daemon",
    diagram: "tails the nginx access log",
    body: "Nginx stays as it is. The format belongs in the http block, so every server on that machine is included. A server block that already writes an access log repeats the ledgesec line. ledgesec-agent reads the file and posts the same batch.",
    code: `log_format ledgesec '$msec $remote_addr $host "$request" $status $request_time';
access_log ${NGINX_LOG} ledgesec;`,
  },
  {
    title: "Coolify",
    diagram: "tails the proxy log",
    body: "The same daemon runs on the Coolify server and follows the proxy log, including a name the proxy did not route to an application. Add these lines to the env file.",
    code: `LEDGESEC_LOG=${COOLIFY_LOG}
LEDGESEC_EDGE_ID=eu`,
  },
] as const;

export const DOCS_ASIDE = "DNS and Apache are listed in the cabinet and cannot be added yet.";

const ADDRESS = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const FORBIDDEN = ["incident", "mttd", "mttr", "vulnerabilit", "blocked", "cve", "endpoint"];

export function docsText() {
  return [
    DOCS_KICKER,
    DOCS_TITLE,
    DOCS_LEDE,
    DIAGRAM_VISITOR,
    DIAGRAM_ORIGIN,
    DIAGRAM_ORIGIN_BODY,
    DIAGRAM_EUROPE,
    DIAGRAM_EUROPE_BODY,
    DIAGRAM_NEW_YORK,
    DIAGRAM_NEW_YORK_BODY,
    DIAGRAM_CAPTION,
    SHARED_TITLE,
    SHARED_BODY,
    AGENT_ENV,
    AGENT_FILE,
    ...CONNECTIONS.flatMap((item) => [item.title, item.diagram, item.body, item.code]),
    DOCS_ASIDE,
  ].join(" ");
}

export function docsStayInsideObservation() {
  const folded = docsText().toLowerCase();
  return FORBIDDEN.every((word) => !folded.includes(word));
}

export function docsOmitAddresses() {
  return !ADDRESS.test(docsText());
}
