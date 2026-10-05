import type { CapacitorConfig } from "@capacitor/cli";

// The native apps load the live site, so every web deploy updates them instantly.
// For local testing, CAP_SERVER_URL=http://<your-mac-ip>:3000 points the app at `npm run dev:lan`.
const serverUrl = process.env.CAP_SERVER_URL || "https://tvtime.online";

const config: CapacitorConfig = {
  appId: "online.tvtime.app",
  appName: "TTT",
  webDir: "mobile-shell",
  appendUserAgent: "TTTApp",
  backgroundColor: "#141414",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    errorPath: "offline.html",
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
  },
};

export default config;
