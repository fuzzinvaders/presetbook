FROM node:22-alpine

LABEL org.opencontainers.image.title="Presetbook" \
      org.opencontainers.image.description="Presets d'instruments, d'amplis, de pédales et chaînes de plugins" \
      org.opencontainers.image.source="https://github.com/fuzzinvaders/presetbook" \
      org.opencontainers.image.url="https://github.com/fuzzinvaders/presetbook" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    DATA_DIR=/data

WORKDIR /app

# Aucune dépendance : rien à installer, donc pas d'étape npm.
COPY package.json server.js ./
COPY public ./public
# Les outils voyagent avec l image : redonner un mot de passe oublié doit être
# possible depuis le conteneur, sans dépôt cloné ni Node sur l hôte.
COPY tools ./tools

RUN mkdir -p /data && chown -R node:node /data /app

USER node
EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["node", "server.js"]
