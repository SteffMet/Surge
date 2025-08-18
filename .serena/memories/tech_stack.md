# Tech Stack and Dependencies

## Backend Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs for password hashing
- **Validation**: express-validator for input validation
- **AI/ML**: Ollama integration for local LLM and embedding models
- **File Processing**: Multer for uploads, AdmZip for archives
- **Real-time**: Socket.io for collaborative features
- **Process Management**: PM2 for production deployment
- **Worker Architecture**: Separate workers for embedding and search operations

## Frontend Technology Stack
- **Framework**: React 18.3.1
- **UI Library**: Material-UI (MUI) v6 with Emotion for styling
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM v6
- **Rich Text Editor**: TipTap v2 with collaboration extensions
- **Real-time**: Socket.io client for collaboration
- **HTTP Client**: Axios for API communication
- **Notifications**: Notistack for user feedback
- **Charts**: Recharts for analytics visualization
- **PWA**: Workbox for offline capabilities
- **Date/Time**: Moment.js for date handling
- **File Handling**: React Dropzone for drag-and-drop uploads

## Development Tools
- **Testing**: Jest with React Testing Library
- **Build Tools**: Create React App (react-scripts)
- **Linting**: ESLint with react-app configuration
- **Package Management**: npm
- **Containerization**: Docker with docker-compose

## Key Libraries for Features
- **Collaboration**: Yjs for real-time document synchronization
- **Diagrams**: Mermaid for diagram rendering
- **Encryption**: crypto-js for secure vault functionality
- **Code Syntax**: React Syntax Highlighter with Lowlight
- **File Diffing**: diff library for version comparison