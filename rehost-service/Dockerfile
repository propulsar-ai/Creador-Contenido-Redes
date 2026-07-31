# Single-stage Node 20 image. EasyPanel's "Dockerfile" build type always
# builds the file literally named `Dockerfile` at the build context root
# (source.path) — confirmed empirically in propulsar-atiende/docs/deploy-vps-demo.md
# §3 (multi-stage/custom-filename builds silently fail or build the wrong
# target on this instance). Keep this single-stage and named exactly `Dockerfile`.

FROM node:20-slim
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

EXPOSE 8000
ENV PORT=8000

CMD ["node", "server.js"]
