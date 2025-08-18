# Task Completion Checklist

## When a Task is Completed

### 1. Code Quality Checks
- **Linting**: Ensure ESLint passes without errors
- **Formatting**: Code follows project conventions
- **Imports**: Clean up unused imports and organize properly
- **Comments**: Add JSDoc comments for complex functions
- **Error Handling**: Proper try-catch blocks and error responses

### 2. Testing
```bash
# Backend testing
cd backend
npm run test:unit
npm run test:integration

# Frontend testing  
cd frontend
npm test
```

### 3. Manual Testing
- **API Endpoints**: Test with Postman or curl
- **UI Components**: Test in browser with different screen sizes
- **User Flows**: Test complete user journeys
- **Error Cases**: Test error handling and edge cases
- **Cross-browser**: Test in Chrome, Firefox, Safari if applicable

### 4. Documentation Updates
- **API Documentation**: Update if new endpoints added
- **Component Documentation**: Add props documentation
- **README Updates**: Update if setup process changes
- **Changelog**: Document new features or breaking changes

### 5. Database Considerations
- **Migrations**: Run any necessary database migrations
- **Indexes**: Ensure proper database indexes are in place
- **Data Validation**: Test with various data scenarios
- **Backup**: Consider if backup strategy needs updates

### 6. Security Review
- **Authentication**: Verify proper auth checks
- **Authorization**: Ensure role-based access works
- **Input Validation**: Check all user inputs are validated
- **SQL Injection**: Ensure Mongoose queries are safe
- **XSS Prevention**: Check for potential XSS vulnerabilities

### 7. Performance Checks
- **API Response Times**: Check for reasonable response times
- **Frontend Rendering**: Check for unnecessary re-renders
- **Database Queries**: Optimize N+1 queries
- **Bundle Size**: Check if frontend bundle size increased significantly

### 8. Deployment Preparation
- **Environment Variables**: Update .env.example if needed
- **Docker**: Test docker-compose build and run
- **Dependencies**: Ensure package.json is updated
- **Configuration**: Check all config files are correct

### 9. Final Verification
- **Clean Build**: Ensure fresh install and build works
- **Integration**: Test with other system components
- **User Acceptance**: Verify task meets original requirements
- **Edge Cases**: Test boundary conditions and error scenarios