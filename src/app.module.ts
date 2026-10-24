import { ConfigService } from './config/config.service.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [],
  controllers: [AppController, HealthController],
  providers: [AppService, ConfigService, HealthService],
})
export class AppModule {}
