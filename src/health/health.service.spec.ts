import { readFileSync } from 'node:fs';
import { ConfigService } from '../config/config.service.js';
import { HealthService } from './health.service.js';

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

it('allows missing build metadata only for local development', () => {
  vi.stubEnv('APP_ENV', 'local');
  vi.mocked(readFileSync).mockImplementation(() => {
    throw new Error('missing');
  });
  expect(new HealthService(new ConfigService()).getVersion()).toEqual({
    appEnv: 'local',
    commitSha: 'local',
  });
});

it.each(['staging', 'production'])(
  'rejects missing or invalid metadata in %s',
  (appEnv) => {
    vi.stubEnv('APP_ENV', appEnv);
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(readFileSync).mockReturnValue('{"commitSha":"invalid"}');
    expect(() => new HealthService(new ConfigService())).toThrow(
      'build-info.json',
    );
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('missing');
    });
    expect(() => new HealthService(new ConfigService())).toThrow(
      'build-info.json',
    );
  },
);

it('returns build identity without exposing process configuration', () => {
  vi.stubEnv('APP_ENV', 'production');
  vi.stubEnv('NODE_ENV', 'production');
  const commitSha = 'a'.repeat(40);
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ commitSha }));
  const service = new HealthService(new ConfigService());
  expect(service.getHealth()).toEqual({ status: 'ok' });
  expect(service.getVersion()).toEqual({ appEnv: 'production', commitSha });
});
