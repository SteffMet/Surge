# Surge - Project Overview

## Purpose
Surge is an enterprise-grade documentation platform designed for IT professionals and teams. It combines powerful AI-driven search capabilities with advanced collaboration tools to create, manage, and discover organizational knowledge bases.

## Key Features
- **AI-Powered Search**: Natural language queries with intelligent content suggestions
- **Real-time Collaborative Editing**: Live cursors, document locking, comments, and review workflows
- **Enterprise Workspace Management**: Multi-workspace organization with role-based permissions
- **Document Versioning**: Complete change history and diff viewing
- **Progressive Web App**: Offline capabilities and mobile-optimized interface
- **Rich Text Editor**: Support for diagrams, equations, and multimedia using TipTap
- **Advanced Analytics**: User productivity tracking and document engagement metrics
- **Security Features**: SSO, LDAP integration, audit logging, and secure vault for sensitive info

## Architecture Overview
This is a modern full-stack application with:
- **Frontend**: React 18 SPA with Material-UI design system
- **Backend**: Node.js/Express REST API with worker architecture
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: Ollama with local LLM models (Mistral 7B, embedding models)
- **Real-time**: Socket.io for collaboration features
- **Containerization**: Docker-based deployment with docker-compose

## Current Status
The project appears to be in active development with several advanced features implemented but some areas needing completion, particularly around:
- Document versioning UI implementation
- WYSIWYG editor integration
- Workspace access permissions debugging
- File upload functionality fixes