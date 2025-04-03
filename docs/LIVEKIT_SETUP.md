# LiveKit Setup Guide for Roamcast

## Overview
This document outlines the setup and troubleshooting process for LiveKit integration in Roamcast, hosted on Hetzner.

## Server Configuration

### 1. LiveKit Server Requirements
- Hetzner server with Ubuntu
- Domain/subdomain pointing to the server (e.g., livekit.beatbrief.ai)
- SSL certificate (required for WSS connections)
- Open ports:
  - 443 (WSS - WebSocket Secure)
  - 7880 (LiveKit default port - to be changed to 443)
  - 7881 (LiveKit default port - to be changed)

### 2. Network Configuration
```bash
# Check if ports are open
sudo netstat -tulpn | grep LISTEN

# Configure firewall for LiveKit
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
```

## Client Configuration

### 1. Environment Variables
Required environment variables in `.env`:
```
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_WS_URL=wss://livekit.beatbrief.ai
```

### 2. App Permissions
Android and iOS permissions are handled through our LiveKit plugin (`plugins/withLiveKit.js`).

Required permissions:
- Audio recording
- Network access
- Background audio (iOS)
- VoIP capabilities (iOS)

## Testing Process

1. Server Connection Test
```bash
# From your local machine
wscat -c wss://livekit.beatbrief.ai
```

2. Client Connection Test
```typescript
// Add this to your app for testing
import { Room } from 'livekit-client';

async function testConnection() {
  const room = new Room();
  console.log('Attempting to connect with WebSocket URL:', LIVEKIT_WS_URL);
  try {
    await room.connect(LIVEKIT_WS_URL, 'test-token');
    console.log('Connected successfully');
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

## Troubleshooting

### Common Issues

1. Connection Timeout (Error 1006)
- Check if the server is reachable
- Verify SSL certificate is valid
- Ensure ports are open on Hetzner firewall
- Test with both emulator and physical device

2. Audio Issues
- Verify microphone permissions are granted
- Check audio routing settings
- Test with headphones to rule out feedback

3. Background Audio
- iOS: Verify background modes are properly configured
- Android: Check wake lock permission

### Debugging Steps

1. Server-side:
```bash
# Check LiveKit logs
journalctl -u livekit -f

# Verify SSL certificate
curl -vI https://livekit.beatbrief.ai
```

2. Client-side:
```typescript
// Enable debug logging
import { setLogLevel, LogLevel } from 'livekit-client';
setLogLevel(LogLevel.DEBUG);
```

## Next Steps

1. [ ] Verify server configuration
2. [ ] Update LiveKit ports to use 443
3. [ ] Test connection with physical device
4. [ ] Implement proper error handling
5. [ ] Set up monitoring

## Resources

- [LiveKit Documentation](https://docs.livekit.io)
- [WebRTC Troubleshooting](https://docs.livekit.io/guides/troubleshooting)
- [Hetzner Firewall Guide](https://docs.hetzner.com/cloud/firewalls/overview) 