"""Supported local Android tool activation, without printing proxy or credential values."""
from pathlib import Path
import os
import shlex
import urllib.parse


def native_environment():
    env = os.environ.copy()
    tools_root = Path(env.get('DAREFLIP_TOOLS_ROOT', '/workspace'))
    fallback_jdk = tools_root / '.dareflip-jdk/usr/lib/jvm/msopenjdk-21-amd64'
    if not env.get('JAVA_HOME') and (fallback_jdk / 'bin/javac').exists():
        env['JAVA_HOME'] = str(fallback_jdk)
    if env.get('JAVA_HOME'):
        env['PATH'] = str(Path(env['JAVA_HOME']) / 'bin') + os.pathsep + env['PATH']
    env.setdefault('ANDROID_HOME', str(tools_root / '.dareflip-android-sdk'))
    env.setdefault('ANDROID_SDK_ROOT', env['ANDROID_HOME'])
    env.setdefault('ANDROID_USER_HOME', str(tools_root / '.dareflip-android'))
    env.setdefault('GRADLE_USER_HOME', str(tools_root / '.dareflip-gradle'))
    Path(env['ANDROID_USER_HOME']).mkdir(parents=True, exist_ok=True)
    Path(env['GRADLE_USER_HOME']).mkdir(parents=True, exist_ok=True)
    options = shlex.split(env.get('JAVA_OPTS', ''))
    # Java does not read HTTPS_PROXY. Forward only host/port; never extract credentials.
    proxy = urllib.parse.urlsplit(env.get('HTTPS_PROXY', env.get('https_proxy', '')))
    if proxy.hostname:
        for protocol in ['https', 'http']:
            options += [f'-D{protocol}.proxyHost={proxy.hostname}', f'-D{protocol}.proxyPort={proxy.port or 80}']
    # Reuse the environment's configured CA store, retaining TLS verification.
    truststore = Path('/etc/ssl/certs/java/cacerts')
    if truststore.exists() and not any(item.startswith('-Djavax.net.ssl.trustStore=') for item in options):
        options.append(f'-Djavax.net.ssl.trustStore={truststore}')
    options.append(f'-Djava.util.prefs.userRoot={env["ANDROID_USER_HOME"]}/prefs')
    env['JAVA_OPTS'] = shlex.join(options)
    return env
