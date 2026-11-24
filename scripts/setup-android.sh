#!/usr/bin/env bash
set -euo pipefail
# Linux x86_64 bootstrap. Tools live outside the checkout; no sudo or global writes.
# SDK license acceptance is limited to the components needed for this app's build.
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
toolchain_root="${DAREFLIP_TOOLS_ROOT:-/workspace}"
export DAREFLIP_TOOLS_ROOT="$toolchain_root"
if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
  echo 'This bootstrap supports Linux x86_64 only. Use Android Studio on other hosts.' >&2
  exit 1
fi
for task_command in curl python3 dpkg-deb; do command -v "$task_command" >/dev/null; done
scratch_dir="$(mktemp -d)"
trap 'rm -rf -- "$scratch_dir"' EXIT
jdk_root="$toolchain_root/.dareflip-jdk/usr/lib/jvm/msopenjdk-21-amd64"
sdk_root="$toolchain_root/.dareflip-android-sdk"
if [[ ! -x "$jdk_root/bin/javac" ]]; then
  # SHA256 from Microsoft's official Debian repository package metadata.
  curl --fail --silent --show-error --location \
    https://packages.microsoft.com/repos/microsoft-debian-bookworm-prod/pool/main/m/msopenjdk-21/msopenjdk-21_21.0.13.1-1_amd64.deb \
    --output "$scratch_dir/jdk.deb"
  python3 - "$scratch_dir/jdk.deb" <<'PY'
import hashlib,sys
from pathlib import Path
expected='0f43ffcd98b6dbb97085cf6caa80291a171df0de85d2e063465b98d809e2787f'
if hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest()!=expected:raise SystemExit('JDK checksum mismatch; stopping.')
PY
  mkdir -p -- "$toolchain_root/.dareflip-jdk"
  dpkg-deb -x "$scratch_dir/jdk.deb" "$toolchain_root/.dareflip-jdk"
fi
if [[ ! -x "$sdk_root/cmdline-tools/latest/bin/android" ]]; then
  curl --fail --silent --show-error --location \
    https://dl.google.com/android/repository/commandlinetools-linux-16111833_latest.zip \
    --output "$scratch_dir/android.zip"
  python3 - "$scratch_dir/android.zip" "$sdk_root" <<'PY'
import hashlib,sys,zipfile
from pathlib import Path
archive=Path(sys.argv[1]);data=archive.read_bytes()
# Official repository2-1.xml SHA1 plus SHA256 pinned from that verified archive.
if hashlib.sha1(data).hexdigest()!='e025545c62a8e64c7559119566a569fb1dec5f60':raise SystemExit('Android tools SHA1 mismatch; stopping.')
if hashlib.sha256(data).hexdigest()!='0877a1d048fe4a24efe2eff536ca4223f7adeb58648bb81909d33c446918cfa8':raise SystemExit('Android tools SHA256 mismatch; stopping.')
root=Path(sys.argv[2])/'cmdline-tools';root.mkdir(parents=True,exist_ok=True)
if (root/'latest').exists():raise SystemExit('Existing incomplete tools preserved; inspect before replacing.')
with zipfile.ZipFile(archive) as zipped:zipped.extractall(root)
(root/'cmdline-tools').rename(root/'latest')
for executable in (root/'latest/bin').iterdir():executable.chmod(0o755)
PY
fi
python3 - "$script_dir" <<'PY'
import subprocess,sys
from pathlib import Path
sys.path.insert(0,sys.argv[1])
sys.dont_write_bytecode = True
from android_env import native_environment
env=native_environment()
# Stable packages required by API36 / Android Gradle Plugin 8.13.0.
command=[str(Path(env['ANDROID_HOME'])/'cmdline-tools/latest/bin/android'),'--no-metrics','--sdk='+env['ANDROID_HOME'],'sdk','install','platforms/android-36','build-tools/35.0.0','build-tools/36.0.0','platform-tools']
result=subprocess.run(command,env=env,input='y\n'*100,text=True)
raise SystemExit(result.returncode)
PY
"$jdk_root/bin/javac" -version
printf '%s\n' 'Android prerequisites installed. From the repository run: python3 scripts/android-build.py'
