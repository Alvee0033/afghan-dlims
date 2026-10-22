FROM node:20-alpine AS base

RUN apk add --no-cache \
    python3 \
    py3-pip \
    libc6-compat \
    font-noto \
    fribidi \
    harfbuzz \
    libraqm \
    && pip install --no-cache-dir --break-system-packages pillow qrcode python-barcode

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000

RUN npm run build

EXPOSE 3000

CMD ["npm", "start", "--", "-p", "3000"]
