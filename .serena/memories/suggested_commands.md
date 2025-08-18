# Surge - Suggested Commands

## Development Commands

### Docker Environment (Recommended for Development)
```bash
# Start all services (MongoDB, Ollama, Backend, Frontend)
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Rebuild services after code changes
docker-compose up --build
```

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Initialize database with default admin user
npm run init-db

# Start backend in development mode
npm run dev

# Run tests
npm run test:advanced
npm run test:integration
npm run test:unit
npm run test:coverage

# Start with PM2 (production)
npm run pm2:start
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Database Operations
```bash
# Start MongoDB (if not using Docker)
sudo systemctl start mongod

# Connect to MongoDB shell
mongo surge

# Backup database
mongodump --db surge --out ./backup

# Restore database
mongorestore --db surge ./backup/surge
```

### Useful System Commands (Windows)
```powershell
# Find processes using a port
netstat -ano | findstr :3000

# Kill a process by PID
taskkill /PID <pid> /F

# Check Docker status
docker --version
docker-compose --version

# View running containers
docker ps

# Clear Docker cache
docker system prune
```

## Common Development Tasks
- **Add new API route**: Create in `backend/src/api/routes/`
- **Add new React component**: Create in `frontend/src/components/`
- **Database migrations**: Use scripts in `backend/src/scripts/`
- **Testing**: Use Jest for both backend and frontend
- **Environment**: Copy `.env.example` to `.env` and modify