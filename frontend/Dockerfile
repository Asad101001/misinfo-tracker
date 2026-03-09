# Stage 1 — build the React app
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Inject the API URL for production build
# In K8s this will point to the backend service
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2 — serve with Nginx (tiny, ~23MB final image)
FROM nginx:alpine AS runner

# Copy built React files
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config — handles SPA routing + proxies /api to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
