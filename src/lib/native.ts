/**
 * Native runtime bridge.
 *
 * Everything here is optional: on the web the Capacitor plugins simply
 * report "not native" and we fall back to web APIs. Only call these from
 * the browser (useEffect / event handlers).
 */
import { Capacitor } from "@capacitor/core";

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export type Haptic = "light" | "medium" | "heavy" | "success" | "warning" | "error";

/** Haptic feedback — native taptic engine when available, vibration on web. */
export async function haptic(style: Haptic = "light") {
  if (isNativeApp()) {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
      if (style === "light" || style === "medium" || style === "heavy") {
        await Haptics.impact({
          style:
            style === "heavy" ? ImpactStyle.Heavy : style === "medium" ? ImpactStyle.Medium : ImpactStyle.Light,
        });
      } else {
        await Haptics.notification({
          type:
            style === "error"
              ? NotificationType.Error
              : style === "warning"
                ? NotificationType.Warning
                : NotificationType.Success,
        });
      }
      return;
    } catch {
      /* fall through to web */
    }
  }
  try {
    const map: Record<Haptic, number | number[]> = {
      light: 8,
      medium: 14,
      heavy: 24,
      success: [10, 40, 10],
      warning: [16, 60, 16],
      error: [24, 60, 24, 60, 24],
    };
    navigator.vibrate?.(map[style]);
  } catch {
    /* noop */
  }
}

/** Configure the native status bar / splash / keyboard once at startup. */
export async function setupNativeShell() {
  if (!isNativeApp()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* plugin unavailable */
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* plugin unavailable */
  }
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    Keyboard.addListener("keyboardWillShow", (info) => {
      document.documentElement.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
      document.documentElement.classList.add("keyboard-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.documentElement.style.setProperty("--keyboard-height", "0px");
      document.documentElement.classList.remove("keyboard-open");
    });
  } catch {
    /* plugin unavailable */
  }
}
