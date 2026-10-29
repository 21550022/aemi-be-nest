import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Không nhận đầu vào; trả JSON cố định với thông điệp agent demo.
  @Get('agent-demo')
  getAgentDemo(): { message: string } {
    return { message: 'agent demo' };
  }
}
