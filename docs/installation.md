# Surge - Installation Guide

Surge is an AI-powered document search and management platform built with React, Node.js, and Docker. This guide covers installation using Docker (recommended) and manual setup.

## Prerequisites
- **Docker and Docker Compose** (Required for Docker installation)
- **16GB+ RAM recommended** (Ollama AI models require significant memory)
- **Internet connection** for pulling Docker images and Ollama models
- **Git** for cloning the repository

## Docker Installation (Recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/steffmet/surge.git
cd surge
```

**Note:** The official repository is hosted at `github.com/steffmet/surge`

### 2. Start the Application
Run the complete Docker setup:
```bash
docker compose up -d
```

This command will:
- Pull necessary Docker images (Node.js, MongoDB, Ollama, Nginx)
- Build the frontend and backend containers
- Start all services (frontend, backend, MongoDB, Ollama)
- Download the Ollama Mistral 7B model (first run only, ~4GB download)

**First-time setup may take 10-15 minutes** due to Docker image downloads and AI model setup.

### 3. Monitor the Setup
Check container status:
```bash
docker compose ps
```

View logs if needed:
```bash
docker compose logs -f
```

### 4. Access the Application
Once all containers are running and healthy, access the application at:
```
http://localhost
```

**Default admin credentials:**
- Username: `admin`
- Password: `admin123`

**⚠️ Security:** Change the default password immediately after first login.

## Manual Installation (Advanced)

For development or custom deployment scenarios, you can install Surge manually without Docker.

### Prerequisites
- **Node.js 18+** with npm/yarn
- **MongoDB 6.0+** running locally or accessible remotely
- **Ollama** installed and running with Mistral 7B model

### 1. Clone and Setup Backend
```bash
git clone https://github.com/steffmet/surge.git
cd surge/backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string and settings

# Start the backend
npm run dev
```

### 2. Setup Frontend
```bash
cd ../frontend
npm install

# Build for production
npm run build

# For development
npm run dev
```

### 3. Configure Ollama
Install Ollama and pull the required model:
```bash
ollama pull mistral
ollama serve
```

### 4. Setup Web Server (Production)
For production, serve the built frontend with a web server like Nginx:
```nginx
server {
    listen 80;
    root /path/to/surge/frontend/build;
    index index.html;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Manual Configuration

### MongoDB Configuration
MongoDB is configured with volume persistence by default. The data is stored in a Docker volume named `surge-mongo-data`.

### Ollama Model Configuration
The default model is Mistral 7B, which offers a good balance of performance and resource usage. To use a different model:

1. Edit the `.env` file:
```
OLLAMA_MODEL=llama3
```

2. Restart the Ollama container:
```bash
docker-compose restart ollama
```

### Document Storage
Documents are stored in a Docker volume named `surge-document-storage`. To use a different storage location:

1. Edit the `docker-compose.yml` file to map a host directory:
```yaml
volumes:
  - /path/on/host:/app/storage
```

2. Restart the application:
```bash
docker-compose down
docker-compose up -d
```

## Troubleshooting

### Common Docker Issues

#### Container Startup Problems
Check container status and logs:
```bash
# View all container status
docker compose ps

# View logs for all services
docker compose logs

# View logs for specific service
docker compose logs frontend
docker compose logs backend
docker compose logs mongodb
docker compose logs ollama
```

#### Port Conflicts
If port 80 is already in use:
```bash
# Check what's using port 80
netstat -an | grep :80
# or on Windows
netstat -an | findstr :80

# Edit docker-compose.yml to use different port
# Change ports: "8080:80" instead of "80:80"
```

#### Memory Issues
Ollama requires significant RAM. If containers are killed due to memory:
```bash
# Check Docker memory limits
docker stats

# Increase Docker Desktop memory allocation (Windows/Mac)
# Docker Desktop > Settings > Resources > Memory > 8GB+
```

#### Ollama Model Download Issues
If Ollama fails to download the model:
```bash
# Check Ollama logs
docker compose logs ollama

# Manually pull the model
docker compose exec ollama ollama pull mistral

# Verify model is available
docker compose exec ollama ollama list
```

### Docker Commands Reference

```bash
# Stop all services
docker compose down

# Rebuild and restart (after code changes)
docker compose down
docker compose up --build -d

# View real-time logs
docker compose logs -f

# Reset everything (removes volumes)
docker compose down -v
docker compose up --build -d

# Check resource usage
docker stats

# Clean up unused Docker resources
docker system prune -f
```

## Upgrading
To upgrade to a newer version:

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
## Next Steps

After successful installation:
1. **Change default admin password** in Profile settings
2. **Upload test documents** to verify search functionality
3. **Configure user accounts** in Admin > Users
4. **Customize settings** in Admin > Settings
5. **Set up backups** for document storage and MongoDB data

## Getting Help

- **GitHub Issues:** [github.com/steffmet/surge/issues](https://github.com/steffmet/surge/issues)
- **Documentation:** Check \docs/\ directory for more guides
- **Logs:** Always check \docker compose logs\ for error details
