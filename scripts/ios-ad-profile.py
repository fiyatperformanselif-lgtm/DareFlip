#!/usr/bin/env python3
"""Apply explicit iOS advertising metadata without weakening native TLS or signing."""
import argparse
import os
from pathlib import Path
import plistlib
import re

TEST_APP_ID = 'ca-app-pub-3940256099942544~1458002511'
BETA_TRACKING_DESCRIPTION = 'If you choose to allow it, this permission helps advertisers measure and personalize ads. Your game works without tracking.'


def apply_profile(plist, profile, app_id=''):
    result = dict(plist)
    # These keys are advertising-specific. Preserve unrelated capabilities/privacy entries.
    for key in list(result):
        if key.startswith('GAD') or key in ['NSUserTrackingUsageDescription', 'SKAdNetworkItems']:
            del result[key]
    if profile == 'beta':
        result['GADApplicationIdentifier'] = TEST_APP_ID
        result['GADDelayAppMeasurementInit'] = True
        result['NSUserTrackingUsageDescription'] = BETA_TRACKING_DESCRIPTION
    elif profile == 'production-ads':
        if not re.fullmatch(r'ca-app-pub-\d{16}~\d{10}', app_id) or app_id.startswith('ca-app-pub-3940256099942544~'):
            raise ValueError('Production advertising needs a publisher-owned ADMOB_IOS_APP_ID.')
        result['GADApplicationIdentifier'] = app_id
        result['GADDelayAppMeasurementInit'] = True
        # Restore only a publisher-provided, reviewed ATT explanation for a release.
        # The current app does not request ATT; do not add a tracking claim by default.
        description = os.environ.get('IOS_TRACKING_USAGE_DESCRIPTION', '').strip()
        if description:
            result['NSUserTrackingUsageDescription'] = description
        # Preserve configured production SKAdNetwork declarations for SDK attribution.
        if 'SKAdNetworkItems' in plist:
            result['SKAdNetworkItems'] = plist['SKAdNetworkItems']
    elif profile != 'ad-free':
        raise ValueError('Unknown advertising profile.')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', required=True, choices=['beta', 'ad-free', 'production-ads'])
    parser.add_argument('--plist', required=True, type=Path)
    args = parser.parse_args()
    with args.plist.open('rb') as stream:
        original = plistlib.load(stream)
    updated = apply_profile(original, args.profile, os.environ.get('ADMOB_IOS_APP_ID', ''))
    if updated == original:
        print(f'iOS {args.profile} metadata already matches; original plist formatting preserved.')
        return
    args.plist.write_bytes(plistlib.dumps(updated, sort_keys=False))
    print(f'iOS {args.profile} metadata prepared; unrelated plist entries preserved.')


if __name__ == '__main__':
    main()
