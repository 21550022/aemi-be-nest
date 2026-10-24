import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const commitSha =
  process.env.BUILD_SHA ??
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commitSha)) {
  throw new Error('BUILD_SHA must be a full Git commit SHA');
}
writeFileSync('build-info.json', JSON.stringify({ commitSha }) + '\n');
