#!/usr/bin/env python3
"""Tạo hạ tầng F1 và OIDC; không nâng cấp sang gói trả phí."""
import argparse
import json
import subprocess
import time


def command(args, body=None):
    result = subprocess.run(args, input=json.dumps(body) if body is not None else None,
                            text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return json.loads(result.stdout) if result.stdout.strip() else None


def az(*args):
    return command(['az', *args, '--output', 'json', '--only-show-errors'])


def gh(path, method='GET', body=None):
    args = ['gh', 'api', path, '--method', method]
    if body is not None:
        args += ['--input', '-']
    return command(args, body)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--environment', required=True, choices=['staging', 'production'])
parser.add_argument('--repo', required=True, help='owner/repository, repository phải tồn tại')
parser.add_argument('--app-name', required=True, help='Tên Web App duy nhất toàn cục')
parser.add_argument('--location', default='southeastasia')
args = parser.parse_args()
env = args.environment
branch = 'main' if env == 'production' else 'staging'
rg = f'rg-aemi-be-{env}'
plan_name = f'asp-aemi-be-{env}'
identity_name = f'id-aemi-be-{env}-github'
repo = gh(f'repos/{args.repo}')
if repo['private']:
    raise RuntimeError('Kế hoạch này yêu cầu repository public; không tự đổi visibility')
account = az('account', 'show')
subscription = account['id']
tenant = account['tenantId']
print(f'Preparing {env}: {rg}, {args.app_name}', flush=True)
az('group', 'create', '--name', rg, '--location', args.location,
   '--tags', 'project=aemi-be', f'environment={env}', 'purpose=learning')
plans = az('appservice', 'plan', 'list', '--resource-group', rg)
plan = next((p for p in plans if p['name'] == plan_name), None)
if plan is None:
    az('appservice', 'plan', 'create', '--name', plan_name, '--resource-group', rg,
       '--location', args.location, '--sku', 'F1', '--is-linux')
plan = az('appservice', 'plan', 'show', '--name', plan_name, '--resource-group', rg)
if plan['sku']['name'] != 'F1' or plan['sku']['tier'] != 'Free':
    raise RuntimeError('Expected F1 Free; refusing to change an existing paid plan')
apps = az('webapp', 'list', '--resource-group', rg)
app = next((a for a in apps if a['name'] == args.app_name), None)
if app is None:
    app = az('webapp', 'create', '--name', args.app_name, '--resource-group', rg,
             '--plan', plan_name, '--runtime', 'NODE:22-lts', '--https-only', 'true')
if app['serverFarmId'].lower() != plan['id'].lower():
    raise RuntimeError('Existing app uses another plan; refusing to modify it')
az('webapp', 'update', '-g', rg, '-n', args.app_name, '--https-only', 'true')
az('webapp', 'config', 'set', '-g', rg, '-n', args.app_name,
   '--startup-file', 'node dist/main.js', '--linux-fx-version', 'NODE|22-lts',
   '--ftps-state', 'Disabled', '--min-tls-version', '1.2')
az('webapp', 'config', 'appsettings', 'set', '-g', rg, '-n', args.app_name,
   '--settings', f'APP_ENV={env}', 'NODE_ENV=production',
   'SCM_DO_BUILD_DURING_DEPLOYMENT=false', 'ENABLE_ORYX_BUILD=false')
for policy in ['scm', 'ftp']:
    az('rest', '--method', 'PUT', '--url',
       f"https://management.azure.com{app['id']}/basicPublishingCredentialsPolicies/{policy}?api-version=2022-03-01",
       '--body', json.dumps({'properties': {'allow': False}}))
identity = az('identity', 'create', '-g', rg, '-n', identity_name)
az('identity', 'federated-credential', 'create', '-g', rg,
   '--identity-name', identity_name, '-n', 'github-environment',
   '--issuer', 'https://token.actions.githubusercontent.com',
   '--subject', f'repo:{args.repo}:environment:{env}',
   '--audiences', 'api://AzureADTokenExchange')
for attempt in range(6):
    try:
        az('role', 'assignment', 'create', '--assignee-object-id', identity['principalId'],
           '--assignee-principal-type', 'ServicePrincipal', '--role', 'Website Contributor',
           '--scope', app['id'])
        break
    except RuntimeError:
        if attempt == 5:
            raise
        time.sleep(10)
# Không bật reviewer: merge nhánh đích tự triển khai.
path = f'repos/{args.repo}/environments/{env}'
gh(path, 'PUT', {'deployment_branch_policy': {
    'protected_branches': False, 'custom_branch_policies': True}})
policies = gh(path + '/deployment-branch-policies')['branch_policies']
if not any(p['name'] == branch for p in policies):
    gh(path + '/deployment-branch-policies', 'POST', {'name': branch, 'type': 'branch'})
variables = {
    'AZURE_CLIENT_ID': identity['clientId'],
    'AZURE_TENANT_ID': tenant,
    'AZURE_SUBSCRIPTION_ID': subscription,
    'AZURE_WEBAPP_NAME': args.app_name,
    'AZURE_BASE_URL': 'https://' + app['defaultHostName'],
}
for name, value in variables.items():
    subprocess.run(['gh', 'variable', 'set', name, '--repo', args.repo,
                    '--env', env, '--body', value], check=True)
print(json.dumps({'environment': env, 'branch': branch,
                  'app': args.app_name, 'baseUrl': variables['AZURE_BASE_URL'],
                  'resourceGroup': rg, 'sku': plan['sku']['name']}, indent=2))
