import { RedisIoAdapter } from './redis.adapter';

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn(() => ({})),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    duplicate: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    }),
  }));
});

describe('RedisIoAdapter', () => {
  it('should be defined', () => {
    expect(RedisIoAdapter).toBeDefined();
  });
});
