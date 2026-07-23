FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libheif-tools
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000

# entrypoint.shをコンテナ内にコピー
COPY entrypoint.sh /app/entrypoint.sh

# 実行権限を付与(これを忘れると「Permission denied」で起動失敗する)
RUN chmod +x /app/entrypoint.sh

# コンテナ起動時にこのスクリプトを実行させる
ENTRYPOINT ["/app/entrypoint.sh"]
