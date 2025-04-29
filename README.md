# Roamcast

Roamcast is a mobile application built with React Native and Expo that enables live audio tours and experiences. The app allows tour guides to stream audio content to participants in real-time, creating an immersive experience for users.

## Features

- Live audio streaming during tours
- Real-time communication between guides and participants
- Profile management
- Payment processing for tour tips
- Cross-platform support (iOS and Android)
- WebRTC integration for high-quality audio streaming
- Secure authentication and data storage

## Tech Stack

- **Frontend**: React Native, Expo
- **State Management**: React Context
- **Authentication**: Supabase
- **Real-time Communication**: LiveKit, WebRTC
- **Payments**: Stripe
- **Database**: Supabase
- **Type Safety**: TypeScript

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/roamcast.git
cd roamcast
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.development` for development
   - Copy `.env.example` to `.env.production` for production
   - Fill in the required environment variables

## Development

### Starting the Development Server

```bash
# For development environment
npm run dev

# For production environment
npm run prod
```

### Running on Specific Platforms

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Building for Production

### iOS

```bash
npm run build:prod:ios
```

### Android

```bash
npm run build:prod:android
```

## Project Structure

```
roamcast/
├── app/              # Main application code
├── components/       # Reusable UI components
├── config/          # Configuration files
├── hooks/           # Custom React hooks
├── lib/             # Library and utility functions
├── services/        # API and service integrations
├── supabase/        # Supabase related code
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── web/             # Web-specific code
```

## Environment Variables

The following environment variables are required:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `LIVEKIT_API_KEY`: Your LiveKit API key
- `LIVEKIT_API_SECRET`: Your LiveKit API secret

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [support@roamcast.app](mailto:remo@tryroamcast.com) 