import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

let audio: AudioContext | undefined;
export async function feedback(
  kind: "tap" | "flip" | "success",
  settings: { sound: boolean; haptics: boolean },
): Promise<void> {
  if (settings.haptics && Capacitor.isNativePlatform()) {
    try {
      if (kind === "success")
        await Haptics.notification({ type: NotificationType.Success });
      else
        await Haptics.impact({
          style: kind === "flip" ? ImpactStyle.Medium : ImpactStyle.Light,
        });
    } catch {
      /* Unsupported devices remain playable. */
    }
  }
  if (!settings.sound) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") await audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      kind === "success" ? 660 : kind === "flip" ? 330 : 440,
      audio.currentTime,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === "success" ? 990 : 220,
      audio.currentTime + 0.11,
    );
    gain.gain.setValueAtTime(0.06, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.13);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.14);
  } catch {
    /* Autoplay restrictions are not game errors. */
  }
}
