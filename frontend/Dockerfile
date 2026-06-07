FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
# Fix execute bit on CLI bins (Windows uploads can strip +x on node_modules/.bin)
RUN chmod -R +x node_modules/.bin 2>/dev/null || true
RUN npm run build \
  && test -f dist/index.html \
  && grep -qE '/assets/[^"]+\.(js|css)"' dist/index.html \
  && ls -la dist/assets/ | head -5

FROM nginx:1.27-alpine
RUN apk add --no-cache gettext
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Render template using env vars (API_PORT) then start nginx.
CMD ["/bin/sh", "-lc", "envsubst '$$API_PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
