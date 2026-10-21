FROM openresty/openresty:1.27.1.2-alpine
RUN apk add --no-cache openssl wget
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
