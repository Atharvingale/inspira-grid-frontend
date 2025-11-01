# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Development
```bash
npm run dev           # Start Next.js development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript type checking
```

### Pre-commit Checks
Before committing changes, always run:
```bash
npm run lint && npm run type-check
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Real-time**: Pusher (for messages and notifications)
- **State Management**: React Context API

### Directory Structure

```
app/                    # Next.js App Router pages and API routes
├── api/               # Next.js API routes (REST endpoints)
│   ├── applications/  # Application/job request endpoints
│   ├── auth/          # Authentication endpoints
│   ├── conversations/ # Messaging conversation endpoints
│   ├── github/        # GitHub integration endpoints
│   ├── messages/      # Message endpoints
│   ├── notifications/ # Notification endpoints
│   ├── projects/      # Project CRUD endpoints
│   ├── pusher/        # Pusher authentication
│   ├── upload/        # File upload handling
│   └── users/         # User profile endpoints
├── dashboard/         # Main user dashboard
├── settings/          # User settings pages
└── admin/             # Admin panel

components/            # React components
├── analytics/         # Analytics and metrics components
├── auth/              # Authentication UI components
├── collaboration/     # Collaboration features
├── common/            # Shared/reusable components
├── layout/            # Layout components (navbar, sidebar, etc.)
├── messages/          # Messaging UI components
├── messaging/         # Legacy messaging components
├── mobile/            # Mobile-specific components
├── profile/           # User profile components
├── search/            # Search functionality
└── ui/                # UI primitives and design system

lib/                   # Core library code
├── contexts/          # React Context providers
│   └── MessagingContext.tsx  # Messaging state management
├── hooks/             # Custom React hooks
├── middleware/        # Next.js middleware and utilities
├── models/            # Data models and types
├── services/          # API service layer (see lib/services/README.md)
│   ├── baseService.ts          # Base service with common HTTP methods
│   ├── authService.ts          # Authentication operations
│   ├── projectService.ts       # Project CRUD
│   ├── applicationService.ts   # Application management
│   ├── messageService.ts       # Messaging operations
│   ├── notificationService.ts  # Notification handling
│   ├── analyticsService.ts     # Analytics tracking
│   ├── collaborationService.ts # Collaboration features
│   └── githubService.ts        # GitHub integration
├── AuthContext.tsx    # Global authentication state
├── NotificationContext.tsx  # Global notification state
├── SocketContext.tsx  # WebSocket connection management
├── api.ts             # Core API client with Firebase token injection
├── firebase.ts        # Firebase client initialization
├── firebase-admin.ts  # Firebase Admin SDK (server-side)
├── pusher.ts          # Pusher client and server instances
└── env.ts             # Environment variable validation with Zod

types/                 # TypeScript type definitions
```

### Key Architecture Patterns

#### API Service Layer
All API calls go through the centralized service layer in `lib/services/`. This provides:
- Type-safe API interactions
- Consistent error handling
- Automatic authentication token injection
- Singleton pattern to prevent memory leaks

**Always use services instead of direct fetch calls:**
```typescript
import { projectService } from '@/lib/services';

// ✅ Correct
const projects = await projectService.getProjects();

// ❌ Avoid
const response = await fetch('/api/projects');
```

#### Authentication Flow
1. Firebase Auth handles user authentication
2. `lib/api.ts` automatically injects Firebase ID tokens into all API requests via `Authorization: Bearer <token>` headers
3. API routes in `app/api/` validate tokens using Firebase Admin SDK
4. `AuthContext` provides global auth state to React components

#### Real-time Features
- **Pusher** is used for real-time messaging and notifications
- Server-side events are triggered via `lib/pusher.ts` (`pusherServer`)
- Client-side subscriptions are managed through `getPusherClient()`
- Auth endpoint for Pusher: `/api/pusher/auth`

#### Context Providers Hierarchy
```typescript
<AuthProvider>              // Authentication state
  <NotificationProvider>    // Notifications
    <MessagingProvider>     // Messaging features
      {children}
    </MessagingProvider>
  </NotificationProvider>
</AuthProvider>
```

### Path Aliases
TypeScript is configured with `@/` pointing to the root directory:
```typescript
import { projectService } from '@/lib/services';
import { UserProfile } from '@/types';
import Button from '@/components/ui/Button';
```

### Environment Variables
Environment variables are validated using Zod in `lib/env.ts`. Required variables:
- Firebase configuration (client-side): `NEXT_PUBLIC_FIREBASE_*`
- Pusher configuration: `PUSHER_APP_ID`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_CLUSTER`
- API URL (optional): `NEXT_PUBLIC_API_URL` (defaults to `/api` for Next.js API routes)

Copy `.env.example` to `.env.local` for development.

## Development Guidelines

### API Routes
- API routes are in `app/api/` using Next.js App Router conventions
- Each route exports HTTP method handlers: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Authentication is handled via Firebase Admin SDK token verification
- Return responses using `NextResponse.json()` with standardized `ApiResponse<T>` format

### Service Layer Usage
When adding new API functionality:
1. Create/update the service in `lib/services/`
2. Extend `BaseService` for common HTTP operations
3. Export service instance as singleton
4. Use the service in components/pages

See `lib/services/README.md` for detailed service layer documentation.

### Type Safety
- All components and functions should have explicit TypeScript types
- Use types from `types/index.ts` for consistency
- API responses should use `ApiResponse<T>` type
- Services return typed responses via generics

### Component Patterns
- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable UI elements to `components/ui/`
- Use Context for global state, props for local state

### Styling
- Use Tailwind CSS utility classes
- Component library utilities: `clsx` for conditional classes, `tailwind-merge` for merging
- Design system components in `components/ui/`
- Dark mode is enabled by default (see `app/layout.tsx`)

### Error Handling
Services provide consistent error handling:
```typescript
try {
  const response = await projectService.getProjects();
  if (serviceUtils.isSuccessResponse(response)) {
    // Handle success
  } else {
    // Handle API error
    console.error(response.error);
  }
} catch (error) {
  // Handle network error
  const message = serviceUtils.handleApiError(error);
}
```
