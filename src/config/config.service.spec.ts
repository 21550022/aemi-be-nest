import { ConfigService } from './config.service.js';

afterEach(() => vi.unstubAllEnvs());

it('uses local defaults', () => {
  vi.stubEnv('APP_ENV', undefined);
  vi.stubEnv('PORT', undefined);
  expect(new ConfigService()).toMatchObject({ appEnv: 'local', port: 3000 });
});

it.each(['qa', '', 'prod'])('rejects unsupported APP_ENV %s', (value) => {
  vi.stubEnv('APP_ENV', value);
  expect(() => new ConfigService()).toThrow('APP_ENV');
});

it.each(['0', '65536', '3.5', 'abc', ''])(
  'rejects invalid PORT %s',
  (value) => {
    vi.stubEnv('PORT', value);
    expect(() => new ConfigService()).toThrow('PORT');
  },
);

it('requires production Node mode for staging', () => {
  vi.stubEnv('APP_ENV', 'staging');
  vi.stubEnv('NODE_ENV', 'development');
  expect(() => new ConfigService()).toThrow('NODE_ENV=production');
});

it.each(['staging', 'production'])('accepts cloud environment %s', (value) => {
  vi.stubEnv('APP_ENV', value);
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('PORT', '8080');
  expect(new ConfigService()).toMatchObject({ appEnv: value, port: 8080 });
});
