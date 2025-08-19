# BitSurge - Installation Guide

BitSurge is an AI-powered document search and management platform built with React, Node.js, and Docker. This guide covers installation using Docker (recommended) and manual setup.

## 🚀 Quick Start with Installation Wizard

The easiest way to set up BitSurge is using our interactive installation wizard:

1. **Access the installer** at `/install` in your browser
2. **Follow the step-by-step configuration** wizard
3. **Download the generated docker-compose.yml** file
4. **Run Docker Compose** to start your instance

The installer will help you configure:
- Demo mode and basic settings
- Superuser administrator account
- AI provider selection (Google Gemini recommended)
- Network ports and security settings

Visit [bitsurge.io](https://bitsurge.io) for more information.

## Prerequisites
- **Docker and Docker Compose** (Required for Docker installation)
- **16GB+ RAM recommended** (Self-hosted AI models require significant memory)
- **Internet connection** for pulling Docker images and AI API access
- **Git** for cloning the repository (optional if using pre-built images)

## Docker Installation (Recommended)

### Method 1: Using Installation Wizard (Easiest)

1. **Pull and run the installer:**
```bash
docker run -p 3000:3000 bitsurge/installer:latest
```

2. **Open your browser** and go to `http://localhost:3000/install`

3. **Complete the configuration wizard** and download your custom docker-compose.yml

4. **Start your configured instance:**
```bash
docker compose up -d
```

### Method 2: Using Pre-configured Docker Compose

1. **Download the default configuration:**
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/steffmet/surge/main/docker-compose.yml
```

2. **Edit environment variables** (optional):
```bash
# Edit the docker-compose.yml file to configure:
# - SUPERUSER_EMAIL and SUPERUSER_PASSWORD
# - GOOGLE_API_KEY (for Google Gemini AI)
# - DEMO_MODE (true/false)
# - DEFAULT_AI_PROVIDER (google/self-hosted/openai/anthropic)
```

3. **Start the application:**
```bash
docker compose up -d
```

### Method 3: Clone and Build from Source

1. **Clone the repository:**
```bash
git clone https://github.com/steffmet/surge.git
cd surge
```

2. **Start the application:**
```bash
docker compose up -d
```

## 🔧 Configuration Options

### Demo Mode
Demo mode restricts certain operations to showcase the platform safely:
- File uploads disabled for regular users
- User creation disabled
- Password changes disabled
- Settings page read-only
- Only superuser can perform admin operations

Enable demo mode by setting `DEMO_MODE=true` in your environment variables.

### AI Provider Configuration

BitSurge supports multiple AI providers:

#### Google Gemini (Recommended)
- **Free tier available** with generous limits
- **Fast response times** with Gemini Flash
- **Easy setup** with just an API key

```yaml
environment:
  DEFAULT_AI_PROVIDER: google
  GOOGLE_API_KEY: your_api_key_here
```

Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

#### Self-Hosted Ollama
- **Completely free** and private
- **No API costs** or usage limits
- **Requires more system resources** (8GB+ RAM)

```yaml
environment:
  DEFAULT_AI_PROVIDER: self-hosted
  OLLAMA_HOST: http://ollama:11434
```

#### OpenAI
```yaml
environment:
  DEFAULT_AI_PROVIDER: openai
  OPENAI_API_KEY: your_api_key_here
```

#### Anthropic Claude
```yaml
environment:
  DEFAULT_AI_PROVIDER: anthropic
  ANTHROPIC_API_KEY: your_api_key_here
```

### Superuser Account
Configure a superuser account with full permissions:

```yaml
environment:
  SUPERUSER_EMAIL: admin@yourdomain.com
  SUPERUSER_PASSWORD: YourSecurePassword123!
  SUPERUSER_NAME: "System Administrator"
```

The superuser account can:
- Access all features even in demo mode
- Create and manage users
- Modify system settings
- Upload and manage documents
- Create and manage workspaces

## 📋 First-Time Setup

### 1. Wait for Initialization
First-time setup may take 5-10 minutes due to:
- Docker image downloads
- Database initialization
- AI model downloads (if using self-hosted)

### 2. Monitor Progress
```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f

# Check specific service
docker compose logs backend
```

### 3. Access the Application
Once ready, access BitSurge at:
```
http://localhost
```

### 4. Login
Use your configured superuser credentials or the default demo accounts:

**Demo Mode Default Accounts:**
- **Admin:** admin@surge.local / admin123
- **User:** user@surge.local / user123

**⚠️ Security:** Change default passwords immediately in production!

## 🛠 Manual Installation (Advanced)

For development or custom deployment scenarios:

### Prerequisites
- **Node.js 18+** with npm/yarn
- **MongoDB 6.0+** 
- **Ollama** (if using self-hosted AI)

### Backend Setup
```bash
git clone https://github.com/steffmet/surge.git
cd surge/backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

npm run dev
```

### Frontend Setup
```bash
cd ../frontend
npm install
npm run build  # for production
npm run dev    # for development
```

### Web Server Configuration (Production)
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

## 🔍 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
netstat -an | grep :80

# Use different ports in docker-compose.yml
ports:
  - "8080:80"  # Frontend
  - "3001:3000"  # Backend
```

#### Memory Issues
```bash
# Check Docker memory usage
docker stats

# Increase Docker Desktop memory (8GB+ recommended)
```

#### AI Provider Issues
```bash
# Test Google Gemini API
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://generativelanguage.googleapis.com/v1/models"

# Check Ollama status
docker compose exec ollama ollama list
```

#### Database Connection
```bash
# Check MongoDB logs
docker compose logs mongodb

# Verify connection
docker compose exec backend npm run test:db
```

### Useful Commands

```bash
# Complete restart
docker compose down && docker compose up -d

# Rebuild after changes
docker compose down && docker compose up --build -d

# Reset everything (removes data!)
docker compose down -v

# View resource usage
docker stats

# Clean up Docker
docker system prune -f
```

## 📈 Next Steps

After installation:

1. **🔐 Security:** Change default passwords and configure JWT secrets
2. **📁 Test Upload:** Upload sample documents to verify functionality  
3. **👥 User Management:** Create user accounts in Admin > Users
4. **⚙️ System Settings:** Configure preferences in Admin > Settings
5. **🤖 AI Testing:** Test search with AI-powered responses
6. **💾 Backup Setup:** Configure backups for documents and database
7. **📊 Monitoring:** Set up log monitoring and alerts

## 🆘 Getting Help

- **Documentation:** Visit [bitsurge.io](https://bitsurge.io) for comprehensive guides
- **GitHub Issues:** [github.com/steffmet/surge/issues](https://github.com/steffmet/surge/issues)
- **Community:** Join our community discussions
- **Enterprise Support:** Contact us for enterprise deployment assistance

## 🚀 Upgrading

To upgrade to a newer version:

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose pull
docker compose up --build -d
```

**Powered by [BitSurge.io](https://bitsurge.io) - AI-Powered Documentation Search**
