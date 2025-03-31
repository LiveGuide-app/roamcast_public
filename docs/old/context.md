# Tour Guide Live Streaming App - Technical Documentation

## 1. Project Overview

### Purpose
Build a native app that enables tour guides to stream live audio to tour guests, with features for ratings and tipping. The solution focuses on simplicity and cost-effectiveness using modern, free-tier friendly technologies.

### Target Users
- **Tour Guides:** Stream live audio during tours and manage sessions
- **Tour Guests:** Listen to live streams, rate the tour, and optionally leave tips

### Technology Stack
- **Frontend:** React Native / Expo
  - Cross-platform native application development
  - Managed workflow for simplified setup and deployment
- **Backend:** Supabase
  - Authentication and managed Postgres database
  - Generous free tier with easy-to-use APIs
- **Real-Time Audio:** pro.anycable.io
  - Hosted solution for low-latency audio streaming
  - Free tier available for cost management
- **Payments:** Stripe Payment Links
  - Simple payment link generation for tips
  - No complex integration required

## 2. Development Setup

### Prerequisites
- Node.js (v18 or later)
- Git
- Expo CLI (`npm install -g expo-cli`)
- Required Accounts:
  - Supabase (free tier)
  - Anycable.io (free tier)
  - Stripe (free)

### Environment Configuration
Required environment variables in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_ANYCABLE_URL=your_anycable_websocket_url
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

> **Note:** For a detailed quick start guide and development tips, see [get_started.md](./get_started.md)

## 3. Application Architecture

### Project Structure
```
roamcast/
├── app/
│   ├── index.tsx           # Landing page with tour code input and guide login option
│   ├── auth/              # Authentication screens
│   │   ├── login.tsx     # Main login screen
│   │   ├── signup.tsx    # New user registration
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   └── verify-email.tsx
│   ├── guide/
│   │   ├── dashboard.tsx  # Guide's overview of tours
│   │   ├── create-tour.tsx #create new tour
│   │   └── live-tour-detail.tsx #shows the details of the live tour
│   └── tour/
│       └── [code].tsx     # Dynamic route for tour listening
├── assets/               # Images, fonts, and other static files
├── components/
│   ├── AudioStream.tsx
│   ├── TourCode.tsx
│   ├── FeedbackForm.tsx
│   └── ErrorBoundary.tsx # Global error handling
├── config/              # Environment and app configuration
│   ├── env.ts          # Environment validation
│   └── constants.ts    # App-wide constants
├── services/
│   ├── supabase.ts
│   └── anycable.ts
├── hooks/
│   ├── useAuth.ts
│   └── useTour.ts
├── utils/              # Helper functions and utilities
│   ├── performance.ts  # Performance monitoring
│   └── validation.ts   # Input validation
└── types/
    └── index.ts
```

### Structure Explanation

This enhanced structure provides a more robust foundation for the application while maintaining simplicity and clarity.

#### App Directory (`/app`)
- `index.tsx`: Landing page where users can:
  - Enter a tour code to join a tour
  - Click "I'm a Guide" to go to login
- `auth/`: Authentication-related screens
  - `login.tsx`: Main login screen with email/password
  - `signup.tsx`: New user registration form
  - `forgot-password.tsx`: Password recovery request
  - `reset-password.tsx`: Password reset form
  - `verify-email.tsx`: Email verification screen
- `guide/`: Guide-specific screens
  - `dashboard.tsx`: Overview of tours
  - `create-tour.tsx`: Create new tours
  - `active-tour.tsx`: Manage ongoing tours
- `tour/`: Tour listening screens
  - `[code].tsx`: Dynamic route for tour listening (e.g., /tour/ABC123)

#### Assets Directory (`/assets`)
- Contains all static files
- Images and icons
- Custom fonts
- Other media files

#### Components Directory (`/components`)
- Contains reusable UI components
- `AudioStream.tsx`: Handles audio streaming
- `TourCode.tsx`: Displays and manages tour codes
- `FeedbackForm.tsx`: Handles tour feedback
- `ErrorBoundary.tsx`: Global error handling component

#### Config Directory (`/config`)
- `env.ts`: Environment variable validation
- `constants.ts`: App-wide constants and configuration

#### Services Directory (`/services`)
- Contains external service integrations
- `supabase.ts`: Database and authentication
- `anycable.ts`: Real-time audio streaming

#### Utils Directory (`/utils`)
- Contains helper functions and utilities
- `performance.ts`: Performance monitoring
- `validation.ts`: Input validation and sanitization

#### Hooks Directory (`/hooks`)
- Contains custom React hooks for shared logic
- `useAuth.ts`: Authentication state and methods
- `useTour.ts`: Tour management logic

#### Types Directory (`/types`)
- Contains TypeScript type definitions
- `index.ts`: All shared types in one file

### Key Design Principles

1. **Simplicity First**
   - Flat directory structure where possible
   - Clear, descriptive file names
   - Minimal nesting

2. **Progressive Enhancement**
   - Start with core features
   - Add complexity as needed
   - Easy to extend later

3. **Clear Responsibilities**
   - Each directory has a specific purpose
   - Components handle UI
   - Services handle external APIs
   - Hooks handle shared logic
   - Utils handle shared functions

4. **Easy to Navigate**
   - Intuitive file locations
   - Fewer directories to remember
   - Straightforward imports

5. **Streamlined User Flow**
   - Single entry point for all users
   - Clear path for both guides and guests
   - Simple navigation structure

6. **Error Handling**
   - Global error boundary
   - Graceful degradation
   - User-friendly error messages

7. **Performance Optimization**
   - Efficient state management
   - Optimized asset loading
   - Performance monitoring

### Core Services
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { createCable } from '@anycable/web';

// Environment validation
const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_ANYCABLE_URL',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

export const cable = createCable({
  url: process.env.EXPO_PUBLIC_ANYCABLE_URL!
});
```

## 4. Database Design

### Schema

#### Users Table
```sql
create table users (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  stripe_payment_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  deleted_at timestamp with time zone
);

-- Add trigger for updated_at
create trigger set_updated_at
  before update on users
  for each row
  execute function update_updated_at_column();
```

#### Tours Table
```sql
create table tours (
  id uuid primary key default uuid_generate_v4(),
  guide_id uuid references users,
  name text,
  unique_code text unique,
  anycable_channel text,
  status text check (status in ('pending', 'active', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  deleted_at timestamp with time zone,
  constraint valid_dates check (created_at <= updated_at)
);

-- Add trigger for updated_at
create trigger set_updated_at
  before update on tours
  for each row
  execute function update_updated_at_column();
```

#### Tour Participants Table
```sql
create table tour_participants (
  id uuid primary key default uuid_generate_v4(),
  tour_id uuid references tours,
  device_id text,
  join_time timestamp with time zone default timezone('utc'::text, now()),
  leave_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  deleted_at timestamp with time zone
);

-- Add trigger for updated_at
create trigger set_updated_at
  before update on tour_participants
  for each row
  execute function update_updated_at_column();
```

#### Feedback Table
```sql
create table feedback (
  id uuid primary key default uuid_generate_v4(),
  tour_id uuid references tours,
  participant_id uuid references tour_participants,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  has_tipped boolean,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  deleted_at timestamp with time zone
);

-- Add trigger for updated_at
create trigger set_updated_at
  before update on feedback
  for each row
  execute function update_updated_at_column();
```

### Database Indexes
```sql
create index tours_unique_code_idx on tours(unique_code);
create index tour_participants_tour_id_idx on tour_participants(tour_id);
create index feedback_tour_id_idx on feedback(tour_id);
create index users_email_idx on users(email);
create index tours_guide_id_idx on tours(guide_id);
```

## 5. Development Guidelines

### Testing
- Use real devices for audio testing
- Implement headphone usage to prevent feedback
- Test with multiple devices simultaneously
- Unit testing with Jest and React Native Testing Library
- E2E testing with Detox
- Performance testing with React Native Performance Monitor

### Debugging
- Utilize Expo Dev Tools
- Enable Supabase Dashboard logging
- Test across different network conditions
- Implement comprehensive error logging
- Use React Native Debugger

### Performance Optimization
- Maintain small audio buffer sizes
- Monitor performance using React Native Performance Monitor
- Implement efficient state management
- Use React.memo for expensive components
- Implement proper image caching
- Optimize bundle size
- Use lazy loading for routes
- Implement proper list virtualization

### Security Best Practices
- Store API keys in environment variables
- Implement proper input validation
- Use secure authentication flows
- Follow data protection guidelines
- Implement rate limiting
- Use HTTPS for all API calls
- Implement proper session management
- Sanitize user inputs
- Use secure storage for sensitive data
- Implement proper error handling

### Error Handling
```typescript
// components/ErrorBoundary.tsx
import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### Performance Monitoring
```typescript
// utils/performance.ts
import { PerformanceObserver } from 'perf_hooks';

export const setupPerformanceMonitoring = () => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Log performance metrics
      console.log(`${entry.name}: ${entry.duration}ms`);
    }
  });
  
  observer.observe({ entryTypes: ['measure'] });
};
```

## 7. Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Anycable Documentation](https://docs.anycable.io)
- [Stripe Documentation](https://stripe.com/docs)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://github.com/wix/Detox)
- [React Native Performance](https://reactnative.dev/docs/performance)