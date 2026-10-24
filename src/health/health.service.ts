import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class HealthService {
  private readonly commitSha: string;

  constructor(private readonly config: ConfigService) {
    try {
      const info = JSON.parse(
        readFileSync(new URL('../../build-info.json', import.meta.url), 'utf8'),
      ) as { commitSha: string };
      if (!/^[a-f0-9]{40}$/.test(info.commitSha)) {
        throw new Error('Invalid build metadata');
      }
      this.commitSha = info.commitSha;
    } catch (error) {
      if (config.appEnv !== 'local') {
        throw new Error('Valid build-info.json is required outside local', {
          cause: error,
        });
      }
      this.commitSha = 'local';
    }
  }

  getHealth() {
    return { status: 'ok' };
  }

  getVersion() {
    return { appEnv: this.config.appEnv, commitSha: this.commitSha };
  }
}
