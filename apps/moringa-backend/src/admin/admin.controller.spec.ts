import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AdminModule } from './admin.module';

describe('AdminController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AdminModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/admin/dashboard (GET)', () => {
    it('should return dashboard stats', () => {
      return request(app.getHttpServer())
        .get('/admin/dashboard')
        .expect(401); // Requires auth
    });
  });
});
