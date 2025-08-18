# Surge - AI Coding Agent Instructions

## Project Overview
Surge is an IT documentation search tool built for Docker with Ollama integration. The platform enables searching through various document formats (PDFs, Office documents, images with text) and provides AI-powered responses when documentation is insufficient.

## Architecture & Components

### Core Architecture
- **Frontend**: React 18-based SPA with Material-UI design system
- **Backend**: Node.js/Express REST API
- **Database**: MongoDB with Mongoose for document metadata
- **AI Integration**: Ollama with Mistral 7B model
- **Document Storage**: File system with MongoDB metadata

### Key Services
- `frontend/src/services/pwaService.js`: Handles PWA capabilities and offline support
- `frontend/src/services/analyticsService.js`: Usage tracking and insights
- `frontend/src/services/offlineStorageService.js`: IndexedDB for offline functionality

## Development Workflow

### Setup and Build
1. Start environment: `docker compose up -d`
2. Frontend development:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Backend development:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

### Project Conventions

#### Frontend
- Use Material-UI components from design system (`frontend/src/theme/designSystem.js`)
- Follow component architecture:
  - Pages in `frontend/src/pages/`
  - Reusable components in `frontend/src/components/`
  - Services in `frontend/src/services/`
  - State management through React Context

#### Backend
- RESTful API design with structured JSON responses
- Error handling through middleware
- MongoDB schema validation using Mongoose
- Background jobs using Redis+Bull

## Testing & Quality
- Run tests before commits: `npm test`
- Ensure lint compliance: `npm run lint`
- Follow established patterns in `backend/src/tests/` for test structure
- Use Jest for unit tests and integration tests

## Known Integration Points
- Active Directory/LDAP for enterprise authentication
- Document Management Systems (SharePoint, etc.)
- Project Management tools via webhooks
- ITSM systems for incident/change management

## Additional Notes
- Check `docs/progress.md` for current project status
- Refer to `docs/cline-ai-rules.md` for detailed coding standards
- Review `DEPLOYMENT_GUIDE.md` for architecture details and deployment steps
- Follow error handling patterns from existing services when adding new functionality
