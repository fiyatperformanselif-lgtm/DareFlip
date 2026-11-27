#!/usr/bin/env python3
"""Linux-safe fixtures only: these tests do not run Xcode or a Simulator."""

import argparse
import importlib.util
import json
import plistlib
import struct
import subprocess
import tempfile
import unittest
import uuid
import zlib
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "codemagic_screenshots", Path(__file__).with_name("codemagic-screenshots.py")
)
capture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)


def devices():
    return {"devicetypes": [
        {"name": target["model"], "identifier": f"fixture-device-{index}", "minRuntimeVersion": 18 << 16, "maxRuntimeVersion": 0xFFFFFFFF}
        for index, target in enumerate(capture.TARGETS)
    ]}


def runtimes():
    return {"runtimes": [
        {"name": "iOS 18.5", "identifier": "com.apple.CoreSimulator.SimRuntime.iOS-18-5", "version": "18.5", "isAvailable": True},
        {"name": "iOS 26.1", "identifier": "com.apple.CoreSimulator.SimRuntime.iOS-26-1", "version": "26.1", "isAvailable": True},
        {"name": "iOS 27.0", "identifier": "com.apple.CoreSimulator.SimRuntime.iOS-27-0", "version": "27.0", "isAvailable": False},
        {"name": "tvOS 30.0", "identifier": "com.apple.CoreSimulator.SimRuntime.tvOS-30-0", "version": "30.0", "isAvailable": True},
    ]}


def png_fixture(width, height, rgba=False, depth=8):
    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
    channels = 4 if rgba else 3
    pixels = (b"\0" + b"\0" * width * channels * (depth // 8)) * height
    header = struct.pack(">IIBBBBB", width, height, depth, 6 if rgba else 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b"")


def jpeg_header_fixture(width, height, components=3):
    # Geometry/parser fixture, not a native UI image or rendered-photo claim.
    payload = struct.pack(">BHHB", 8, height, width, components)
    payload += b"".join(bytes((index + 1, 0x11, 0)) for index in range(components))
    sof = b"\xff\xc0" + struct.pack(">H", len(payload) + 2) + payload
    return b"\xff\xd8" + sof + b"\xff\xda\x00\x02\x00\xff\xd9"


class FakeRunner:
    """An explicit in-test command fake; never invokes subprocess or native tools."""

    def __init__(self, *, failed_capture=False, wrong_bundle=False):
        self.commands = []
        self.created = []
        self.failed_capture = failed_capture
        self.wrong_bundle = wrong_bundle

    def run(self, command, *, timeout=120, check=True):
        command = list(map(str, command))
        self.commands.append(command)
        stdout = ""
        if command == ["git", "rev-parse", "HEAD"]:
            stdout = "a" * 40 + "\n"
        elif command[:3] == ["git", "status", "--porcelain"]:
            stdout = " M ios/generated-fixture\n"
        elif command == ["xcodebuild", "-version"]:
            stdout = "Xcode fixture only\n"
        elif command[:2] == ["xcodebuild", "-project"]:
            derived = Path(command[command.index("-derivedDataPath") + 1])
            app = derived / "Build/Products/Debug-iphonesimulator/App.app"
            app.mkdir(parents=True)
            (app / "App").write_bytes(b"unit-test placeholder, not a native executable")
            (app / "Info.plist").write_bytes(plistlib.dumps({
                "CFBundleIdentifier": "wrong.fixture" if self.wrong_bundle else "com.dareflip.app",
                "CFBundleExecutable": "App", "CFBundleShortVersionString": "0.1.0", "CFBundleVersion": "1",
            }))
        elif command[1:5] == ["simctl", "list", "devicetypes", "--json"]:
            stdout = json.dumps(devices())
        elif command[1:5] == ["simctl", "list", "runtimes", "--json"]:
            stdout = json.dumps(runtimes())
        elif command[1:3] == ["simctl", "create"]:
            device = str(uuid.UUID(int=len(self.created) + 1))
            self.created.append(device)
            stdout = device + "\n"
        elif command[1:3] == ["simctl", "launch"]:
            stdout = "com.dareflip.app: fixture-pid\n"
        elif command[1:3] == ["simctl", "io"]:
            target = capture.TARGETS[self.created.index(command[3])]
            destination = Path(command[-1])
            if "--type=jpeg" in command:
                if self.failed_capture:
                    raise capture.CaptureError("Injected capture failure; no native capture was executed")
                destination.write_bytes(jpeg_header_fixture(target["width"], target["height"]))
            else:
                destination.write_bytes(png_fixture(target["width"], target["height"], rgba=True))
        return subprocess.CompletedProcess(command, 0, stdout, "")


class ScreenshotTests(unittest.TestCase):
    def test_exact_device_types_and_latest_available_ios_are_discovered(self):
        plan = capture.discover_plan(devices(), runtimes())
        self.assertEqual([item["deviceType"]["identifier"] for item in plan], ["fixture-device-0", "fixture-device-1"])
        self.assertTrue(all(item["runtime"]["version"] == "26.1" for item in plan))

    def test_missing_model_never_substitutes_another_device(self):
        data = devices()
        data["devicetypes"][0]["name"] = "iPhone 16 Pro Max"
        with self.assertRaisesRegex(capture.CaptureError, "exact Simulator model"):
            capture.discover_plan(data, runtimes())

    def test_exact_m4_ram_variants_prefer_discovered_8gb_identifier(self):
        data = devices()
        original = data["devicetypes"].pop()
        data["devicetypes"].extend([
            {**original, "identifier": "fixture-iPad-Pro-13-inch-M4-16GB"},
            {**original, "identifier": "fixture-iPad-Pro-13-inch-M4-8GB"},
        ])
        selected = capture.discover_plan(data, runtimes())[1]
        self.assertEqual(selected["deviceType"]["identifier"], "fixture-iPad-Pro-13-inch-M4-8GB")
        self.assertIn("RAM preference", selected["deviceTypeSelection"])
        data["devicetypes"][1]["name"] += " (16GB)"
        data["devicetypes"][2]["name"] += " (8GB)"
        self.assertEqual(capture.discover_plan(data, runtimes())[1]["deviceType"]["identifier"], "fixture-iPad-Pro-13-inch-M4-8GB")

    def test_compatible_runtime_bounds_are_respected(self):
        data = devices()
        data["devicetypes"][0]["maxRuntimeVersion"] = (18 << 16) | (255 << 8) | 255
        self.assertEqual(capture.discover_plan(data, runtimes())[0]["runtime"]["version"], "18.5")

    def test_unavailable_or_incompatible_runtimes_fail_clearly(self):
        data = runtimes()
        for runtime in data["runtimes"]:
            runtime["isAvailable"] = False
        with self.assertRaisesRegex(capture.CaptureError, "No installed, available iOS runtime"):
            capture.discover_plan(devices(), data)

    def test_unsigned_build_uses_project_scheme_and_simulator_without_credentials(self):
        command = capture.build_command("ios/App/App.xcodeproj", "App", "/tmp/owned-products")
        self.assertIn("CODE_SIGNING_ALLOWED=NO", command)
        self.assertIn("CODE_SIGNING_REQUIRED=NO", command)
        self.assertIn("iphonesimulator", command)
        self.assertIn("generic/platform=iOS Simulator", command)
        self.assertNotIn("-allowProvisioningUpdates", command)
        self.assertNotIn("-workspace", command)

    def test_launch_and_native_capture_commands_have_no_browser_or_resize(self):
        launch = capture.launch_command("owned-device", "com.dareflip.app")
        self.assertEqual(launch[2], "launch")
        self.assertIn("com.dareflip.app", launch)
        command = capture.screenshot_command("owned-device", Path("home.jpg"), "jpeg")
        self.assertEqual(command[:5], ["xcrun", "simctl", "io", "owned-device", "screenshot"])
        self.assertIn("--type=jpeg", command)
        self.assertIn("--mask=ignored", command)

    def test_raw_png_rgba_is_preserved_and_dimensions_are_exact(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "raw.png"
            path.write_bytes(png_fixture(12, 22, rgba=True))
            self.assertEqual(capture.inspect_png(path, 12, 22)["colorModel"], "RGBA")
            path.write_bytes(png_fixture(12, 22, rgba=True, depth=16))
            self.assertEqual(capture.inspect_png(path, 12, 22)["bitDepth"], 16)
            with self.assertRaisesRegex(capture.CaptureError, "No resizing"):
                capture.inspect_png(path, 13, 22)
            path.write_bytes(path.read_bytes()[:-5])
            with self.assertRaises(capture.CaptureError):
                capture.inspect_png(path, 12, 22)

    def test_upload_jpeg_rejects_wrong_dimensions_and_non_rgb_component_counts(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "upload.jpg"
            path.write_bytes(jpeg_header_fixture(1206, 2622))
            result = capture.inspect_jpeg(path, 1206, 2622)
            self.assertEqual(result["components"], 3)
            self.assertFalse(result["hasAlpha"])
            with self.assertRaisesRegex(capture.CaptureError, "No resizing"):
                capture.inspect_jpeg(path, 1320, 2868)
            path.write_bytes(jpeg_header_fixture(1206, 2622, components=4))
            with self.assertRaisesRegex(capture.CaptureError, "three-component"):
                capture.inspect_jpeg(path, 1206, 2622)

    def run_fixture(self, output, runner, platform="darwin"):
        args = argparse.Namespace(project="ios/App/App.xcodeproj", scheme="App", bundle_id="com.dareflip.app", output=str(output), launch_wait=5)
        return capture.execute(args, runner, sleep=lambda seconds: None, platform_name=platform)

    def test_mocked_lifecycle_records_provenance_and_cleans_only_owned_simulators(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "fixture-artifacts"
            runner = FakeRunner()
            manifest = self.run_fixture(output, runner)
            self.assertEqual(manifest["status"], "captured")
            self.assertEqual(manifest["sourceCommit"], "a" * 40)
            self.assertEqual(manifest["visualReviewStatus"], "pending")
            self.assertFalse(manifest["signed"])
            self.assertEqual([entry["captureStatus"] for entry in manifest["devices"]], ["captured", "captured"])
            for device in runner.created:
                self.assertIn(["xcrun", "simctl", "shutdown", device], runner.commands)
                self.assertIn(["xcrun", "simctl", "delete", device], runner.commands)
            self.assertFalse(any("all" in command for command in runner.commands))
            self.assertTrue((output / "manifest.json").is_file())
            self.assertEqual(len(list((output / "upload").glob("*.jpg"))), 2)

    def test_failed_capture_writes_truthful_metadata_and_never_claims_the_second_image(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "fixture-failure"
            runner = FakeRunner(failed_capture=True)
            manifest = self.run_fixture(output, runner)
            self.assertEqual(manifest["status"], "failed")
            self.assertEqual(manifest["devices"][0]["captureStatus"], "failed")
            self.assertEqual(manifest["devices"][0]["stage"], "upload_jpeg")
            self.assertNotIn("uploadJPEG", manifest["devices"][0])
            self.assertEqual(manifest["devices"][1]["captureStatus"], "not_started")
            self.assertIn("Injected capture failure", json.loads((output / "manifest.json").read_text())["error"])
            self.assertIn(["xcrun", "simctl", "delete", runner.created[0]], runner.commands)

    def test_wrong_app_bundle_is_not_installed_or_launched(self):
        with tempfile.TemporaryDirectory() as temporary:
            runner = FakeRunner(wrong_bundle=True)
            manifest = self.run_fixture(Path(temporary) / "wrong-app", runner)
            self.assertEqual(manifest["status"], "failed")
            self.assertIn("bundle identifier", manifest["error"])
            self.assertEqual(runner.created, [])

    def test_linux_has_no_native_or_browser_fallback(self):
        with tempfile.TemporaryDirectory() as temporary:
            runner = FakeRunner()
            manifest = self.run_fixture(Path(temporary) / "linux", runner, platform="linux")
            self.assertEqual(manifest["status"], "failed")
            self.assertIn("require macOS", manifest["error"])
            self.assertEqual(runner.commands, [])
            self.assertTrue(all(item["captureStatus"] == "not_started" for item in manifest["devices"]))

    def test_foreign_output_files_are_preserved_and_capture_is_refused(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            foreign = output / "unrelated.txt"
            foreign.write_text("preserve this file")
            runner = FakeRunner()
            with self.assertRaisesRegex(capture.CaptureError, "fresh and empty"):
                self.run_fixture(output, runner)
            self.assertEqual(foreign.read_text(), "preserve this file")
            self.assertEqual(list(output.iterdir()), [foreign])
            self.assertEqual(runner.commands, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
