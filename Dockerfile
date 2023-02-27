FROM node:18-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install --frozen-lockfile
COPY . .
CMD ["yarn", "ts-node", "/app/src/index.ts"]
