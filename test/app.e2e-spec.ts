import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('/user (GET)', () => {
    return request(app.getHttpServer())
      .get('/user')
      .expect(200)
      .expect('hello user');
  });

  it('/version (GET) exposes only environment and build identity', async () => {
    const response = await request(app.getHttpServer())
      .get('/version')
      .expect(200);
    expect(response.body).toEqual({
      appEnv: 'local',
      commitSha: expect.stringMatching(/^(local|[a-f0-9]{40})$/),
    });
  });

  it('returns 404 for unknown routes', async () => {
    await request(app.getHttpServer()).get('/missing').expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
