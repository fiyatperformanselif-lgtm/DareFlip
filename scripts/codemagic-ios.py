#!/usr/bin/env python3
"""Codemagic metadata checks; native signing/API operations run only on the configured cloud Mac."""
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent


def metadata(env):
    values = {name: env.get(name, '').strip() for name in ['BUNDLE_ID', 'APPLE_TEAM_ID', 'APP_STORE_APPLE_ID']}
    if not re.fullmatch(r'[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+){2,}', values['BUNDLE_ID']):
        raise ValueError('BUNDLE_ID must match the publisher-registered bundle identifier in codemagic.yaml.')
    if not re.fullmatch(r'[A-Z0-9]{10}', values['APPLE_TEAM_ID']):
        raise ValueError('Set the real 10-character APPLE_TEAM_ID in the dareflip_beta variable group.')
    if not re.fullmatch(r'[1-9][0-9]*', values['APP_STORE_APPLE_ID']):
        raise ValueError('Set the numeric APP_STORE_APPLE_ID from App Store Connect in dareflip_beta.')
    return values


def apple_output(arguments):
    # Credentials come from the configured Codemagic integration, never flags/files in Git.
    result = subprocess.run(['app-store-connect', *arguments], stdout=subprocess.PIPE, text=True, timeout=180)
    if result.returncode:
        raise RuntimeError(f'App Store Connect command failed (exit {result.returncode}); not treating it as an empty app.')
    return result.stdout.strip()


def verify_app(response, values):
    app = json.loads(response)
    app = app.get('data', app)
    if app.get('id') != values['APP_STORE_APPLE_ID'] or app.get('attributes', {}).get('bundleId') != values['BUNDLE_ID']:
        raise ValueError('The Apple app ID does not match BUNDLE_ID; correct Codemagic metadata before uploading.')


def next_number(latest):
    # Official CLI returns empty stdout with success only when no builds exist.
    if latest == '':
        return 1
    if not re.fullmatch(r'[0-9]+', latest):
        raise ValueError('Existing build number is not an integer; resolve version numbering explicitly before retrying.')
    return int(latest) + 1


def prepare_project(text, bundle, team, number):
    text, bundle_count = re.subn(r'PRODUCT_BUNDLE_IDENTIFIER = [^;\n]+;', f'PRODUCT_BUNDLE_IDENTIFIER = {bundle};', text)
    text, number_count = re.subn(r'CURRENT_PROJECT_VERSION = [^;\n]+;', f'CURRENT_PROJECT_VERSION = {number};', text)
    if bundle_count != 2 or number_count != 2:
        raise ValueError('Expected App Debug and Release metadata; inspect the changed Xcode project before signing.')
    text = re.sub(r'\s*DEVELOPMENT_TEAM = [^;\n]+;', '', text)
    return text.replace(f'PRODUCT_BUNDLE_IDENTIFIER = {bundle};', f'PRODUCT_BUNDLE_IDENTIFIER = {bundle};\n\t\t\t\tDEVELOPMENT_TEAM = {team};')


def verify_profile(options, values):
    if options.get('teamID') != values['APPLE_TEAM_ID']:
        raise ValueError('The selected signing profile belongs to a different Apple team.')
    if not options.get('provisioningProfiles', {}).get(values['BUNDLE_ID']):
        raise ValueError('No App Store provisioning profile was applied for BUNDLE_ID.')
    if options.get('method') not in ['app-store', 'app-store-connect']:
        raise ValueError('Expected App Store distribution signing for TestFlight.')


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ['check', 'prepare', 'verify-profile']:
        raise ValueError('Usage: python3 scripts/codemagic-ios.py check|prepare|verify-profile')
    values = metadata(os.environ)
    if sys.argv[1] == 'verify-profile':
        with (Path.home() / 'export_options.plist').open('rb') as stream:
            verify_profile(plistlib.load(stream), values)
        print('Stored distribution profile matches the configured team and bundle.')
        return
    verify_app(apple_output(['apps', 'get', values['APP_STORE_APPLE_ID'], '--json']), values)
    if sys.argv[1] == 'check':
        print('Apple app identity verified; no signing key values were printed.')
        return
    latest = apple_output(['get-latest-build-number', values['APP_STORE_APPLE_ID'], '--platform', 'IOS', '--all-versions'])
    number = next_number(latest)
    project = ROOT / 'ios/App/App.xcodeproj/project.pbxproj'
    project.write_text(prepare_project(project.read_text(), values['BUNDLE_ID'], values['APPLE_TEAM_ID'], number))
    config = json.loads((ROOT / 'ios/App/App/capacitor.config.json').read_text())
    if config.get('appId') != values['BUNDLE_ID']:
        raise ValueError('Capacitor appId differs from BUNDLE_ID; run beta:ios with DAREFLIP_BUNDLE_ID first.')
    print(f'Configured both Xcode build variants with unused build number {number}. Run one upload at a time until Apple finishes processing.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        print(f'Codemagic iOS preflight failed: {error}', file=sys.stderr)
        raise SystemExit(1)
