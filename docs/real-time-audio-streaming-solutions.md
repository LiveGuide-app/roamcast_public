# Real-Time Audio Streaming Solutions for Tour Guiding

## Overview
This document outlines the implementation of real-time audio streaming in the Roamcast tour guiding application using LiveKit on Hetzner and Supabase. The requirements are:
- Support for 20-30 concurrent listeners per tour
- Tour duration: 2-3 hours
- Low latency for real-time communication
- High audio quality for clear guide instructions
- Reliable connection for outdoor use
- Cost-effective for regular tour operations

## Solution: LiveKit on Hetzner

### Why LiveKit?
- Open source solution
- Built specifically for real-time audio/video
- Excellent documentation
- Can be self-hosted
- Built-in support for recording
- Native ARM support

### Why Hetzner?
- Very affordable pricing
- CX32: 4 vCPU, 8GB RAM at $7.59/month
- Sufficient for our use case
- Cost-effective solution
- Good performance
- Reliable infrastructure

### Hetzner Instance Capacity

#### Resource Allocation
- 4 vCPUs (Intel)
- 8GB RAM
- 80GB NVMe SSD
- 20TB traffic included
- Can handle 40-50 concurrent tours

#### System Bottlenecks

1. **Primary Bottleneck: CPU**
   - Each tour room requires ~5-7% CPU for:
     - Audio processing (optimized for audio-only)
     - WebRTC operations (efficient for audio)
     - Room management overhead
     - Room state management
     - Connection handling
   - System operations need ~0.2 CPU
   - Maximum concurrent tours limited by CPU: ~40-50 tours
   - Based on room overhead and LiveKit benchmarks

2. **Secondary Bottlenecks**
   - **Memory**: Not a primary bottleneck
     - Each tour room uses ~200-300MB RAM
     - Additional overhead for room management
     - 8GB RAM could theoretically handle 25+ rooms
     - But CPU limitation prevents this
   
   - **Bandwidth**: Monthly limit of 20TB
     - Each tour room: ~7.3 kBps in, 23 MBps out
     - Each participant: ~7.7 KB/s
     - Additional overhead for room signaling
     - Monthly bandwidth limit: 20TB
     - This becomes the limiting factor for total monthly sessions

3. **Resource Optimization**
   - Keep CPU usage below 80% for optimal performance
   - Reserve 0.2 CPU for system operations
   - Monitor audio quality metrics
   - Implement automatic quality reduction if needed
   - Implement room cleanup after tours
   - Use room timeouts for inactive rooms

#### Capacity Calculations

1. **Per Tour Room Resource Requirements**
   - 20-30 participants per room
   - Each participant: ~7.7 KB/s audio stream
   - Total bandwidth per room: ~7.3 kBps in, 23 MBps out
   - CPU usage per room: ~5-7% CPU
   - Memory usage per room: ~200-300MB
   - Additional overhead for room management

2. **Concurrent Tours**
   - With 4 vCPUs and 8GB RAM:
     - Maximum concurrent tours: ~40-50 tours
     - Recommended concurrent tours: 30-40 tours
     - This ensures:
       - CPU stays below 80% usage
       - 0.2 CPU reserved for system
       - Optimal audio quality
       - Stable performance
       - Room for room management overhead

3. **Monthly Tour Capacity**
   - Tour duration: 2-3 hours
   - Tours per day: 320 tours (40 concurrent × 8 hours)
   - Operating days per month: 30
   - Total tours per month: 9,600 tours
   - Limited by 20TB monthly bandwidth
   - Recommended tours per month: 8,000-9,000 tours

#### Resource Optimization Recommendations

1. **VM Configuration**
   - Monitor system resources
   - Configure auto-scaling if needed
   - Implement load balancing
   - Set up monitoring and alerts

2. **Bandwidth Management**
   - Implement adaptive bitrate
   - Use audio compression
   - Monitor bandwidth usage
   - Set up bandwidth alerts

3. **Memory Management**
   - Monitor memory usage
   - Set up alerts for high memory usage
   - Configure swap space if needed

4. **CPU Optimization**
   - Monitor CPU usage per tour
   - Implement CPU limits per room
   - Set up auto-scaling based on CPU load
   - Configure CPU affinity for better performance

## Implementation Plan

### Phase 1: Hetzner Setup (1-2 days)
1. **Initial Setup**
   - Create Hetzner account
   - Set up CX32 instance
   - Configure firewall for required ports:
     - 443 (HTTPS and TURN/TLS)
     - 80 (TLS issuance)
     - 7881 (WebRTC over TCP)
     - 3478/UDP (TURN/UDP)
     - 50000-60000/UDP (WebRTC over UDP)
   - Set up domain and DNS records
   - Configure instance firewall:
     ```bash
     sudo ufw allow 80/tcp
     sudo ufw allow 443/tcp
     sudo ufw allow 7881/tcp
     sudo ufw allow 443/udp
     sudo ufw allow 50000:60000/udp
     sudo ufw enable
     ```

2. **Testing Points**
   - Verify instance is running
   - Test port accessibility
   - Validate DNS configuration
   - Check firewall rules
   - Test domain resolution

### Phase 2: LiveKit Server Deployment (1-2 days)
1. **Configuration Generation**
   - Pull LiveKit configuration generator:
     ```bash
     docker pull livekit/generate
     ```
   - Generate configuration files:
     ```bash
     docker run --rm -it -v$PWD:/output livekit/generate
     ```
   - Verify generated files:
     - caddy.yaml
     - docker-compose.yaml
     - livekit.yaml
     - redis.conf
     - init_script.sh

2. **Server Deployment**
   - Deploy configuration to VM
   - Install required packages:
     ```bash
     sudo apt update
     sudo apt install -y docker.io docker-compose
     ```
   - Copy configuration to `/opt/livekit`
   - Set up systemd service `livekit-docker`
   - Start LiveKit service:
     ```bash
     systemctl start livekit-docker
     ```

3. **Testing Points**
   - Verify LiveKit service status:
     ```bash
     systemctl status livekit-docker
     ```
   - Check LiveKit logs:
     ```bash
     cd /opt/livekit
     sudo docker-compose logs
     ```
   - Validate TLS certificates:
     - Check for "certificate obtained successfully" log entry
   - Test WebRTC connections
   - Verify room creation/joining
   - Test audio functionality

4. **Monitoring Setup**
   - Configure health checks
   - Set up logging
   - Monitor system resources
   - Configure alerts

### Phase 3: Supabase Integration (1-2 days)
1. **Database Setup**
   - Create new tables:
     ```sql
     -- Add LiveKit-specific columns to tours table
     ALTER TABLE tours
     ADD COLUMN livekit_room_id TEXT,
     ADD COLUMN livekit_room_status TEXT DEFAULT 'pending';

     -- Create LiveKit rooms table
     CREATE TABLE livekit_rooms (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       tour_id UUID REFERENCES tours(id),
       room_id TEXT NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       status TEXT DEFAULT 'active'
     );
     ```
   - Set up RLS policies
   - Create token generation function

2. **Testing Points**
   - Test database connections
   - Verify RLS policies
   - Test token generation
   - Validate data integrity

### Phase 4: API Integration (1-2 days)
1. **Backend Implementation**
   - Create token generation endpoint:
     - Generate unique token for each participant
     - Include room name and participant identity
     - Set appropriate permissions (publish/subscribe)
   - Add error handling
   - Set up logging

2. **Testing Points**
   - Test token generation
   - Verify permissions
   - Check error handling
   - Validate token security

### Phase 5: Client Implementation (2-3 days)
1. **Frontend Development**
   - Add LiveKit client SDK:
     ```typescript
     // Example connection code
     const room = new Room();
     await room.connect(wsUrl, token);
     ```
   - Implement audio controls:
     - Mute/unmute
     - Volume control
     - Speaker selection
   - Add connection status indicators
   - Implement reconnection logic:
     - Handle network changes
     - Automatic reconnection
     - Connection state UI

2. **Testing Points**
   - Test room joining/leaving
   - Verify audio functionality
   - Check connection handling
   - Test on different devices
   - Validate reconnection behavior

### Phase 6: Integration Testing (2-3 days)
1. **End-to-End Testing**
   - Test complete tour flow:
     - Tour creation
     - Room creation
     - Guide joining
     - Participant joining
     - Audio communication
     - Tour completion
   - Load testing with multiple tours
   - Error scenario testing

2. **Testing Points**
   - Verify complete tour flow
   - Test concurrent tours
   - Check error recovery
   - Validate performance

### Phase 7: Monitoring and Maintenance (1-2 days)
1. **Monitoring Setup**
   - Configure resource monitoring
   - Set up alerts for:
     - High CPU usage
     - Memory issues
     - Connection problems
     - Room errors
   - Implement logging
   - Set up analytics

2. **Testing Points**
   - Verify monitoring
   - Test alerts
   - Check logging
   - Validate analytics

### Phase 8: Production Deployment (1-2 days)
1. **Deployment**
   - Set up production environment
   - Configure monitoring
   - Implement backup procedures
   - Set up CI/CD pipeline

2. **Testing Points**
   - Verify production setup
   - Test backup/restore
   - Check CI/CD pipeline
   - Validate monitoring

### Deployment Options

**Manual Deployment**
   - Pros:
     - Full control over infrastructure
     - No additional service costs
     - Custom configuration options
     - Direct access to resources
   - Cons:
     - More complex setup
     - Manual SSL management
     - Manual scaling
     - More maintenance required

### Testing Checklist
1. **Unit Tests**
   - API endpoints
   - Token generation
   - Room management
   - Audio controls

2. **Integration Tests**
   - Tour creation flow
   - Room lifecycle
   - Audio communication
   - Error handling

3. **Load Tests**
   - Concurrent tours
   - Multiple participants
   - Long-duration tests
   - Resource usage

4. **Security Tests**
   - Token validation
   - Access control
   - Data protection
   - Network security

### Rollback Plan
1. **Database Rollback**
   - Backup before changes
   - Revert SQL changes
   - Restore data if needed

2. **Server Rollback**
   - Keep old configuration
   - Revert Docker changes
   - Restore SSL certificates

3. **Client Rollback**
   - Version control
   - Feature flags
   - A/B testing capability

### Success Criteria
1. **Performance**
   - < 200ms audio latency
   - < 80% CPU usage
   - < 80% memory usage
   - Stable connections

2. **Reliability**
   - 99.9% uptime
   - Automatic reconnection
   - Error recovery
   - Data consistency

3. **User Experience**
   - Clear audio quality
   - Responsive controls
   - Intuitive interface
   - Smooth transitions

## References
- [LiveKit Documentation](https://livekit.io/docs)
- [Hetzner Documentation](https://docs.hetzner.com/)
- [Supabase Documentation](https://supabase.com/docs) 