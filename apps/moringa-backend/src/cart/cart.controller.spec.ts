import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CartModule } from './cart.module';

describe('CartController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CartModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/cart (GET)', () => {
    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/cart')
        .expect(401);
    });
  });
});
