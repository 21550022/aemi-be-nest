import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { smoke } from './smoke.mjs';

const dir = mkdtempSync(join(tmpdir(), 'aemi-package-'));
const server = createServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const { commitSha } = JSON.parse(
  readFileSync('.artifacts/metadata.json', 'utf8'),
);
execFileSync('unzip', ['-q', resolve('.artifacts/app.zip'), '-d', dir]);
const app = spawn(process.execPath, ['dist/main.js'], {
  cwd: dir,
  env: {
    ...process.env,
    APP_ENV: 'staging',
    NODE_ENV: 'production',
    PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
app.stdout.on('data', (data) => {
  output += data;
});
app.stderr.on('data', (data) => {
  output += data;
});
try {
  await smoke(`http://127.0.0.1:${port}`, 'staging', commitSha, 6);
  app.kill('SIGTERM');
  const timer = setTimeout(() => app.kill('SIGKILL'), 5000);
  const [code, signal] = await once(app, 'exit');
  clearTimeout(timer);
  if (signal === 'SIGKILL' || (code !== 0 && signal !== 'SIGTERM')) {
    throw new Error(`Shutdown failed: ${code} ${signal}`);
  }
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (app.exitCode === null && app.signalCode === null) {
    app.kill('SIGKILL');
    await once(app, 'exit');
  }
  rmSync(dir, { recursive: true, force: true });
}
