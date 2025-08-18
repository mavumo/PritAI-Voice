# AI Legal Receptionist Voice Agent System

## Overview

This is a sophisticated AI-powered voice receptionist system designed specifically for The Law Offices of Pritpal Singh, a California real estate law firm. The system combines modern web technologies with AI voice processing to handle incoming calls, collect client intake information, and manage business operations through an intuitive dashboard interface.

The application serves as a complete call management solution that can handle client inquiries during business hours, collect detailed intake information for various real estate law matters, and provide comprehensive administrative oversight through a real-time dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built using React with TypeScript, leveraging a modern component-based architecture. The UI framework utilizes Shadcn/UI components with Radix UI primitives, providing accessible and customizable interface elements. The application uses Wouter for lightweight client-side routing and TanStack Query for efficient server state management and caching. Real-time updates are handled through WebSocket connections for immediate dashboard updates when calls come in or intake forms are submitted.

The styling system is built on Tailwind CSS with a comprehensive design system that includes custom CSS variables for theming, consistent spacing, and responsive design patterns. The component architecture follows a clear separation between UI components, business logic components, and page-level components.

### Backend Architecture
The server-side implements a Node.js/Express.js REST API with TypeScript for type safety. The architecture follows a service-oriented pattern with dedicated services for different integrations: TwilioService for voice call handling, OpenAIRealtimeService for AI conversation processing, and BusinessHoursService for time-based logic.

The API design uses conventional REST endpoints with middleware for request logging, error handling, and JSON parsing. WebSocket integration provides real-time communication between the server and connected dashboard clients for immediate updates on system events.

### Data Storage Solutions
The system uses Drizzle ORM with PostgreSQL for data persistence, providing type-safe database operations and automated migrations. The schema includes tables for users, calls, intakes, system logs, and system configuration. The storage layer implements an interface pattern with both database and in-memory implementations for flexibility in different deployment scenarios.

Database schema design focuses on call tracking (with Twilio CallSid integration), comprehensive client intake information collection, and detailed system activity logging for monitoring and debugging purposes.

### Authentication and Authorization
The current implementation includes a basic user authentication system with username/password login. The authentication mechanism uses session-based authentication with express-session, though the full implementation appears to be in development stages based on the codebase structure.

### Real-time Communication System
WebSocket implementation enables real-time dashboard updates for call status changes, new intake submissions, and system events. The WebSocket server broadcasts events to all connected dashboard clients, ensuring administrators have immediate visibility into system activity.

The real-time system handles call lifecycle events (started, ended), intake processing events (created, updated), and system monitoring events for comprehensive operational awareness.

### AI Integration Architecture
The system integrates with OpenAI's Realtime API for natural language conversation processing during phone calls. The AI system is configured with specific instructions for handling California real estate law inquiries, collecting client intake information, and managing business hours appropriately.

The AI service creates realtime sessions for each incoming call and manages the conversation flow to collect necessary client information while providing appropriate legal disclaimers and general information.

## External Dependencies

### Communication Services
- **Twilio**: Primary telephony service for handling incoming voice calls, call routing, and call management. Provides webhook endpoints for call events and TwiML response generation for call flow control.

### AI and Machine Learning
- **OpenAI Realtime API**: Powers the conversational AI functionality for client interactions during phone calls. Configured with domain-specific prompts for California real estate law and client intake procedures.

### Database and Storage
- **PostgreSQL**: Primary database for persistent data storage, accessed through Neon Database serverless PostgreSQL service. Handles all application data including user accounts, call records, client intakes, and system logs.

### Frontend Libraries and Components
- **Radix UI**: Comprehensive set of low-level UI primitives for building accessible and customizable interface components including dialogs, dropdowns, forms, and navigation elements.
- **Shadcn/UI**: High-level component library built on Radix UI, providing pre-styled, accessible components with consistent design patterns.
- **TanStack Query**: Advanced data fetching and state management library for server state synchronization, caching, and real-time updates.

### Development and Build Tools
- **Vite**: Modern build tool and development server providing fast hot module replacement and optimized production builds.
- **TypeScript**: Type system for enhanced developer experience and runtime safety across both frontend and backend code.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development with consistent design system implementation.

### Session and State Management
- **Express Session**: Server-side session management for user authentication and authorization state persistence.
- **WebSocket (ws)**: Real-time bidirectional communication between server and dashboard clients for live system updates.