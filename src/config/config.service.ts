import { Injectable } from '@nestjs/common';

export type AppEnv = 'local' | 'staging' | 'production';

@Injectable()
export class ConfigService {
  readonly appEnv: AppEnv;
  readonly port: number;

  constructor() {
    const appEnv = process.env.APP_ENV ?? 'local';
    if (!['local', 'staging', 'production'].includes(appEnv)) {
      throw new Error('APP_ENV must be local, staging, or production');
    }
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    if (!['development', 'test', 'production'].includes(nodeEnv)) {
      throw new Error('NODE_ENV must be development, test, or production');
    }
    if (appEnv !== 'local' && nodeEnv !== 'production') {
      throw new Error('Staging and production require NODE_ENV=production');
    }
    const port = process.env.PORT ?? '3000';
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
      throw new Error('PORT must be an integer between 1 and 65535');
    }
    this.appEnv = appEnv as AppEnv;
    this.port = Number(port);
  }
}
