/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/login (POST)', () => {
    it('should return access token for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@utsho.com',
          password: 'Admin@123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('admin@utsho.com');
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@utsho.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should return 400 for missing email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          password: 'Admin@123',
        })
        .expect(400);
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Admin@123',
        })
        .expect(400);
    });
  });

  describe('/api/auth/me (GET)', () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@utsho.com',
          password: 'Admin@123',
        });

      authToken = loginResponse.body.data.access_token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('admin@utsho.com');
      expect(response.body.data.role).toBe('SUPER_ADMIN');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/health (GET)', () => {
    it('should return healthy status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
