#!/usr/bin/env python3
"""Build a local APK using configured or bootstrapped JDK/SDK. No signing credentials."""
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True
from android_env import native_environment

repo = Path(__file__).resolve().parent.parent
env = native_environment()
# Keep native compilation modest while browser and frontend tools share the machine.
tasks = sys.argv[1:] or ['assembleDebug']
result = subprocess.run(['./gradlew', '--no-daemon', '--max-workers=2', '-Dorg.gradle.parallel=false', *tasks], cwd=repo / 'android', env=env)
raise SystemExit(result.returncode)
