# Surge - Installation Guide

## Prerequisites
- Docker and Docker Compose installed
- 16GB+ RAM recommended
- Internet connection for pulling Docker images and Ollama models

## Quick Start Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Steffmet/Surge.git
cd Surge
```

### 2. Configure Environment Variables
Copy the example environment file and modify as needed:
```bash
cp .env.example .env
```

Edit the `.env` file to configure:
- MongoDB connection settings
- Default admin credentials
- Storage paths
- Ollama model settings

### 3. Start the Application
```bash
docker-compose up -d
```

This command will:
- Pull necessary Docker images
- Build the application containers
- Start all services
- Download the Ollama Mistral 7B model (first run only)

### 4. Access the Application
Once all containers are running, access the application at:
```
http://localhost
```

The default admin credentials are:
- Username: admin
- Password: admin123

**Important:** Change the default password immediately after first login.

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

### Container Startup Issues
If containers fail to start:
```bash
docker-compose logs
```

### Ollama Model Download Issues
If the Ollama model fails to download:
```bash
docker-compose logs ollama
```

You can manually trigger a model download:
```bash
docker-compose exec ollama ollama pull mistral
```

### MongoDB Connection Issues
If the application cannot connect to MongoDB:
```bash
docker-compose logs mongodb
docker-compose logs backend
```

## Upgrading
To upgrade to a newer version:

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d