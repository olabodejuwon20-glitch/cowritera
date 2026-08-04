import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell configuration (Android / iOS).
 *
 * Local build:
 *   bun run build && bunx cap add android && bunx cap sync && bunx cap open android
 *
 * The `server.url` below makes the native app load the live preview build so
 * you can test on a device without rebuilding. Remove the whole `server`
 * block before shipping to the stores so the app runs fully bundled.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.coresearch",
  appName: "Co-Research AI",
  webDir: "dist/client",
  server: {
    url: "https://id-preview--47919cef-8f81-4e83-8b98-bcc51f45f7df.lovable.app?forceHideBadge=true",
    cleartext: true,
  },
  android: {
    backgroundColor: "#ffffff",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    Keyboard: {
      resize: "native",
砂: undefined,
    },
  },
};

export default config;
