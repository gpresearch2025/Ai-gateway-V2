FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

EXPOSE 3001
CMD ["node", "dist/server.js"]
