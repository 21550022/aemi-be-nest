import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const runId = process.env.RUN_ID;
const repo = process.env.GH_REPO;
if (!/^\d+$/.test(runId ?? '') || !/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) {
  throw new Error('Invalid run ID or repository');
}
const run = JSON.parse(
  execFileSync('gh', ['api', `repos/${repo}/actions/runs/${runId}`], {
    encoding: 'utf8',
  }),
);
if (
  run.path !== '.github/workflows/ci-cd.yml' ||
  run.event !== 'push' ||
  run.head_branch !== 'main' ||
  run.conclusion !== 'success' ||
  run.repository?.full_name !== repo ||
  run.head_repository?.full_name !== repo ||
  !/^[a-f0-9]{40}$/.test(run.head_sha)
) {
  throw new Error(
    'Rollback requires a successful push run of ci-cd.yml on main in this repository',
  );
}
const artifacts = JSON.parse(
  execFileSync(
    'gh',
    ['api', `repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`],
    { encoding: 'utf8' },
  ),
);
if (
  !artifacts.artifacts.some(
    (artifact) => artifact.name === `app-${run.head_sha}` && !artifact.expired,
  )
) {
  throw new Error('Rollback artifact is missing or expired');
}
appendFileSync(process.env.GITHUB_OUTPUT, `sha=${run.head_sha}\n`);
