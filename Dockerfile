# 使用 Node.js 18 Alpine 作为基础镜像
FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci

# 构建阶段
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建时需要的环境变量（使用占位符）
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="mysql://placeholder:placeholder@placeholder:3306/placeholder"
ENV NEXTAUTH_SECRET="build-time-placeholder-secret"
ENV NEXTAUTH_URL="http://localhost:3000"

# 生成 Prisma Client
RUN npx prisma generate

# 构建 Next.js 应用
RUN npm run build

# 生产运行阶段
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制 prisma 文件
COPY --from=builder /app/prisma ./prisma

# 设置 .next 目录权限
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 复制 standalone 构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制 Prisma Client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
