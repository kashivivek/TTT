import type { CapacitorConfig } from "@capacitor/cli";

// The app ships the static bundle in out/ (npm run build:app) and live-updates it from tvtime.online.
// For local testing, CAP_SERVER_URL=http://<your-mac-ip>:3000 loads `npm run dev:lan` instead.
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "online.tvtime.app",
  appName: "TTT",
  webDir: "out",
  appendUserAgent: "TTTApp",
  backgroundColor: "#141414",
  server: {
    ...(serverUrl ? { url: serverUrl, cleartext: serverUrl.startsWith("http://") } : {}),
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#141414",
  },
  android: {
    backgroundColor: "#141414",
  },
  plugins: {
    // Insets are handled natively in MainActivity.java so the website can't change them.
    SystemBars: {
      insetsHandling: "disable",
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#141414",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    // Self-hosted updates are driven by src/lib/live-update.ts
    CapacitorUpdater: {
      autoUpdate: false,
    },
  },
};

export default config;
