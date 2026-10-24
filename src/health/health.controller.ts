import { Controller, Get, Header } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @Header('Cache-Control', 'no-store')
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('version')
  @Header('Cache-Control', 'no-store')
  getVersion() {
    return this.healthService.getVersion();
  }
}
