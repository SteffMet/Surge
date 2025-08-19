# BitSurge Installer Server Setup Guide

Complete guide to set up install.bitsurge.io on your server with analytics tracking.

## 🚀 Quick Setup (Recommended - Using Existing App)

### Step 1: Server Setup
```bash
# Update your server
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### Step 2: Domain Configuration
```bash
# Point your DNS A record
install.bitsurge.io -> YOUR_SERVER_IP
```

### Step 3: Deploy BitSurge with Installer
```bash
# Create project directory
mkdir -p /opt/bitsurge-installer
cd /opt/bitsurge-installer

# Download your docker-compose.yml (modify ports for installer)
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    container_name: installer-mongodb
    volumes:
      - installer-mongo-data:/data/db
    networks:
      - installer-network
    restart: unless-stopped

  backend:
    image: steffmet/surge-backend:latest
    container_name: installer-backend
    volumes:
      - installer-storage:/app/storage
    ports:
      - "3001:3000"
    depends_on:
      - mongodb
    networks:
      - installer-network
    restart: unless-stopped
    environment:
      NODE_ENV: production
      MONGO_URI: mongodb://mongodb:27017/bitsurge-installer
      JWT_SECRET: your-secure-jwt-secret-here
      JWT_EXPIRATION: 24h
      DEMO_MODE: "false"
      SUPERUSER_EMAIL: admin@bitsurge.io
      SUPERUSER_PASSWORD: your-admin-password
      SUPERUSER_NAME: "Installer Admin"
      DEFAULT_AI_PROVIDER: google
      STORAGE_PATH: /app/storage

  frontend:
    image: steffmet/surge-frontend:latest
    container_name: installer-frontend
    ports:
      - "8080:80"
    depends_on:
      - backend
    networks:
      - installer-network
    restart: unless-stopped

networks:
  installer-network:
    driver: bridge

volumes:
  installer-mongo-data:
  installer-storage:
EOF

# Start the services
docker-compose up -d
```

### Step 4: Nginx Reverse Proxy
```bash
# Install nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Create nginx config
sudo tee /etc/nginx/sites-available/install.bitsurge.io << 'EOF'
server {
    listen 80;
    server_name install.bitsurge.io;

    # Redirect all traffic to /install
    location / {
        return 302 /install;
    }

    # Serve the installer page
    location /install {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints for analytics
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Analytics dashboard (password protected)
    location /analytics {
        auth_basic "Analytics Dashboard";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/install.bitsurge.io /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Create analytics dashboard password
sudo htpasswd -c /etc/nginx/.htpasswd admin
```

### Step 5: SSL Certificate
```bash
# Get SSL certificate
sudo certbot --nginx -d install.bitsurge.io

# Auto-renewal (already set up by certbot)
sudo systemctl enable certbot.timer
```

## 📊 Analytics Features

### What's Tracked:
- ✅ **Visitor Sessions**: Unique users visiting the installer
- ✅ **Step Completion**: Which steps users complete/abandon  
- ✅ **AI Provider Choices**: Which AI providers users prefer
- ✅ **Installation Downloads**: How many complete the setup
- ✅ **Conversion Rates**: Percentage who finish the installation
- ✅ **Performance Metrics**: Page load times and user experience
- ✅ **Geographic Data**: Country/region (from IP, anonymized)

### Privacy Features:
- 🔐 **No Personal Data**: No emails, names, or API keys stored
- 🔐 **Session-Based**: Only anonymous session IDs tracked
- 🔐 **Local Storage**: All data stored on your server
- 🔐 **GDPR Compliant**: No cookies, no tracking across sites

### Analytics Dashboard:
Access at: `https://install.bitsurge.io/analytics`
- Username: `admin` 
- Password: (what you set during setup)

## 🔧 Alternative: Standalone Installer

If you prefer a completely separate installer service:

```bash
# Clone your installer code
git clone https://github.com/your-repo/surge.git
cd surge/installer

# Build and deploy
docker build -t bitsurge/installer:latest .
docker run -d \
  --name bitsurge-installer \
  -p 80:80 \
  -v installer-analytics:/app/analytics-data \
  bitsurge/installer:latest
```

## 🎯 Testing Your Setup

1. **Basic Test**: Visit `https://install.bitsurge.io`
2. **Installer Test**: Should redirect to installation wizard
3. **Analytics Test**: Visit `https://install.bitsurge.io/analytics`
4. **API Test**: Check network tab for analytics calls

## 📈 Monitoring

### View Analytics Data:
```bash
# Check analytics files
sudo docker exec installer-backend ls -la /app/analytics-data/

# View recent events
sudo docker exec installer-backend tail -f /app/analytics-data/events.jsonl

# Check daily summary
sudo docker exec installer-backend cat /app/analytics-data/daily-summary.json
```

### Log Monitoring:
```bash
# Check installer logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Maintenance

### Updates:
```bash
# Update installer images
cd /opt/bitsurge-installer
docker-compose pull
docker-compose up -d

# Backup analytics data
sudo cp -r /var/lib/docker/volumes/installer-storage/_data/analytics-data ~/analytics-backup-$(date +%Y%m%d)
```

### Analytics Retention:
- Events are stored in JSONL format for easy processing
- Daily summaries provide quick insights
- Set up log rotation to manage disk space

## 🎉 You're Done!

Your install.bitsurge.io is now live with:
- ✅ Public installation wizard
- ✅ Analytics tracking
- ✅ SSL security
- ✅ Professional dashboard
- ✅ User privacy protection

Users can now visit `https://install.bitsurge.io` to configure and download their BitSurge setup!