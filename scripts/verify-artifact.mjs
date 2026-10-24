import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const metadata = JSON.parse(readFileSync('.artifacts/metadata.json', 'utf8'));
const checksum = createHash('sha256')
  .update(readFileSync('.artifacts/app.zip'))
  .digest('hex');
for (const [field, expected] of Object.entries({
  commitSha: process.env.EXPECTED_SHA,
  branch: process.env.EXPECTED_BRANCH,
  runId: process.env.EXPECTED_RUN_ID,
})) {
  if (!expected || metadata[field] !== expected)
    throw new Error(`Artifact ${field} mismatch`);
}
if (metadata.sha256 !== checksum) throw new Error('Artifact checksum mismatch');
if (
  readFileSync('.artifacts/app.zip.sha256', 'utf8') !== `${checksum}  app.zip\n`
) {
  throw new Error('Checksum file mismatch');
}
console.log(
  `Verified ${metadata.branch} ${metadata.commitSha} run ${metadata.runId}`,
);
