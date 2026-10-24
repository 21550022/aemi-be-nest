import { pathToFileURL } from 'node:url';

export async function smoke(baseUrl, appEnv, commitSha, attempts = 30) {
  if (
    !baseUrl ||
    !['local', 'staging', 'production'].includes(appEnv) ||
    !/^(local|[a-f0-9]{40})$/.test(commitSha ?? '')
  ) {
    throw new Error(
      'Usage: node scripts/smoke.mjs <baseUrl> <appEnv> <commitSha>',
    );
  }
  const base = new URL(baseUrl);
  if (
    appEnv !== 'local' &&
    base.protocol !== 'https:' &&
    !['127.0.0.1', 'localhost'].includes(base.hostname)
  ) {
    throw new Error('Azure smoke tests require HTTPS');
  }
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const health = await fetch(new URL('/health', base), {
        signal: AbortSignal.timeout(10000),
      });
      if (!health.ok || (await health.json()).status !== 'ok')
        throw new Error('Health check failed');
      const version = await fetch(new URL('/version', base), {
        signal: AbortSignal.timeout(10000),
      });
      const body = await version.json();
      if (
        !version.ok ||
        body.appEnv !== appEnv ||
        body.commitSha !== commitSha
      ) {
        throw new Error('Version/environment does not match the deployment');
      }
      console.log(`Smoke passed: ${base.origin} ${appEnv} ${commitSha}`);
      return;
    } catch (error) {
      console.log(`Smoke attempt ${attempt}/${attempts}: ${error.message}`);
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await smoke(...process.argv.slice(2));
}
