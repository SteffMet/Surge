# BitSurge Installer Deployment

This guide covers two methods to deploy the BitSurge installation wizard:

1. **Integrated Installer** (Recommended - Already Available)
2. **Standalone Installer** (For dedicated install subdomain)

## Option 1: Integrated Installer (Recommended)

The installation wizard is already built into the main BitSurge application and accessible at `/install`.

### Quick Setup:
1. Deploy the main BitSurge application using existing docker images:
   ```bash
   # Use existing images - no custom build needed
   docker-compose up -d
   ```

2. Access the installer at: `http://your-domain.com/install`

### For install.bitsurge.io setup:
1. Point your DNS `install.bitsurge.io` to your server
2. Configure nginx/reverse proxy to route to the main app
3. Access installation wizard at: `https://install.bitsurge.io/install`

#### Nginx Configuration Example:
```nginx
server {
    listen 80;
    server_name install.bitsurge.io;
    
    location / {
        proxy_pass http://localhost:3000; # Your main BitSurge app
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Option 2: Standalone Installer

For a dedicated installer service that only serves the installation wizard.

### Build & Deploy:

1. **Build the installer image:**
   ```bash
   cd installer
   docker build -t bitsurge/installer:latest .
   ```

2. **Run the installer:**
   ```bash
   docker run -d \
     --name bitsurge-installer \
     -p 80:80 \
     bitsurge/installer:latest
   ```

3. **Or use docker-compose:**
   ```yaml
   # installer-compose.yml
   version: '3.8'
   services:
     installer:
       build: ./installer
       container_name: bitsurge-installer
       ports:
         - "80:80"
       restart: unless-stopped
   ```

### Publishing to Docker Hub:

1. **Build and tag:**
   ```bash
   docker build -t bitsurge/installer:latest ./installer
   docker tag bitsurge/installer:latest bitsurge/installer:v1.0.0
   ```

2. **Push to registry:**
   ```bash
   docker push bitsurge/installer:latest
   docker push bitsurge/installer:v1.0.0
   ```

## Deployment Recommendations

### For Production (install.bitsurge.io):

**Option 1 is recommended** because:
- ✅ Uses existing, tested Docker images
- ✅ No additional build/maintenance overhead  
- ✅ Single application to manage
- ✅ Installation wizard is fully functional at `/install`

### Quick Deployment Steps:
1. Set up your server with Docker
2. Point `install.bitsurge.io` DNS to your server
3. Deploy main BitSurge app (already has installer built-in)
4. Configure reverse proxy to route traffic
5. Access installer at `https://install.bitsurge.io/install`

### SSL Certificate:
```bash
# Using certbot for Let's Encrypt
sudo certbot --nginx -d install.bitsurge.io
```

The integrated installer includes all the same functionality as the standalone version:
- ✅ Step-by-step configuration wizard
- ✅ Demo mode setup
- ✅ Superuser account creation  
- ✅ AI provider configuration (Google Gemini default)
- ✅ Port configuration
- ✅ Docker-compose.yml generation
- ✅ BitSurge.io branding

## Summary

- **Use Option 1** for quick deployment with existing images
- **Use Option 2** only if you need a completely separate installer service
- The installer at `/install` in the main app has full functionality
- No need to build custom images unless you want standalone deployment