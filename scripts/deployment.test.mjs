import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { smoke } from './smoke.mjs';

const verifier = resolve('scripts/verify-artifact.mjs');
test('artifact verifier rejects wrong source metadata and changed ZIP bytes', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'artifact-verify-'));
  const dir = join(cwd, '.artifacts');
  mkdirSync(dir);
  const sha = 'a'.repeat(40);
  const checksum = createHash('sha256')
    .update('original package')
    .digest('hex');
  writeFileSync(join(dir, 'app.zip'), 'original package');
  writeFileSync(join(dir, 'app.zip.sha256'), `${checksum}  app.zip\n`);
  writeFileSync(
    join(dir, 'metadata.json'),
    JSON.stringify({
      commitSha: sha,
      branch: 'main',
      runId: '123',
      sha256: checksum,
    }),
  );
  const env = {
    ...process.env,
    EXPECTED_SHA: sha,
    EXPECTED_BRANCH: 'main',
    EXPECTED_RUN_ID: '123',
  };
  const run = (overrides = {}) =>
    spawnSync(process.execPath, [verifier], {
      cwd,
      env: { ...env, ...overrides },
    });
  try {
    assert.equal(run().status, 0);
    assert.notEqual(run({ EXPECTED_BRANCH: 'staging' }).status, 0);
    assert.notEqual(run({ EXPECTED_RUN_ID: '999' }).status, 0);
    assert.notEqual(run({ EXPECTED_SHA: 'b'.repeat(40) }).status, 0);
    writeFileSync(join(dir, 'app.zip'), 'tampered package');
    assert.notEqual(run().status, 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('smoke rejects a healthy app running the wrong environment or SHA', async () => {
  const sha = 'a'.repeat(40);
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        req.url === '/health'
          ? { status: 'ok' }
          : { appEnv: 'staging', commitSha: sha },
      ),
    );
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await smoke(url, 'staging', sha, 1);
    await assert.rejects(smoke(url, 'production', sha, 1));
    await assert.rejects(smoke(url, 'staging', 'b'.repeat(40), 1));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
