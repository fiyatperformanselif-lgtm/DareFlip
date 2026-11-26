#!/usr/bin/env python3
"""Exercise actual Capacitor native graph generation in an isolated Linux fixture."""
import importlib.util
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('ios_ad_profile', ROOT / 'scripts/ios-ad-profile.py')
profiles = importlib.util.module_from_spec(spec)
spec.loader.exec_module(profiles)


class PlistProfileTests(unittest.TestCase):
    def test_ad_free_strips_only_advertising_metadata_and_is_idempotent(self):
        original = {'CFBundleDisplayName': 'DareFlip', 'GADApplicationIdentifier': profiles.TEST_APP_ID, 'GADDelayAppMeasurementInit': True, 'NSUserTrackingUsageDescription': 'fixture', 'SKAdNetworkItems': [{'SKAdNetworkIdentifier': 'fixture'}], 'OtherCapability': ['preserved']}
        free = profiles.apply_profile(original, 'ad-free')
        self.assertEqual(free, {'CFBundleDisplayName': 'DareFlip', 'OtherCapability': ['preserved']})
        self.assertEqual(profiles.apply_profile(free, 'ad-free'), free)

    def test_beta_restores_official_test_configuration_after_ad_free(self):
        original = {'CFBundleDisplayName': 'DareFlip'}
        beta = profiles.apply_profile(profiles.apply_profile(original, 'ad-free'), 'beta')
        self.assertEqual(beta['GADApplicationIdentifier'], profiles.TEST_APP_ID)
        self.assertTrue(beta['GADDelayAppMeasurementInit'])
        self.assertTrue(beta['NSUserTrackingUsageDescription'])
        self.assertEqual(profiles.apply_profile(beta, 'beta'), beta)

    def test_production_rejects_missing_and_sample_ids(self):
        for value in ['', 'invalid', profiles.TEST_APP_ID]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                profiles.apply_profile({}, 'production-ads', value)

    def test_production_accepts_only_explicit_publisher_format_without_tracking_default(self):
        # Synthetic fixture, never used in configuration, a native project, or a request.
        fixture_id = 'ca-app-pub-' + '1' * 16 + '~' + '2' * 10
        with mock.patch.dict(os.environ, {'IOS_TRACKING_USAGE_DESCRIPTION': ''}):
            production = profiles.apply_profile({'CFBundleDisplayName': 'DareFlip'}, 'production-ads', fixture_id)
        self.assertEqual(production['GADApplicationIdentifier'], fixture_id)
        self.assertNotIn('NSUserTrackingUsageDescription', production)


class ReleaseGateTests(unittest.TestCase):
    def test_failed_platform_preflight_stops_before_payload_or_native_mutation(self):
        with tempfile.TemporaryDirectory(prefix='dareflip-ios-release-gate-') as temporary:
            root = Path(temporary)
            (root / 'scripts').mkdir()
            (root / 'scripts/check-release.mjs').write_text("import {writeFileSync} from 'node:fs'; writeFileSync('gate-args.json', JSON.stringify(process.argv.slice(2))); process.exit(17);")
            env = {**os.environ, 'DAREFLIP_RELEASE_PROFILE': 'ad-free', 'VITE_ADS_ENABLED': 'false', 'VITE_ADMOB_TESTING': 'false'}
            result = subprocess.run(['node', str(ROOT / 'scripts/prepare-ios-release.mjs'), '--root', str(root)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=30)
            self.assertEqual(result.returncode, 17, result.stdout)
            self.assertEqual(json.loads((root / 'gate-args.json').read_text()), ['--platform', 'ios', '--profile', 'ad-free'])
            self.assertFalse((root / 'dist').exists())
            self.assertFalse((root / 'ios').exists())


    def test_contradictory_node_modes_stop_before_any_preflight_or_build(self):
        for variable in ['NODE_ENV', 'VITE_USER_NODE_ENV', 'env-file']:
            with self.subTest(variable=variable), tempfile.TemporaryDirectory(prefix='dareflip-ios-mode-') as temporary:
                root = Path(temporary)
                (root / 'scripts').mkdir()
                (root / 'scripts/check-release.mjs').write_text("import {writeFileSync} from 'node:fs';writeFileSync('unexpected-gate','called');")
                env = {**os.environ, 'DAREFLIP_RELEASE_PROFILE': 'ad-free', 'VITE_ADS_ENABLED': 'false', 'VITE_ADMOB_TESTING': 'false'}
                env.pop('NODE_ENV', None)
                env.pop('VITE_USER_NODE_ENV', None)
                if variable == 'env-file':
                    (root / '.env.production').write_text('NODE_ENV=development\n')
                else:
                    env[variable] = 'development'
                result = subprocess.run(['node', str(ROOT / 'scripts/prepare-ios-release.mjs'), '--root', str(root)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=30)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('must be production', result.stdout)
                self.assertFalse((root / 'unexpected-gate').exists())
                self.assertFalse((root / 'dist').exists())

    def test_real_vite_build_is_production_and_native_preflight_runs_after_sync(self):
        with tempfile.TemporaryDirectory(prefix='dareflip-ios-release-pipeline-') as temporary:
            root = Path(temporary)
            package = json.loads((ROOT / 'package.json').read_text())
            package['scripts']['build'] = 'vite build'
            (root / 'package.json').write_text(json.dumps(package))
            (root / 'capacitor.config.ts').write_text((ROOT / 'capacitor.config.ts').read_text())
            (root / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
            shutil.copytree(ROOT / 'ios', root / 'ios', ignore=shutil.ignore_patterns('public', 'build', 'Pods', 'Package.resolved'))
            (root / 'scripts').mkdir()
            # The gate is a controlled fixture here; the product's real publisher/content
            # validator is tested separately. This checks invocation order and stop behavior.
            (root / 'scripts/check-release.mjs').write_text("""
import {appendFileSync,readFileSync} from 'node:fs';
const args=process.argv.slice(2), index=args.indexOf('--stage');
const stage=index<0?'source':args[index+1];
if(process.env.NODE_ENV!=='production'||process.env.VITE_USER_NODE_ENV!=='production')process.exit(31);
appendFileSync('gate-order.jsonl',JSON.stringify({stage,node:process.env.NODE_ENV,viteNode:process.env.VITE_USER_NODE_ENV})+'\\n');
if(stage==='native'){
 const spm=readFileSync('ios/App/CapApp-SPM/Package.swift','utf8');
 const plist=readFileSync('ios/App/App/Info.plist','utf8');
 if(/CapacitorCommunityAdmob/.test(spm)||/GADApplicationIdentifier|NSUserTrackingUsageDescription/.test(plist))process.exit(32);
 if(process.env.FAIL_NATIVE_FIXTURE==='true')process.exit(29);
}
""")
            (root / 'index.html').write_text('<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>')
            (root / 'main.js').write_text('globalThis.__releaseFlags = {dev:import.meta.env.DEV,prod:import.meta.env.PROD,mode:import.meta.env.MODE};')
            (root / 'vite.config.mjs').write_text('export default {build:{minify:false,modulePreload:false}};')
            env = {**os.environ, 'DAREFLIP_RELEASE_PROFILE': 'ad-free', 'VITE_ADS_ENABLED': 'false', 'VITE_ADMOB_TESTING': 'false', 'npm_config_cache': str(root / '.npm-cache')}
            env.pop('NODE_ENV', None)
            env.pop('VITE_USER_NODE_ENV', None)
            command = ['node', str(ROOT / 'scripts/prepare-ios-release.mjs'), '--root', str(root)]
            result = subprocess.run(command, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=120)
            self.assertEqual(result.returncode, 0, result.stdout)
            order = [json.loads(line) for line in (root / 'gate-order.jsonl').read_text().splitlines()]
            self.assertEqual([entry['stage'] for entry in order], ['source', 'native'])
            self.assertTrue(all(entry['node'] == entry['viteNode'] == 'production' for entry in order))
            bundled = next((root / 'dist/assets').glob('*.js'))
            evaluate = "const vm=require('node:vm'),fs=require('node:fs'),ctx={};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),ctx);console.log(JSON.stringify(ctx.__releaseFlags));"
            flags = subprocess.run(['node', '-e', evaluate, str(bundled)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            self.assertEqual(json.loads(flags.stdout), {'dev': False, 'prod': True, 'mode': 'production'})
            self.assertIn('store payload prepared', result.stdout)
            # A failed second gate must not announce a prepared/releasable payload.
            rejected = subprocess.run(command, env={**env, 'FAIL_NATIVE_FIXTURE': 'true'}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=120)
            self.assertEqual(rejected.returncode, 29, rejected.stdout)
            self.assertNotIn('store payload prepared', rejected.stdout)


class CapacitorGraphTests(unittest.TestCase):
    def test_ad_free_sync_repeat_and_beta_restoration(self):
        with tempfile.TemporaryDirectory(prefix='dareflip-ios-profile-') as temporary:
            root = Path(temporary)
            (root / 'package.json').write_text((ROOT / 'package.json').read_text())
            (root / 'capacitor.config.ts').write_text((ROOT / 'capacitor.config.ts').read_text())
            (root / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
            shutil.copytree(ROOT / 'ios', root / 'ios', ignore=shutil.ignore_patterns('public', 'build', 'Pods', 'Package.resolved'))
            (root / 'dist').mkdir()
            (root / 'dist/index.html').write_text('<!doctype html><html><body>Native graph fixture only</body></html>')
            plist_path = root / 'ios/App/App/Info.plist'
            def sync(enabled, profile):
                env = {**os.environ, 'VITE_ADS_ENABLED': enabled, 'VITE_ADMOB_TESTING': 'true' if profile == 'beta' else 'false', 'npm_config_cache': str(root / '.npm-cache')}
                result = subprocess.run([str(root / 'node_modules/.bin/cap'), 'sync', 'ios'], cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=120)
                self.assertEqual(result.returncode, 0, result.stdout)
                with plist_path.open('rb') as stream:
                    metadata = profiles.apply_profile(plistlib.load(stream), profile)
                plist_path.write_bytes(plistlib.dumps(metadata, sort_keys=False))
                package = (root / 'ios/App/CapApp-SPM/Package.swift').read_text()
                config = json.loads((root / 'ios/App/App/capacitor.config.json').read_text())
                return package, config, plist_path.read_bytes()
            free = sync('false', 'ad-free')
            self.assertNotIn('CapacitorCommunityAdmob', free[0])
            self.assertNotIn('AdMobPlugin', free[1]['packageClassList'])
            self.assertEqual(len(free[1]['packageClassList']), 4)
            self.assertNotIn('GADApplicationIdentifier', plistlib.loads(free[2]))
            self.assertNotIn('NSUserTrackingUsageDescription', plistlib.loads(free[2]))
            self.assertEqual(sync('false', 'ad-free'), free)
            beta = sync('true', 'beta')
            self.assertIn('CapacitorCommunityAdmob', beta[0])
            self.assertIn('AdMobPlugin', beta[1]['packageClassList'])
            self.assertEqual(len(beta[1]['packageClassList']), 5)
            self.assertEqual(plistlib.loads(beta[2])['GADApplicationIdentifier'], profiles.TEST_APP_ID)
            self.assertIn('NSUserTrackingUsageDescription', plistlib.loads(beta[2]))
            self.assertEqual(sync('true', 'beta'), beta)


if __name__ == '__main__':
    unittest.main(verbosity=2)
