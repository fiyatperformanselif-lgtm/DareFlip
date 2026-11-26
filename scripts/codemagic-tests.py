#!/usr/bin/env python3
"""Local tests for cloud metadata handling; no Apple credentials, network, or Xcode required."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import textwrap
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('codemagic_ios', Path(__file__).with_name('codemagic-ios.py'))
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)


class CodemagicMetadataTests(unittest.TestCase):
    def setUp(self):
        # Fixtures only, never used as signing/account configuration.
        self.values = {'BUNDLE_ID': 'test.fixture.app', 'APPLE_TEAM_ID': 'TESTTEAM01', 'APP_STORE_APPLE_ID': '123'}

    def test_all_workflow_shell_scripts_have_valid_bash_syntax(self):
        source = (ci.ROOT / 'codemagic.yaml').read_text()
        # This repository keeps every script in an 8-space-indented literal block.
        # Count all script keys too, so a new/unsupported form cannot be skipped.
        blocks = re.findall(r'(?m)^ {8}script: \|\n((?: {10}[^\n]*\n|[ \t]*\n)+)', source)
        self.assertGreater(len(blocks), 0)
        self.assertEqual(len(blocks), len(re.findall(r'(?m)^ +script:', source)))
        for index, block in enumerate(blocks, start=1):
            with self.subTest(script=index):
                result = subprocess.run(['bash', '-n'], input=textwrap.dedent(block), text=True, capture_output=True)
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_required_metadata_rejects_missing_values(self):
        for key in self.values:
            with self.subTest(key=key), self.assertRaises(ValueError):
                ci.metadata({**self.values, key: ''})

    def test_identity_mismatch_is_blocked(self):
        response = json.dumps({'id': '123', 'attributes': {'bundleId': 'another.fixture.app'}})
        with self.assertRaises(ValueError):
            ci.verify_app(response, self.values)
        ci.verify_app(json.dumps({'id': '123', 'attributes': {'bundleId': 'test.fixture.app'}}), self.values)

    def test_first_build_and_existing_integer_build(self):
        self.assertEqual(ci.next_number(''), 1)
        self.assertEqual(ci.next_number('19'), 20)

    def test_dotted_or_corrupt_build_does_not_silently_reset(self):
        for value in ['1.2.3', 'null', 'API unavailable', '-1']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                ci.next_number(value)

    def test_api_failure_is_not_an_empty_first_build(self):
        with patch.object(ci.subprocess, 'run') as run:
            run.return_value.returncode = 9
            run.return_value.stdout = ''
            with self.assertRaises(RuntimeError):
                ci.apple_output(['get-latest-build-number', '123'])

    def test_profile_must_match_team_bundle_and_app_store_method(self):
        good = {'teamID': 'TESTTEAM01', 'provisioningProfiles': {'test.fixture.app': 'fixture'}, 'method': 'app-store-connect'}
        ci.verify_profile(good, self.values)
        for broken in [{**good, 'teamID': 'OTHERTEAM1'}, {**good, 'provisioningProfiles': {}}, {**good, 'method': 'development'}]:
            with self.assertRaises(ValueError):
                ci.verify_profile(broken, self.values)

    def test_both_build_configurations_are_updated_and_repeatable(self):
        original = (ci.ROOT / 'ios/App/App.xcodeproj/project.pbxproj').read_text()
        changed = ci.prepare_project(original, 'test.fixture.app', 'TESTTEAM01', 20)
        self.assertEqual(changed.count('PRODUCT_BUNDLE_IDENTIFIER = test.fixture.app;'), 2)
        self.assertEqual(changed.count('DEVELOPMENT_TEAM = TESTTEAM01;'), 2)
        self.assertEqual(changed.count('CURRENT_PROJECT_VERSION = 20;'), 2)
        self.assertEqual(ci.prepare_project(changed, 'test.fixture.app', 'TESTTEAM01', 20), changed)
        with self.assertRaises(ValueError):
            ci.prepare_project('unrecognized project', 'test.fixture.app', 'TESTTEAM01', 20)

    def test_shared_archive_scheme_references_real_app_target(self):
        scheme = ET.parse(ci.ROOT / 'ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme').getroot()
        self.assertEqual(scheme.find('ArchiveAction').get('buildConfiguration'), 'Release')
        reference = scheme.find('.//BuildableReference')
        project = (ci.ROOT / 'ios/App/App.xcodeproj/project.pbxproj').read_text()
        self.assertIn(reference.get('BlueprintIdentifier') + ' /* App */ = {', project)
        self.assertEqual(reference.get('ReferencedContainer'), 'container:App.xcodeproj')


if __name__ == '__main__':
    unittest.main(verbosity=2)
