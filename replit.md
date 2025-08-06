# Overview

This is a web scraping and content organization application built with Express.js backend and React frontend. The application allows users to input website URLs, scrape the content using Puppeteer, and organize the extracted content using Google Gemini AI for chatbot knowledge bases. It features a modern UI built with shadcn/ui components and supports real-time job status tracking.

## Recent Changes (Aug 6, 2025)

✓ Migrated from OpenAI to Google Gemini AI integration
✓ Fixed Puppeteer Chrome installation issue by configuring system Chromium
✓ Updated color scheme to match user specifications (indigo primary, emerald secondary)
✓ Successfully tested web scraping functionality

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side application uses a modern React setup with TypeScript:

- **Framework**: React with TypeScript and Vite for fast development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Form Handling**: React Hook Form with Zod validation

The frontend follows a component-based architecture with separate concerns:
- Pages handle routing and high-level state management
- Components focus on specific UI functionality
- Hooks manage reusable logic and external integrations
- Services handle API communication through a centralized query client

## Backend Architecture

The server uses Express.js with a service-oriented architecture:

- **Framework**: Express.js with TypeScript for type safety
- **Web Scraping**: Puppeteer for headless browser automation and Cheerio for HTML parsing
- **AI Integration**: OpenAI API for content organization and structuring
- **Storage**: In-memory storage with interface for future database integration
- **Development**: Vite integration for hot reload in development mode

Key architectural decisions:
- Service layer separation (scraper, OpenAI services)
- Storage abstraction through interfaces for easy database migration
- Background job processing for long-running scraping tasks
- Comprehensive error handling and logging

## Data Storage Solutions

Currently uses in-memory storage (`MemStorage`) for simplicity:

- **Job Management**: Stores scraping jobs with status tracking
- **Schema Definition**: Drizzle ORM schemas prepared for PostgreSQL migration
- **Data Models**: Structured content with metadata, processing options, and job lifecycle management

The storage layer is abstracted through interfaces, making it easy to switch to PostgreSQL using Drizzle ORM when needed. The schema supports complex job tracking with processing options, content organization, and performance metrics.

## External Dependencies

**Database & ORM**:
- Drizzle ORM configured for PostgreSQL with Neon Database serverless driver
- Migration system ready for database deployment

**AI & Content Processing**:
- Google Gemini AI for content organization and structuring
- Puppeteer for web scraping with headless Chromium (system-installed)
- Cheerio for HTML parsing and content extraction

**UI & Styling**:
- shadcn/ui component library with Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- React Hook Form with Zod for form validation

**Development & Build Tools**:
- Vite for frontend development and building
- TypeScript for type safety across the stack
- ESBuild for server bundling in production

**Third-party Integrations**:
- Session management with connect-pg-simple (prepared for PostgreSQL)
- Date manipulation with date-fns
- Real-time updates through polling with TanStack Query

The application is designed for easy deployment and scaling, with clear separation between development and production configurations.