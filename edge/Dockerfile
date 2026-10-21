FROM caddy:2.10.2-alpine
RUN apk add --no-cache wget
ARG CADDYFILE=Caddyfile
COPY ${CADDYFILE} /etc/caddy/site.Caddyfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
