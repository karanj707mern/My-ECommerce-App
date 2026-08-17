import { Test, TestingModule } from '@nestjs/testing';
import { RedisIoAdapter } from './redis.adapter';

describe('RedisIoAdapter', () => {
  let adapter: RedisIoAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisIoAdapter],
    }).compile();

    adapter = module.get<RedisIoAdapter>(RedisIoAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });
});
