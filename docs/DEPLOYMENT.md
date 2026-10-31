# MapForge Production Deployment

## Vercel and Render

The repository root is the monorepo root. Use Node.js 24 LTS (selected by `.node-version` and the root `engines` field) and npm 11.12.1 (`packageManager`). Do not set the Vercel Root Directory to `client`; shared workspace packages must be built from the repository root.

### Vercel frontend

- Root Directory: `.` (repository root)
- Framework Preset: Vite
- Install Command: `npm ci --include=dev`
- Build Command: `npm run build --workspace=shared && npm run build --workspace=client`
- Output Directory: `client/dist`
- Environment Variable: `VITE_API_URL` = the Render service's public origin, without `/api/v1` (for example, `https://mapforge-api.onrender.com`)

`vercel.json` provides the SPA fallback so client-side routes also load on refresh. `VITE_API_URL` is public browser configuration; never put database credentials or JWT secrets in a `VITE_` variable.

### Render backend

Use the repository root as the service Root Directory. `render.yaml` defines the production build, start command, and `/health` check:

- Build Command: `npm ci --include=dev && npm run build --workspace=shared && npm run build --workspace=server`
- Start Command: `npm run start --workspace=server`
- Health Check Path: `/health`
- Required environment variables: `MONGODB_URI`, `CLIENT_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`
- `CLIENT_URL` must be the Vercel deployment origin. Render supplies `PORT`; the server binds to `0.0.0.0`.

The JWT secrets should be independent, high-entropy values. `GEOCODING_API_KEY` is optional and is only needed for a provider that requires it. Do not copy `.env` into either deployment or commit it.

## VPS Deployment

The following legacy VPS procedure remains available for self-hosted deployments.

---

## 1. Prerequisites

- A Linux server (Ubuntu 22.04 LTS or 24.04 LTS recommended)
- Node.js 24.x LTS and npm 11.12.1
- PM2 process manager (`npm install -g pm2`)
- Nginx web server
- Free MongoDB Atlas Cluster (or local MongoDB service)
- A domain name pointing to your server's public IP

---

## 2. Environment Configuration

Clone the repository and create the production `.env` file:
```bash
git clone https://github.com/your-username/mapforge.git /var/www/mapforge
cd /var/www/mapforge
cp .env.example .env
nano .env
```

Ensure the following production values are configured:
```ini
NODE_ENV=production
PORT=5000
CLIENT_URL=https://mapforge.yourdomain.com
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/mapforge?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your_super_strong_random_access_secret_here
JWT_REFRESH_SECRET=your_super_strong_random_refresh_secret_here
COOKIE_ORIGIN=https://mapforge.yourdomain.com
MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
```

---

## 3. Install Dependencies & Build

```bash
npm ci --include=dev
npm run build
```

This compiles:
1. `@mapforge/shared` into `shared/dist`
2. `@mapforge/server` into `server/dist`
3. `@mapforge/client` into `client/dist` (static production bundle)

---

## 4. PM2 Process Management

Start the backend with PM2:
```bash
cd /var/www/mapforge/server
pm2 start dist/server.js --name "mapforge-backend"
pm2 save
pm2 startup
```

Verify backend health:
```bash
curl http://localhost:5000/health
curl http://localhost:5000/ready
```

---

## 5. Nginx Reverse Proxy Configuration

Create an Nginx server block at `/etc/nginx/sites-available/mapforge`:
```nginx
server {
    server_name mapforge.yourdomain.com;

    # Frontend Static Single Page Application
    root /var/www/mapforge/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend REST API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Real-Time Collaborative WebSockets (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/mapforge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. HTTPS Configuration with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mapforge.yourdomain.com
```

---

## 7. Database Backup & Restore Procedures

### Backup MongoDB Atlas Cluster
```bash
mongodump --uri="mongodb+srv://<username>:<password>@cluster0.mongodb.net/mapforge" --out=/var/backups/mapforge-$(date +%F)
```

### Restore Database
```bash
mongorestore --uri="mongodb+srv://<username>:<password>@cluster0.mongodb.net/mapforge" /var/backups/mapforge-2026-10-30/mapforge
```
