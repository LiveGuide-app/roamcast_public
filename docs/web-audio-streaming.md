# Web-Based Audio Streaming Implementation

## Overview
This document outlines the implementation of web-based audio streaming for Roamcast tours, allowing guests to join tours directly through their mobile web browser without requiring any app installation. The solution leverages modern web APIs and our existing LiveKit infrastructure to provide a seamless audio experience, including background playback when the device is locked.

## Tech Stack

### Core Package
- **TypeScript**: For type safety and better developer experience
- **LiveKit Client**: For real-time audio streaming (already in use)
- **Supabase**: For token generation and authentication (already in use)

### Web Project
- **Next.js**: For the web application
  - Provides server-side rendering capabilities
  - Built-in routing
  - API routes for backend functionality
  - Excellent TypeScript support
  - Good performance optimizations

- **React**: For UI components
  - Consistent with our existing React Native codebase
  - Large ecosystem of components and libraries
  - Familiar development patterns

- **Tailwind CSS**: For styling
  - Utility-first approach for rapid development
  - Responsive design capabilities
  - Consistent with modern web development practices

- **Web Audio API**: For audio handling
  - Native browser API for audio processing
  - Required for background playback

- **Media Session API**: For system controls
  - Enables lock screen controls
  - Manages media metadata

### Build and Development Tools
- **ESLint & Prettier**: For code quality
  - Consistent code style
  - Catch errors early

- **Jest & React Testing Library**: For testing
  - Comprehensive testing capabilities
  - Component testing

### Deployment
- **Vercel**: For hosting the Next.js application
  - Optimized for Next.js
  - Global CDN
  - Easy deployment

- **Cloudflare**: For CDN and SSL
  - Global content delivery
  - DDoS protection
  - SSL certificate management

## Technical Requirements

### Mobile Browser Support
- **iOS**: Safari (primary browser)
- **Android**: Chrome and other Chromium-based browsers

### Key Web APIs
1. **Web Audio API**
   - Handles audio playback
   - Manages audio context and streaming
   - Provides high-quality audio processing

2. **Media Session API**
   - Enables system-level media controls
   - Shows playback controls on lock screen
   - Manages media metadata

3. **Page Visibility API**
   - Handles audio state when tab is in background
   - Manages resource usage
   - Controls playback based on visibility

## Implementation Approach

### 1. Mobile Web Interface
- Simple, lightweight interface optimized for mobile screens
- Clear user instructions
- Platform-specific guidance for iOS users
- Real-time connection status indicators

### 2. Audio Session Management
```javascript
// Initialize audio session
const initializeAudio = async () => {
  // Create audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Set up media session
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'Tour Audio',
    artist: 'Tour Guide Name',
    album: 'Live Tour'
  });

  // Handle media controls
  navigator.mediaSession.setActionHandler('play', () => {
    // Resume audio
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    // Pause audio
  });
};
```

### 3. LiveKit Integration
- Reuse existing LiveKit infrastructure
- Mobile-specific optimizations for audio streaming
- Platform-specific connection handling
- Automatic reconnection logic

### 4. Platform-Specific Considerations

#### iOS (Safari)
- Audio must be user-initiated
- No autoplay without user interaction
- Clear instructions for users
- Handle audio session interruptions
- Handle iOS-specific audio session behaviors

#### Android (Chrome)
- More permissive audio policies
- Better background playback support
- Notification controls
- Battery optimization handling
- Handle Android-specific audio session behaviors

## User Experience

### Join Flow
1. User visits join.tryroamcast on mobile browser
2. Enters tour code
3. Clicks "Join Tour" button
4. Audio begins playing
5. Can lock screen while audio continues

### Platform-Specific Instructions
- **iOS**: "Keep Safari open to continue listening"
- **Android**: "Audio will continue playing when screen is locked"

## Technical Implementation

### 1. HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <title>Join Roamcast Tour</title>
</head>
<body>
  <div id="join-form">
    <input type="text" id="tour-code" placeholder="Enter Tour Code">
    <button id="join-button">Join Tour</button>
  </div>
  <div id="audio-controls" style="display: none;">
    <!-- Audio controls -->
  </div>
</body>
</html>
```

### 2. Audio Session Management
```javascript
class AudioSessionManager {
  constructor() {
    this.audioContext = null;
    this.mediaSession = null;
    this.isPlaying = false;
  }

  async initialize() {
    // Initialize audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Set up media session
    this.setupMediaSession();
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Tour Audio',
        artist: 'Tour Guide Name',
        album: 'Live Tour'
      });

      // Set up media controls
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
    }
  }

  handleVisibilityChange = () => {
    if (document.hidden) {
      // Page is hidden, ensure audio continues
      this.ensureBackgroundPlayback();
    }
  }
}
```

### 3. LiveKit Integration
```javascript
class LiveKitManager {
  constructor(tourCode) {
    this.tourCode = tourCode;
    this.room = null;
    this.audioSession = new AudioSessionManager();
  }

  async connect() {
    // Connect to LiveKit room
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true
    });

    // Set up room events
    this.setupRoomEvents();

    // Connect to room
    await this.room.connect(WS_URL, TOKEN);
  }

  setupRoomEvents() {
    this.room.on(RoomEvent.Connected, () => {
      console.log('Connected to room');
      this.audioSession.initialize();
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from room');
      // Handle reconnection
    });
  }
}
```

## Testing Requirements

### Platform Testing
1. **iOS Devices**
   - iPhone (multiple models)
   - iPad
   - Different iOS versions
   - Safari browser

2. **Android Devices**
   - Various manufacturers
   - Different Android versions
   - Different screen sizes
   - Chrome browser

### Test Scenarios
1. Background playback
2. Screen lock behavior
3. Network interruptions
4. Battery optimization
5. Audio quality
6. Connection stability
7. Mobile-specific behaviors (phone calls, notifications)

## Deployment Considerations

### 1. Infrastructure
- CDN for static assets
- SSL certificate
- Domain setup (join.roamcast)
- Mobile-optimized hosting

### 2. Monitoring
- Audio session status
- Connection quality
- User engagement metrics
- Error tracking
- Mobile-specific metrics

### 3. Analytics
- Join success rate
- Audio playback duration
- Platform distribution (iOS vs Android)
- Connection stability
- Mobile browser usage

## Future Enhancements

### 1. Features
- Offline support
- Audio quality selection
- Bandwidth optimization
- Enhanced media controls
- Mobile-specific optimizations

### 2. Performance
- Audio buffer optimization
- Connection quality adaptation
- Battery usage optimization
- Mobile network handling

### 3. User Experience
- Enhanced error handling
- Better platform detection
- Improved user guidance
- Accessibility improvements 

## Implementation Plan

### Phase 0: Project Setup (1 day)
1. **Create Separate Web Project**
   ```
   roamcast/
   ├── app/                  # Existing Expo app
   ├── components/           # Existing components
   ├── hooks/                # Existing hooks
   ├── services/             # Existing services
   └── web/                  # New web project (separate directory)
   ```

2. **Initialize Web Project**
   ```bash
   # From your project root
   mkdir web
   cd web
   npx create-next-app@latest . --typescript --tailwind
   ```

3. **Set Up Development Environment**
   - Configure TypeScript
   - Set up ESLint and Prettier
   - Configure testing environment

### Phase 1: LiveKit Integration (2-3 days)
1. **Adapt Existing LiveKit Code**
   - Copy relevant LiveKit integration code from existing hooks
   - Adapt for web use
   - Implement web-specific audio handling

2. **Token Generation**
   - Reuse existing token generation logic
   - Adapt for web environment
   - Implement secure token handling

3. **Connection Management**
   - Implement room connection logic
   - Handle connection events
   - Manage reconnection

### Phase 2: Web Audio Implementation (2-3 days)
1. **Audio Session Setup**
   ```typescript
   // web/src/audio/AudioSession.ts
   export class WebAudioSession {
     // Web-specific audio session management
   }
   ```

2. **Background Playback**
   - Implement Media Session API
   - Handle visibility changes
   - Manage audio context

3. **Platform-Specific Handling**
   - iOS Safari optimizations
   - Android Chrome handling
   - Browser compatibility

### Phase 3: Web Interface (2-3 days)
1. **Basic UI Components**
   - Tour code entry form
   - Connection status indicators
   - Audio controls

2. **Responsive Design**
   - Mobile-first approach
   - Platform-specific UI elements
   - Accessibility considerations

3. **User Experience**
   - Clear instructions
   - Error handling
   - Loading states

### Phase 4: Testing and Optimization (3-4 days)
1. **Platform Testing**
   - iOS devices
   - Android devices
   - Different browsers
   - Network conditions

2. **Performance Optimization**
   - Audio buffer management
   - Network optimization
   - Battery usage
   - Memory management

3. **User Testing**
   - Gather feedback
   - Identify issues
   - Make improvements

### Phase 5: Deployment and Monitoring (1-2 days)
1. **Deployment Setup**
   - Configure Vercel
   - Set up Cloudflare
   - Configure domain
   - Set up monitoring

2. **Analytics Integration**
   - Connection metrics
   - Audio playback stats
   - Error tracking
   - User engagement

### Development Workflow
1. **Local Development**
   ```bash
   # In your existing project directory
   cd web
   npm run dev  # Start the web project

   # In another terminal
   cd ..  # Back to root
   npm run start  # Start your existing Expo app
   ```

2. **Testing**
   ```bash
   # Run web tests
   cd web
   npm run test
   ```

3. **Building**
   ```bash
   # Build web project
   cd web
   npm run build
   ```

### Testing Checklist
1. **LiveKit Integration**
   - [ ] Room connection
   - [ ] Audio streaming
   - [ ] Token generation
   - [ ] Reconnection logic

2. **Web Implementation**
   - [ ] Tour code entry
   - [ ] Room connection
   - [ ] Audio playback
   - [ ] Background playback
   - [ ] System controls

3. **Platform Testing**
   - [ ] iOS Safari
   - [ ] Android Chrome
   - [ ] Different iOS versions
   - [ ] Different Android versions

4. **Integration Testing**
   - [ ] LiveKit integration
   - [ ] Audio session management
   - [ ] Platform-specific features
   - [ ] Error handling

### Success Criteria
1. **Functionality**
   - Reliable audio playback
   - Consistent background playback
   - Proper system controls
   - Smooth reconnection

2. **Performance**
   - Low latency (< 500ms)
   - Minimal battery impact
   - Efficient network usage
   - Stable memory usage

3. **Code Quality**
   - Clean, maintainable code
   - Proper error handling
   - Type safety
   - Test coverage

### Timeline
- **Total Duration**: 11-15 days
- **Critical Path**: LiveKit Integration → Web Audio Implementation → Testing
- **Buffer**: 2-3 days for unexpected issues

### Risk Mitigation
1. **Technical Risks**
   - Early testing of LiveKit integration
   - Regular performance monitoring
   - Fallback mechanisms
   - Graceful degradation

2. **Integration Risks**
   - Thorough testing of LiveKit integration
   - Careful adaptation of existing code
   - Comprehensive error handling
   - Platform-specific testing

3. **Platform Risks**
   - Regular testing on target devices
   - Platform-specific optimizations
   - Browser compatibility
   - Version-specific handling

### Next Steps
1. Set up web project directory
2. Adapt LiveKit integration code
3. Implement web audio handling
4. Begin testing on target devices 