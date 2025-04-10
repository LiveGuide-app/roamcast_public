import { LiveKitService } from '../livekit';
import { Room, RoomEvent } from 'livekit-client';
import { generateLiveKitToken } from '../supabase';

// Mock the livekit-client module
jest.mock('livekit-client', () => ({
  Room: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    on: jest.fn(),
  })),
  RoomEvent: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected',
  },
}));

// Mock the supabase service
jest.mock('../supabase', () => ({
  generateLiveKitToken: jest.fn().mockResolvedValue('mock-token'),
}));

describe('LiveKitService', () => {
  let service: LiveKitService;
  let mockRoom: jest.Mocked<Room>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LiveKitService();
    mockRoom = new Room() as jest.Mocked<Room>;
  });

  describe('connect', () => {
    it('should connect to a room successfully', async () => {
      const tourCode = 'test-tour';
      await service.connect(tourCode);

      expect(generateLiveKitToken).toHaveBeenCalledWith(tourCode);
      expect(mockRoom.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const tourCode = 'test-tour';
      const error = new Error('Connection failed');
      mockRoom.connect.mockRejectedValueOnce(error);

      await expect(service.connect(tourCode)).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from the room', () => {
      service.disconnect();
      expect(mockRoom.disconnect).toHaveBeenCalled();
    });
  });

  describe('room events', () => {
    it('should set up room event listeners', async () => {
      const tourCode = 'test-tour';
      await service.connect(tourCode);

      expect(mockRoom.on).toHaveBeenCalledWith(RoomEvent.Connected, expect.any(Function));
      expect(mockRoom.on).toHaveBeenCalledWith(RoomEvent.Disconnected, expect.any(Function));
      expect(mockRoom.on).toHaveBeenCalledWith(RoomEvent.ParticipantConnected, expect.any(Function));
      expect(mockRoom.on).toHaveBeenCalledWith(RoomEvent.ParticipantDisconnected, expect.any(Function));
    });
  });
});