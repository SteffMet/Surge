# Code Style and Conventions

## Backend (Node.js/Express)

### File Structure
- **Routes**: `backend/src/api/routes/` - Express route handlers
- **Models**: `backend/src/models/` - Mongoose schemas and models
- **Middleware**: `backend/src/middleware/` - Authentication, validation, error handling
- **Services**: `backend/src/services/` - Business logic and external integrations
- **Utils**: `backend/src/utils/` - Helper functions and utilities
- **Workers**: `backend/src/workers/` - Background processing workers
- **Tests**: `backend/src/tests/` - Jest test files

### Coding Conventions
- **Module Exports**: Use `module.exports` (CommonJS)
- **Error Handling**: Use try-catch blocks with standardized error responses
- **Validation**: Use express-validator for input validation
- **Authentication**: JWT-based with role-based access control
- **Database**: Mongoose schemas with proper indexing and validation
- **Logging**: Use structured logging with winston/custom logger
- **API Responses**: Consistent JSON structure with status codes

### Example API Route Structure:
```javascript
router.post('/endpoint', [
  auth,
  body('field').validation(),
  middlewareFunction
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Business logic
    res.json({ data, message: 'Success' });
  } catch (error) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});
```

## Frontend (React)

### File Structure
- **Pages**: `frontend/src/pages/` - Top-level route components
- **Components**: `frontend/src/components/` - Reusable UI components
- **Services**: `frontend/src/services/` - API calls and external integrations
- **Hooks**: `frontend/src/hooks/` - Custom React hooks
- **Theme**: `frontend/src/theme/` - Material-UI theme and design system
- **Redux**: `frontend/src/redux/` - State management (if using Redux)

### Coding Conventions
- **Components**: Functional components with hooks
- **State Management**: useState, useEffect, custom hooks, Context API
- **Styling**: Material-UI with sx prop and styled components
- **API Calls**: Axios with centralized error handling
- **Routing**: React Router v6 with nested routes
- **Forms**: Controlled components with validation
- **TypeScript**: Not currently used, but JavaScript with JSDoc comments

### Component Example:
```javascript
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '../services/AuthContext';

const ExampleComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);
  const { user } = useAuth();

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">{title}</Typography>
      <Button onClick={handleClick}>Action</Button>
    </Box>
  );
};

export default ExampleComponent;
```

## General Conventions
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Files**: kebab-case for file names, PascalCase for React components
- **Comments**: JSDoc-style comments for functions and complex logic
- **Imports**: Group imports (libraries, local files, relative imports)
- **Git**: Conventional commit messages with clear descriptions