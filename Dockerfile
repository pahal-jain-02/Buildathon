FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY index.html styles.css app.js /app/frontend/
COPY backend/server.js /app/backend/server.js
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /app/entrypoint.sh
RUN rm -f /etc/nginx/sites-enabled/default && chmod +x /app/entrypoint.sh

EXPOSE 9080 8090

CMD ["/app/entrypoint.sh"]
