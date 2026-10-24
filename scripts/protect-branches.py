#!/usr/bin/env python3
"""Yêu cầu PR và CI đạt cho main/staging, áp dụng cả admin."""
import argparse
import json
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo', required=True)
args = parser.parse_args()
body = {
    'required_status_checks': {'strict': True, 'contexts': ['Quality checks']},
    'enforce_admins': True,
    'required_pull_request_reviews': {
        'dismiss_stale_reviews': True,
        'require_code_owner_reviews': False,
        'required_approving_review_count': 0,
    },
    'restrictions': None,
    'allow_force_pushes': False,
    'allow_deletions': False,
}
for branch in ['main', 'staging']:
    subprocess.run(['gh', 'api', f'repos/{args.repo}/branches/{branch}/protection',
                    '--method', 'PUT', '--input', '-', '--silent'],
                   input=json.dumps(body), text=True, check=True)
    print(f'Protected {branch}: PR + Quality checks, no force push/delete')
