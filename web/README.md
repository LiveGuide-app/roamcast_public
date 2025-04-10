# Roamcast Web

This is the web-based audio streaming implementation for Roamcast tours, allowing guests to join tours directly through their mobile web browser without requiring any app installation.

## Features

- Real-time audio streaming using LiveKit
- Background audio playback support
- Mobile-optimized interface
- Cross-platform compatibility (iOS Safari, Android Chrome)

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later

## Setup

1. Clone the repository
2. Navigate to the web directory:
   ```bash
   cd web
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `NEXT_PUBLIC_LIVEKIT_WS_URL`: LiveKit WebSocket URL
- `NEXT_PUBLIC_LIVEKIT_API_KEY`: LiveKit API Key
- `NEXT_PUBLIC_LIVEKIT_API_SECRET`: LiveKit API Secret
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anonymous Key

## Development

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run test`: Run tests

## Project Structure

```
web/
├── src/
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   ├── services/     # API and service integrations
│   ├── utils/        # Utility functions
│   ├── types/        # TypeScript type definitions
│   └── audio/        # Audio-related utilities
├── public/           # Static assets
└── config/           # Configuration files
```

## Browser Support

- iOS: Safari (primary browser)
- Android: Chrome and other Chromium-based browsers

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

Proprietary - All rights reserved
