import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

if (process.platform !== 'linux' && process.env.ALLOW_LOCAL_PACKAGE !== '1') {
  throw new Error(
    'Build deployment packages on Linux. ALLOW_LOCAL_PACKAGE=1 is for local validation only.',
  );
}
const root = process.cwd();
const output = resolve(root, '.artifacts');
const staging = resolve(output, 'app');
rmSync(output, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
for (const file of ['package.json', 'pnpm-lock.yaml', 'build-info.json']) {
  cpSync(resolve(root, file), resolve(staging, file));
}
cpSync(resolve(root, 'dist'), resolve(staging, 'dist'), { recursive: true });
execFileSync(
  'pnpm',
  ['install', '--prod', '--frozen-lockfile', '--node-linker=hoisted'],
  {
    cwd: staging,
    stdio: 'inherit',
  },
);
// Chỉ các mục được phép mới nằm trong ZIP; lockfile/store không được triển khai.
execFileSync(
  'zip',
  [
    '-qr',
    resolve(output, 'app.zip'),
    'dist',
    'node_modules',
    'package.json',
    'build-info.json',
  ],
  {
    cwd: staging,
    stdio: 'inherit',
  },
);
const checksum = createHash('sha256')
  .update(readFileSync(resolve(output, 'app.zip')))
  .digest('hex');
const { commitSha } = JSON.parse(
  readFileSync(resolve(staging, 'build-info.json'), 'utf8'),
);
writeFileSync(
  resolve(output, 'metadata.json'),
  JSON.stringify(
    {
      commitSha,
      branch: process.env.GITHUB_REF_NAME ?? 'local',
      runId: process.env.GITHUB_RUN_ID ?? 'local',
      sha256: checksum,
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(resolve(output, 'app.zip.sha256'), `${checksum}  app.zip\n`);
console.log(`Packaged ${commitSha}: ${checksum}`);
