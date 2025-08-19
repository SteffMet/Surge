# 🚀 BitSurge Advanced Documentation Platform - Deployment Guide

## Overview

BitSurge has been successfully transformed from a basic IT documentation search tool into an **enterprise-grade collaborative documentation platform** competitive with industry leaders like Notion, GitBook, and Confluence.

**Powered by [BitSurge.io](https://bitsurge.io) - AI-Powered Documentation Search**

## 🎯 Latest Features & Updates

### ✅ Demo Mode & Superuser System
- **Demo Mode**: Restricts file uploads, user creation, and password changes for safe demonstration
- **Superuser Role**: Full administrative access even in demo mode
- **Environment-based Configuration**: Superuser credentials configured via Docker environment variables
- **Installation Wizard**: Interactive setup page for easy deployment configuration

### ✅ Enhanced AI Integration
- **Google Gemini Support**: Fast, cost-effective AI with generous free tier
- **Multi-provider Support**: OpenAI, Anthropic Claude, self-hosted Ollama
- **Default AI Configuration**: Pre-configured Google Gemini for optimal performance
- **API Key Management**: Secure configuration through environment variables

### ✅ Core Platform Enhancements
- **Real-time Collaboration**: WebSocket-powered live editing with user presence indicators
- **Document Versioning**: Git-like version control with diff tracking using jsondiffpatch
- **Advanced AI Search**: Semantic similarity search with multiple AI providers
- **Rich Text Editor**: TipTap-powered editor with Mermaid diagrams, KaTeX math, and interactive content
- **Analytics Dashboard**: Comprehensive analytics with charts using Recharts

### ✅ Enterprise Features
- **Security & Encryption**: AES-256-GCM encrypted password vaults with time-based access controls
- **Export System**: Professional PDF, Word, and Markdown export with branding
- **Template Engine**: Dynamic template system with variable substitution
- **White-label Branding**: Complete customization with CSS generation and theme management
- **Offline PWA**: Service workers, background sync, and IndexedDB storage

## 🏗️ Architecture Overview

### Backend Stack
- **Node.js + Express**: High-performance REST API with demo mode restrictions
- **MongoDB + Mongoose**: Document database with role-based access control
- **Socket.IO**: Real-time WebSocket communication
- **Redis + Bull**: Job queuing and caching
- **PM2**: Process management with load balancing
- **Multi-AI Integration**: Google Gemini, OpenAI, Anthropic, Ollama support

### Frontend Stack
- **React 18**: Modern component-based UI with demo mode awareness
- **Material-UI**: Professional design system with read-only states
- **TipTap**: Rich text editing with collaborative extensions
- **Recharts**: Advanced data visualization
- **Service Workers**: PWA capabilities and offline support

## 🚀 Quick Deployment with Installation Wizard

### Method 1: Interactive Setup (Recommended)

1. **Access the Installation Wizard:**
   ```bash
   # Option 1: Use hosted installer
   open https://install.bitsurge.io
   
   # Option 2: Run local installer
   docker run -p 3000:3000 bitsurge/installer:latest
   open http://localhost:3000/install
   ```

2. **Configure your deployment:**
   - Basic settings (site name, demo mode)
   - Superuser account creation
   - AI provider selection (Google Gemini recommended)
   - Network ports and security

3. **Download generated docker-compose.yml**

4. **Deploy your instance:**
   ```bash
   docker compose up -d
   ```

### Method 2: Docker Compose Deployment

#### Environment Setup

Create a docker-compose.yml with the following configuration:

```yaml
services:
  mongodb:
    image: mongo:latest
    container_name: bitsurge-mongodb
    volumes:
      - bitsurge-mongo-data:/data/db
    ports:
      - "27017:27017"
    networks:
      - bitsurge-network
    restart: unless-stopped

  backend:
    image: bitsurge/backend:latest
    container_name: bitsurge-backend
    volumes:
      - bitsurge-document-storage:/app/storage
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
    networks:
      - bitsurge-network
    restart: unless-stopped
    environment:
      NODE_ENV: production
      MONGO_URI: mongodb://mongodb:27017/bitsurge
      JWT_SECRET: your_secure_jwt_secret_change_this
      JWT_EXPIRATION: 24h
      
      # Demo Mode Configuration
      DEMO_MODE: "true"  # Set to false for production
      
      # Superuser Configuration
      SUPERUSER_EMAIL: admin@yourdomain.com
      SUPERUSER_PASSWORD: YourSecurePassword123!
      SUPERUSER_NAME: "System Administrator"
      
      # AI Provider Configuration (Google Gemini recommended)
      DEFAULT_AI_PROVIDER: google
      GOOGLE_API_KEY: your_google_gemini_api_key_here
      
      # Alternative AI Providers
      # OPENAI_API_KEY: your_openai_key
      # ANTHROPIC_API_KEY: your_anthropic_key
      
      # Self-hosted Ollama (if preferred)
      OLLAMA_HOST: http://ollama:11434
      OLLAMA_MODEL: mistral
      
      STORAGE_PATH: /app/storage

  frontend:
    image: bitsurge/frontend:latest
    container_name: bitsurge-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - bitsurge-network
    restart: unless-stopped

  # Optional: Include Ollama for self-hosted AI
  ollama:
    image: ollama/ollama:latest
    container_name: bitsurge-ollama
    volumes:
      - bitsurge-ollama-models:/root/.ollama
    ports:
      - "11434:11434"
    networks:
      - bitsurge-network
    restart: unless-stopped
    environment:
      OLLAMA_KEEP_ALIVE: 1s
      NUM_THREAD: 8
    deploy:
      resources:
        limits:
          memory: 8G

networks:
  bitsurge-network:
    driver: bridge

volumes:
  bitsurge-mongo-data:
  bitsurge-ollama-models:
  bitsurge-document-storage:
```

#### Start the Application

```bash
docker compose up -d
```

## 🔐 Security Configuration

### Demo Mode Setup
Demo mode is perfect for:
- **Product demonstrations** and trials
- **Training environments** and sandboxes  
- **Public showcases** without data concerns
- **Testing new features** safely

Configure demo mode:
```yaml
environment:
  DEMO_MODE: "true"
  SUPERUSER_EMAIL: admin@yourdomain.com
  SUPERUSER_PASSWORD: SecurePassword123!
```

### Production Security
For production deployments:

1. **Disable demo mode:**
   ```yaml
   DEMO_MODE: "false"
   ```

2. **Generate secure JWT secret:**
   ```bash
   openssl rand -base64 64
   ```

3. **Configure strong passwords:**
   - Minimum 12 characters
   - Mix of upper/lower case, numbers, symbols
   - Unique for each environment

4. **Set up SSL/TLS:**
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/private.key;
       # ... rest of nginx config
   }
   ```

## 🤖 AI Provider Configuration

### Google Gemini (Recommended)
Best for most deployments:
- **Free tier:** 15 requests/minute
- **Fast responses:** Gemini Flash model
- **Cost-effective:** $0.075/1M input tokens (paid tier)

Setup:
1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Configure in environment:
   ```yaml
   DEFAULT_AI_PROVIDER: google
   GOOGLE_API_KEY: AIza...your_key_here
   ```

### Self-Hosted Ollama
Best for privacy-conscious deployments:
- **Completely free** with no API costs
- **Full data privacy** - no external API calls
- **Requires more resources** (8GB+ RAM recommended)

Setup:
```yaml
DEFAULT_AI_PROVIDER: self-hosted
OLLAMA_HOST: http://ollama:11434
OLLAMA_MODEL: mistral
```

### OpenAI
Best for advanced features:
```yaml
DEFAULT_AI_PROVIDER: openai
OPENAI_API_KEY: sk-...your_key_here
```

### Anthropic Claude
Best for long-form content:
```yaml
DEFAULT_AI_PROVIDER: anthropic
ANTHROPIC_API_KEY: sk-ant-...your_key_here
```

## � Monitoring & Analytics

### Health Checks
```bash
# Check application status
curl http://localhost:3000/api/health

# Monitor containers
docker compose ps
docker compose logs -f

# Check AI provider connectivity
curl http://localhost:3000/api/ai/health
```

### Built-in Analytics
BitSurge includes comprehensive analytics:
- User engagement metrics
- Document performance tracking
- Search query analysis
- AI usage statistics
- System performance monitoring

Access analytics at: `/admin/analytics`

## 🛠️ Maintenance & Updates

### Regular Maintenance
```bash
# Update to latest version
docker compose pull
docker compose up -d

# Backup data
docker compose exec mongodb mongodump --out /backup
docker cp bitsurge-mongodb:/backup ./mongodb-backup

# Clean up old images
docker image prune -f
```

### Database Maintenance
```bash
# Compact database
docker compose exec mongodb mongo bitsurge --eval "db.runCommand({compact: 'documents'})"

# Check indexes
docker compose exec mongodb mongo bitsurge --eval "db.documents.getIndexes()"
```

## 🔧 Troubleshooting

### Common Issues

#### Demo Mode Not Working
```bash
# Check environment variable
docker compose exec backend env | grep DEMO_MODE

# Verify superuser creation
docker compose logs backend | grep "Superuser created"
```

#### AI Provider Issues
```bash
# Test Google Gemini
curl -H "x-goog-api-key: YOUR_API_KEY" \
  "https://generativelanguage.googleapis.com/v1/models"

# Check Ollama models
docker compose exec ollama ollama list

# View AI service logs
docker compose logs backend | grep -i "ai\|ollama\|gemini"
```

#### Permission Issues
```bash
# Check user roles
docker compose exec mongodb mongo bitsurge --eval "db.users.find({}, {email:1, role:1})"

# Verify superuser permissions
docker compose logs backend | grep "superuser"
```

### Performance Optimization

For high-traffic deployments:

1. **Scale backend instances:**
   ```yaml
   backend:
     deploy:
       replicas: 3
   ```

2. **Add Redis caching:**
   ```yaml
   redis:
     image: redis:alpine
     volumes:
       - redis-data:/data
   ```

3. **Configure load balancer:**
   ```nginx
   upstream backend {
       server backend1:3000;
       server backend2:3000;
       server backend3:3000;
   }
   ```

## 📈 Success Metrics

BitSurge deployment success indicators:

### Technical Metrics
- ✅ All containers running and healthy
- ✅ Database connectivity established
- ✅ AI provider responding successfully
- ✅ WebSocket connections working
- ✅ File uploads functioning (if not in demo mode)

### Business Metrics
- User adoption and engagement
- Document creation and collaboration rates
- Search query success rates
- AI feature utilization
- System uptime and performance

## 🎯 Next Steps

After successful deployment:

1. **🔐 Security Review:**
   - Change default passwords
   - Configure SSL certificates
   - Set up firewall rules
   - Enable audit logging

2. **👥 User Onboarding:**
   - Create user accounts
   - Set up workspaces
   - Import existing documents
   - Train users on features

3. **📊 Monitoring Setup:**
   - Configure alerting
   - Set up backup schedules
   - Monitor resource usage
   - Track key metrics

4. **🚀 Optimization:**
   - Fine-tune AI responses
   - Customize branding
   - Configure integrations
   - Scale based on usage

## 📞 Support & Resources

- **Documentation:** [bitsurge.io/docs](https://bitsurge.io/docs)
- **Installation Wizard:** [install.bitsurge.io](https://install.bitsurge.io)
- **GitHub Repository:** [github.com/steffmet/surge](https://github.com/steffmet/surge)
- **Community Support:** [community.bitsurge.io](https://community.bitsurge.io)
- **Enterprise Support:** [bitsurge.io/contact](https://bitsurge.io/contact)

## Conclusion

BitSurge has evolved into a **world-class documentation platform** that combines:

- **🤖 Advanced AI Integration** with multiple provider support
- **🔒 Enterprise Security** with demo mode capabilities  
- **⚙️ Easy Deployment** with interactive installation wizard
- **📊 Comprehensive Analytics** for data-driven insights
- **🚀 Scalable Architecture** for organizations of any size

The platform is now ready for **production deployment** and offers a **competitive alternative** to established documentation platforms while maintaining **ease of use** and **cost effectiveness**.

**Powered by [BitSurge.io](https://bitsurge.io) - The Future of AI-Powered Documentation**