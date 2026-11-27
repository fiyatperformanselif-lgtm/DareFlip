#!/usr/bin/env python3
"""Capture native Simulator screenshots on macOS; never sign, upload or resize."""

import argparse
import hashlib
import json
import plistlib
import re
import shlex
import struct
import subprocess
import sys
import tempfile
import time
import uuid
import zlib
from pathlib import Path


class CaptureError(RuntimeError):
    pass


TARGETS = (
    {"slug": "iphone-16-pro", "model": "iPhone 16 Pro", "width": 1206, "height": 2622},
    {"slug": "ipad-pro-13-m4", "model": "iPad Pro 13-inch (M4)", "width": 2064, "height": 2752},
)


class CommandRunner:
    def __init__(self, log):
        self.log = log

    def run(self, command, *, timeout=120, check=True):
        self.log.write("$ " + shlex.join(map(str, command)) + "\n")
        self.log.flush()
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=timeout)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise CaptureError(f"Cannot run {command[0]}: {error}") from error
        self.log.write(result.stdout + result.stderr + "\n")
        self.log.flush()
        if check and result.returncode:
            detail = (result.stderr or result.stdout).strip()[-3000:]
            raise CaptureError(f"Command failed ({result.returncode}): {shlex.join(command)}\n{detail}")
        return result


def version_parts(version):
    if not isinstance(version, str) or not re.fullmatch(r"\d+(?:\.\d+){0,2}", version):
        raise CaptureError(f"Unrecognized Simulator runtime version: {version!r}")
    parts = tuple(map(int, version.split(".")))
    return parts + (0,) * (3 - len(parts))


def discover_plan(device_data, runtime_data):
    """Choose exact models and one installed, available, compatible iOS runtime."""
    devices = device_data.get("devicetypes")
    runtimes = runtime_data.get("runtimes")
    if not isinstance(devices, list) or not isinstance(runtimes, list):
        raise CaptureError("simctl JSON must contain devicetypes and runtimes arrays.")
    plan = []
    for target in TARGETS:
        names = {target["model"]}
        if target["slug"] == "ipad-pro-13-m4":
            names.update(f"{target['model']} ({ram}GB)" for ram in (8, 16))
        matches = [item for item in devices if item.get("name") in names]
        if not matches or any(not isinstance(item.get("identifier"), str) for item in matches):
            raise CaptureError(f"Required exact Simulator model is missing or ambiguous: {target['model']}")
        reason = "exact model"
        if len(matches) > 1:
            if target["slug"] != "ipad-pro-13-m4":
                raise CaptureError(f"Required exact Simulator model is ambiguous: {target['model']}")
            # Xcode can expose two RAM variants of this same display model.
            # Prefer 8GB, then the unsuffixed profile, then 16GB; never another iPad.
            def ram_rank(item):
                hint = item["name"] + " " + item["identifier"]
                if re.search(r"(?:^|[-. (])8\s?GB(?:$|[-.) ])", hint, re.I):
                    return (0, item["identifier"])
                if re.search(r"(?:^|[-. (])16\s?GB(?:$|[-.) ])", hint, re.I):
                    return (2, item["identifier"])
                return (1, item["identifier"])
            matches.sort(key=ram_rank)
            reason = "exact M4 13-inch display model; deterministic RAM preference: 8GB, unsuffixed, 16GB"
        plan.append({**target, "deviceType": matches[0], "deviceTypeSelection": reason})
    candidates = []
    for runtime in runtimes:
        if runtime.get("isAvailable") is not True or not str(runtime.get("identifier", "")).startswith(
            "com.apple.CoreSimulator.SimRuntime.iOS-"
        ):
            continue
        parts = version_parts(runtime.get("version"))
        code = (parts[0] << 16) | (parts[1] << 8) | parts[2]
        compatible = True
        for item in plan:
            device = item["deviceType"]
            minimum = device.get("minRuntimeVersion", 0)
            maximum = device.get("maxRuntimeVersion", 0xFFFFFFFF)
            if not isinstance(minimum, int) or not isinstance(maximum, int):
                raise CaptureError("Unexpected device runtime compatibility metadata.")
            compatible = compatible and minimum <= code <= maximum
        if compatible:
            candidates.append((parts, runtime))
    if not candidates:
        raise CaptureError("No installed, available iOS runtime supports both required exact models. Select a suitable Xcode image/runtime.")
    runtime = max(candidates, key=lambda item: item[0])[1]
    return [{**item, "runtime": runtime} for item in plan]


def build_command(project, scheme, derived_data):
    return [
        "xcodebuild", "-project", str(project), "-scheme", scheme,
        "-configuration", "Debug", "-sdk", "iphonesimulator",
        "-destination", "generic/platform=iOS Simulator",
        "-derivedDataPath", str(derived_data),
        "CODE_SIGNING_ALLOWED=NO", "CODE_SIGNING_REQUIRED=NO", "build",
    ]


def launch_command(device, bundle_id):
    return [
        "xcrun", "simctl", "launch", "--terminate-running-process", device,
        bundle_id, "-AppleLanguages", "(en)", "-AppleLocale", "en_US",
    ]


def screenshot_command(device, destination, image_type):
    if image_type not in ("png", "jpeg"):
        raise CaptureError("Only direct native PNG/JPEG captures are supported.")
    return [
        "xcrun", "simctl", "io", device, "screenshot",
        f"--type={image_type}", "--mask=ignored", str(destination),
    ]


def inspect_png(path, width, height):
    data = Path(path).read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise CaptureError("Raw capture is not a PNG.")
    offset, header, ended, has_pixels = 8, None, False, False
    while offset + 12 <= len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + length]
        if offset + length + 12 > len(data):
            raise CaptureError("PNG capture is truncated.")
        checksum = struct.unpack(">I", data[offset + 8 + length:offset + 12 + length])[0]
        if zlib.crc32(kind + payload) & 0xFFFFFFFF != checksum:
            raise CaptureError("PNG capture has a corrupt chunk.")
        if kind == b"IHDR":
            if header is not None or length != 13:
                raise CaptureError("PNG has an invalid image header.")
            header = struct.unpack(">IIBBBBB", payload)
        if kind == b"IDAT" and payload:
            has_pixels = True
        if kind == b"IEND":
            ended = True
            break
        offset += length + 12
    if not ended or header is None or not has_pixels:
        raise CaptureError("PNG is missing an image header, pixel data or end marker.")
    actual_width, actual_height, depth, color, _, _, _ = header
    if (actual_width, actual_height) != (width, height):
        raise CaptureError(f"Raw PNG dimensions {actual_width}x{actual_height}; expected {width}x{height}. No resizing is performed.")
    if depth not in (8, 16) or color not in (2, 6):
        raise CaptureError(f"Unexpected native PNG format: bit depth {depth}, color type {color}.")
    return {"width": width, "height": height, "format": "PNG", "bitDepth": depth, "colorModel": "RGBA" if color == 6 else "RGB", "sha256": hashlib.sha256(data).hexdigest()}


def inspect_jpeg(path, width, height):
    data = Path(path).read_bytes()
    if not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
        raise CaptureError("Upload capture is not a complete JPEG.")
    offset, dimensions = 2, None
    sof_markers = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
    while offset < len(data) - 2:
        if data[offset] != 0xFF:
            raise CaptureError("Invalid JPEG marker sequence.")
        while offset < len(data) and data[offset] == 0xFF:
            offset += 1
        if offset >= len(data):
            break
        marker = data[offset]
        offset += 1
        if marker == 0xDA:  # Entropy-coded scan begins; SOF must already be present.
            break
        if marker in (0x01, 0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            continue
        if offset + 2 > len(data):
            raise CaptureError("JPEG segment is truncated.")
        length = struct.unpack(">H", data[offset:offset + 2])[0]
        if length < 2 or offset + length > len(data):
            raise CaptureError("JPEG has an invalid segment length.")
        payload = data[offset + 2:offset + length]
        if marker in sof_markers:
            if len(payload) < 6:
                raise CaptureError("JPEG image header is truncated.")
            precision, actual_height, actual_width, components = struct.unpack(">BHHB", payload[:6])
            if len(payload) != 6 + 3 * components:
                raise CaptureError("JPEG image component header is invalid.")
            dimensions = (actual_width, actual_height, precision, components)
        offset += length
    if dimensions is None:
        raise CaptureError("JPEG is missing its image dimensions.")
    actual_width, actual_height, precision, components = dimensions
    if (actual_width, actual_height) != (width, height):
        raise CaptureError(f"JPEG dimensions {actual_width}x{actual_height}; expected {width}x{height}. No resizing is performed.")
    if precision != 8 or components != 3:
        raise CaptureError(f"Upload JPEG must have 8-bit, three-component color; received {precision}-bit/{components} components.")
    return {"width": width, "height": height, "format": "JPEG", "components": 3, "hasAlpha": False, "sha256": hashlib.sha256(data).hexdigest()}


def app_product(derived_data, bundle_id):
    products = list((derived_data / "Build/Products/Debug-iphonesimulator").glob("*.app"))
    if len(products) != 1:
        raise CaptureError(f"Expected one built Simulator .app; found {len(products)}.")
    app = products[0]
    with (app / "Info.plist").open("rb") as handle:
        info = plistlib.load(handle)
    if info.get("CFBundleIdentifier") != bundle_id:
        raise CaptureError(f"Built bundle identifier does not match {bundle_id}; refusing to launch another app.")
    executable = info.get("CFBundleExecutable", "")
    if not executable or Path(executable).name != executable or not (app / executable).is_file():
        raise CaptureError("Built Simulator app executable is missing.")
    return app, info


def write_report(output, manifest):
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    lines = [
        "# DareFlip native Simulator captures", "",
        f"Overall status: **{manifest['status']}**.",
        f"Source commit: `{manifest.get('sourceCommit', 'unavailable')}`.", "",
        "Upload only the validated JPEG files in `upload/`. They were captured directly by Apple's Simulator screenshot command, not resized or converted from browser images.",
        "Raw PNG provenance is in `raw/`; Simulator PNGs may contain an alpha channel, so they are not the recommended upload files.", "",
        "These are fresh-install home-screen captures of an unsigned Debug Simulator build with test advertising inventory. They are not physical-device captures, the signed TestFlight IPA, proof of App Review approval, or proof of successful store upload.",
        "Visual review remains required: open both JPEGs and confirm the actual DareFlip home screen is visible, with no splash screen, dialog or rendering error. Compare the UI with the submitted candidate before uploading.", "",
    ]
    for item in manifest["devices"]:
        lines.append(f"- {item['model']}: {item['captureStatus']} ({item['expectedWidth']}×{item['expectedHeight']}).")
    if manifest.get("error"):
        lines.extend(["", "Failure: " + manifest["error"]])
    (output / "README.md").write_text("\n".join(lines) + "\n")


def execute(args, runner, *, sleep=time.sleep, platform_name=sys.platform):
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    if any(path.name != "capture.log" or not path.is_file() or path.is_symlink() for path in output.iterdir()):
        raise CaptureError("Capture output must be fresh and empty (apart from this run's capture.log). Existing files will not be overwritten or deleted.")
    (output / "raw").mkdir()
    (output / "upload").mkdir()
    manifest = {
        "schemaVersion": 1, "status": "failed", "renderer": "AppleSimulator",
        "captureIntent": "fresh-install home screen", "visualReviewStatus": "pending",
        "buildConfiguration": "Debug", "sdk": "iphonesimulator", "signed": False,
        "resized": False, "convertedFromBrowser": False,
        "devices": [{"model": target["model"], "expectedWidth": target["width"], "expectedHeight": target["height"], "captureStatus": "not_started"} for target in TARGETS],
        "cleanupWarnings": [],
    }
    try:
        if platform_name != "darwin":
            raise CaptureError("Native screenshots require macOS with Xcode and an installed iOS Simulator runtime. No browser/mock fallback is provided.")
        if args.launch_wait < 2:
            raise CaptureError("Wait at least two seconds after launch to allow the real app splash screen to finish.")
        source = runner.run(["git", "rev-parse", "HEAD"]).stdout.strip()
        if not re.fullmatch(r"[0-9a-fA-F]{40}", source):
            raise CaptureError("Cannot establish the raw source Git commit.")
        manifest["sourceCommit"] = source
        manifest["trackedWorkingTreeChanges"] = runner.run(["git", "status", "--porcelain", "--untracked-files=no"]).stdout.splitlines()
        manifest["xcodeVersion"] = runner.run(["xcodebuild", "-version"]).stdout.strip()
        runner.run(["xcrun", "--find", "simctl"])
        device_data = json.loads(runner.run(["xcrun", "simctl", "list", "devicetypes", "--json"]).stdout)
        runtime_data = json.loads(runner.run(["xcrun", "simctl", "list", "runtimes", "--json"]).stdout)
        plan = discover_plan(device_data, runtime_data)
        with tempfile.TemporaryDirectory(prefix="dareflip-store-screenshots-") as temporary:
            derived_data = Path(temporary) / "DerivedData"
            runner.run(build_command(args.project, args.scheme, derived_data), timeout=1800)
            app, info = app_product(derived_data, args.bundle_id)
            manifest["app"] = {"bundleIdentifier": args.bundle_id, "version": info.get("CFBundleShortVersionString"), "build": info.get("CFBundleVersion")}
            for index, target in enumerate(plan):
                entry = manifest["devices"][index]
                entry.update({"deviceTypeIdentifier": target["deviceType"]["identifier"], "deviceTypeName": target["deviceType"]["name"], "deviceTypeSelection": target["deviceTypeSelection"], "runtime": target["runtime"], "launchWaitSeconds": args.launch_wait})
                device = None
                try:
                    entry["stage"] = "create"
                    name = f"DareFlip-Store-{target['slug']}-{uuid.uuid4().hex[:8]}"
                    created = runner.run(["xcrun", "simctl", "create", name, target["deviceType"]["identifier"], target["runtime"]["identifier"]]).stdout.strip()
                    try:
                        device = str(uuid.UUID(created))
                    except ValueError as error:
                        raise CaptureError("simctl create did not return one valid owned Simulator UUID.") from error
                    entry["ownedSimulator"] = device
                    entry["stage"] = "boot"
                    runner.run(["xcrun", "simctl", "boot", device])
                    runner.run(["xcrun", "simctl", "bootstatus", device, "-b"], timeout=240)
                    status = runner.run(["xcrun", "simctl", "status_bar", device, "override", "--time", "9:41", "--dataNetwork", "wifi", "--wifiMode", "active", "--wifiBars", "3", "--batteryState", "charged", "--batteryLevel", "100"], check=False)
                    entry["statusBarOverride"] = "applied" if status.returncode == 0 else "unavailable"
                    entry["stage"] = "install"
                    runner.run(["xcrun", "simctl", "install", device, str(app)])
                    entry["stage"] = "launch"
                    entry["launchReceipt"] = runner.run(launch_command(device, args.bundle_id)).stdout.strip()
                    sleep(args.launch_wait)
                    raw = output / "raw" / f"{target['slug']}-home.png"
                    upload = output / "upload" / f"{target['slug']}-home.jpg"
                    entry["stage"] = "raw_png"
                    runner.run(screenshot_command(device, raw, "png"))
                    entry["rawPNG"] = {"path": str(raw.relative_to(output)), **inspect_png(raw, target["width"], target["height"])}
                    entry["stage"] = "upload_jpeg"
                    runner.run(screenshot_command(device, upload, "jpeg"))
                    entry["uploadJPEG"] = {"path": str(upload.relative_to(output)), **inspect_jpeg(upload, target["width"], target["height"])}
                    entry["captureStatus"] = "captured"
                    entry["stage"] = "complete"
                except Exception as error:
                    entry["captureStatus"] = "failed"
                    entry["error"] = str(error)
                    raise
                finally:
                    if device is not None:
                        for action in ("shutdown", "delete"):
                            try:
                                result = runner.run(["xcrun", "simctl", action, device], check=False)
                                if result.returncode:
                                    manifest["cleanupWarnings"].append(f"{action} {device}: {result.stderr.strip()}")
                            except Exception as error:
                                manifest["cleanupWarnings"].append(f"{action} {device}: {error}")
        manifest["status"] = "captured"
    except Exception as error:
        manifest["error"] = str(error)
    finally:
        write_report(output, manifest)
    return manifest


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default="ios/App/App.xcodeproj")
    parser.add_argument("--scheme", default="App")
    parser.add_argument("--bundle-id", default="com.dareflip.app")
    parser.add_argument("--output", default="artifacts/store-native")
    parser.add_argument("--launch-wait", type=float, default=5)
    args = parser.parse_args(argv)
    output = Path(args.output).resolve()
    try:
        output.mkdir(parents=True, exist_ok=True)
        if any(output.iterdir()):
            raise CaptureError("Capture output must be a fresh, empty directory. Existing files will not be overwritten or deleted.")
        with (output / "capture.log").open("x") as log:
            manifest = execute(args, CommandRunner(log))
        print(f"Native capture status: {manifest['status']}. Manifest: {output / 'manifest.json'}")
        if manifest.get("error"):
            print(manifest["error"], file=sys.stderr)
        return 0 if manifest["status"] == "captured" else 1
    except (CaptureError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
