# Surge - Admin Guide

## Introduction
This guide is intended for administrators of Surge. It covers advanced configuration, maintenance, and troubleshooting tasks.

## Initial Setup

### First-time Login
After installation, log in with the default admin credentials:
- Email: admin@surge.local
- Password: admin123

**Important:** Change the default password immediately after first login.

### System Configuration
Navigate to "Admin" > "Settings" to configure:
1. **General Settings**
   - Application name
   - Logo
   - Theme
   - Language

2. **Search Settings**
   - Search result limit
   - AI response confidence threshold
   - Search history retention period

3. **Storage Settings**
   - Document storage path
   - Maximum file size
   - Allowed file types

4. **Ollama Settings**
   - Model selection
   - Temperature
   - Context length
   - Response length

## User Management

### Creating Users
1. Navigate to "Admin" > "Users"
2. Click "Add User"
3. Fill in the required fields:
   - Username
   - Email
   - Password
   - Role (Basic, Basic with Upload, Admin)
4. Click "Create"

### Managing User Permissions
1. Navigate to "Admin" > "Users"
2. Click on a user
3. Modify their role
4. Click "Save"

### Bulk User Import
1. Navigate to "Admin" > "Users"
2. Click "Import Users"
3. Download the template CSV
4. Fill in the user details
5. Upload the CSV
6. Review and confirm

## Document Management

### Storage Configuration
The document storage is configured in the Docker Compose file. By default, documents are stored in a Docker volume.

To change the storage location:
1. Edit the `docker-compose.yml` file
2. Modify the volume mapping for the backend service
3. Restart the application

### Document Pre-caching
Pre-caching analyzes documents and generates potential questions and answers to improve search performance.

To run pre-caching:
1. Navigate to "Admin" > "Settings" > "Pre-caching"
2. Click "Start Pre-caching"
3. Monitor the progress

To schedule automatic pre-caching:
1. Navigate to "Admin" > "Settings" > "Pre-caching"
2. Enable "Scheduled Pre-caching"
3. Set the frequency (daily, weekly, monthly)
4. Set the time

### Document Indexing
The system automatically indexes documents when they are uploaded. To re-index all documents:
1. Navigate to "Admin" > "Settings" > "Indexing"
2. Click "Re-index All Documents"
3. Monitor the progress

## Audit Logging

### Viewing Audit Logs
1. Navigate to "Admin" > "Audit Logs"
2. Use filters to narrow down the logs:
   - User
   - Action type
   - Date range
   - Resource type

### Exporting Audit Logs
1. Navigate to "Admin" > "Audit Logs"
2. Apply desired filters
3. Click "Export"
4. Choose the format (CSV, JSON)
5. Click "Download"

## Maintenance

### Database Maintenance
MongoDB maintenance is handled automatically. However, you can perform manual maintenance:

1. Connect to the MongoDB container:
   ```bash
   docker-compose exec mongodb mongo
   ```

2. Run database maintenance commands as needed.

### Updating the Application
To update to a newer version:
```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### Updating Ollama Models
To update or change the Ollama model:
1. Navigate to "Admin" > "Settings" > "Ollama"
2. Select a different model
3. Click "Save"
4. The system will download the new model if needed

## Troubleshooting

### Common Issues

#### Search Not Working
1. Check if the Ollama container is running:
   ```bash
   docker-compose ps ollama
   ```
2. Check Ollama logs:
   ```bash
   docker-compose logs ollama
   ```
3. Restart the Ollama container:
   ```bash
   docker-compose restart ollama
   ```

#### Document Upload Failures
1. Check storage space:
   ```bash
   docker-compose exec backend df -h
   ```
2. Check file permissions:
   ```bash
   docker-compose exec backend ls -la /app/storage
   ```
3. Check upload logs:
   ```bash
   docker-compose logs backend | grep upload
   ```

#### User Authentication Issues
1. Check authentication logs:
   ```bash
   docker-compose logs backend | grep auth
   ```
2. Reset a user's password:
   - Navigate to "Admin" > "Users"
   - Click on the user
   - Click "Reset Password"
   - Set a new password
   - Click "Save"

### System Logs
To view system logs:
```bash
docker-compose logs
```

To view logs for a specific service:
```bash
docker-compose logs [service_name]
```

### Performance Tuning
If the application is running slowly:

1. Check resource usage:
   ```bash
   docker stats
   ```

2. Increase resources in the Docker Compose file:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 4G
   ```

3. Optimize MongoDB:
   - Add indexes for frequently queried fields
   - Increase MongoDB cache size

4. Optimize Ollama:
   - Use a smaller model
   - Reduce context length
   - Adjust temperature settings

## Advanced Configuration

### Environment Variables
The application can be configured using environment variables in the `.env` file:

```
# MongoDB
MONGO_URI=mongodb://mongodb:27017/surge

# JWT Authentication
JWT_SECRET=your_secret_key
JWT_EXPIRATION=24h

# Ollama
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=mistral
OLLAMA_TEMPERATURE=0.7
OLLAMA_MAX_TOKENS=1024

# Storage
STORAGE_PATH=/app/storage
MAX_FILE_SIZE=100MB
```

### Custom SSL Configuration
To use custom SSL certificates:

1. Place your certificates in the `docker/nginx/ssl` directory
2. Update the Nginx configuration in `docker/nginx/nginx.conf`
3. Restart the application

### Backup Configuration
Although not implemented in the current version, you can set up manual backups:

1. For MongoDB:
   ```bash
   docker-compose exec mongodb mongodump --out /backup
   docker cp $(docker-compose ps -q mongodb):/backup ./backup
   ```

2. For document storage:
   ```bash
   docker cp $(docker-compose ps -q backend):/app/storage ./storage_backup