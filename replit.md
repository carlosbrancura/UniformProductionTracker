# Production Management System

## Overview

This is a full-stack production management system designed for textile and garment manufacturing. The application helps manage products, workshops, users, and production batches through a comprehensive web interface with calendar views and batch tracking capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom design tokens
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: PostgreSQL-based sessions with connect-pg-simple
- **File Uploads**: Multer for handling image uploads
- **API Design**: RESTful API with JSON responses

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for type-safe schema sharing
- **Tables**: Users, Products, Workshops, Batches, BatchHistory, BatchProducts
- **Migrations**: Drizzle Kit for schema migrations

## Key Components

### User Management
- Role-based access control (admin, production_supervisor, cutter)
- Granular permissions system for different modules
- User authentication and authorization

### Product Management
- Product catalog with codes, descriptions, and specifications
- Fabric type and meter requirements tracking
- Notions and accessories management
- Available colors and sizes configuration
- Production value tracking

### Workshop Management
- External workshop partner management
- Contact information and capacity tracking
- Service type categorization
- Color-coded calendar integration

### Batch Production System
- Production batch creation and tracking
- Multi-product batch support with quantities, colors, and sizes
- Status workflow (waiting → internal_production/external_workshop → returned_ok/returned_issues)
- Batch history tracking with user attribution
- Image upload for batch documentation
- Print-friendly batch documentation
- Payment status tracking for financial management

### Financial Management Module
- Workshop payment tracking and invoice generation
- Time-filtered financial reports (60-day default)
- Unpaid batch value calculations based on product production values
- Invoice history and payment status management
- Detailed workshop financial drill-down views
- Print-ready financial reports and invoice documents
- Integration with batch production for seamless payment tracking

### Calendar Interface
- Biweekly and monthly calendar views
- Drag-and-drop navigation
- Batch visualization with workshop color coding
- Date-based filtering and search

## Data Flow

1. **User Authentication**: Users log in and receive role-based permissions
2. **Product Setup**: Products are configured with specifications and available options
3. **Workshop Configuration**: External workshops are registered with contact details
4. **Batch Creation**: Production batches are created with:
   - Cut dates and expected return dates
   - Product selections with quantities, colors, and sizes
   - Workshop assignments (internal or external)
5. **Batch Tracking**: Batches move through status workflow with history tracking
6. **Documentation**: Batch details can be printed and images can be uploaded

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives
- **react-hook-form**: Form handling and validation
- **zod**: Runtime type validation
- **date-fns**: Date manipulation and formatting
- **multer**: File upload handling

### Development Dependencies
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **vite**: Development server and build tool
- **tailwindcss**: Utility-first CSS framework

## Deployment Strategy

### Development Environment
- **Command**: `npm run dev`
- **Port**: 5000 (configured in .replit)
- **Hot Reload**: Vite HMR for frontend, tsx for backend restart

### Production Build
- **Frontend**: Vite builds to `dist/public`
- **Backend**: esbuild bundles server to `dist/index.js`
- **Database**: Drizzle migrations run via `npm run db:push`

### Replit Configuration
- **Modules**: nodejs-20, web, postgresql-16
- **Auto-deployment**: Configured for autoscale deployment
- **Environment**: PostgreSQL database auto-provisioned
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

## Changelog
- June 28, 2025: Invoice Print Layout Optimized - reorganized header to be more compact, removed unnecessary fields (contact, address, phone, email, responsible person), simplified batch layout with single-line product display, removed blue background from batch headers, eliminated description column for more space
- June 28, 2025: Invoice Print System Reimplemented - completely rebuilt print functionality using static HTML page to avoid React DOM conflicts, eliminated complex routing issues, improved print reliability and performance
- June 27, 2025: Invoice System Improvements - implemented proper sequential invoice numbering with format [3 letters]-[ddmmyy]-[sequential 4 digits starting 1000], automatic batch payment marking, status labels changed from 'Pago/Não pago' to 'Faturado/Aberto'
- June 26, 2025: Workshop Financial Details - reorganized layout with button repositioning, removed print report button, changed to show all batches with payment status, added pagination breaks every 15 items
- June 26, 2025: Invoice Print System - removed problematic print functionality, disabled print buttons temporarily until reimplementation
- June 25, 2025: Financial Management Module - completed financial tracking system with workshop payment management, working summary calculations, proper value display, and comprehensive reporting interface
- June 25, 2025: Calendar layout enhancement - increased bar height by 30%, reduced spacing between workshop lines, reorganized bar content to show "Oficina | LOTE XXX | Product Info"
- June 24, 2025: UI cleanup - removed view type indicator, simplified title to "Cronograma de Produção", removed print and history from batch modal, auto-update return date when marking as returned
- June 24, 2025: Monthly view disabled - system now only shows quinzenal (15-day) calendar view per user request
- June 24, 2025: Unified calendar component - removed duplicate BiweeklyCalendar, single OrganizedCalendar now handles both quinzenal and monthly views
- June 24, 2025: Print confirmation dialog added after batch creation - user can choose whether to print or not
- June 24, 2025: Calendar layout improvements - bars positioned side-by-side, reduced spacing, enhanced information display, monthly view added
- June 24, 2025: Fixed print functionality to show complete product information (color and size)
- June 23, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.