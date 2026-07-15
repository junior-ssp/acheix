import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAP_SERVER_URL ||
  process.env.NEXT_PUBLIC_CAPACITOR_SERVER_URL ||
  "https://acheix.com.br";

const config: CapacitorConfig = {
  appId: process.env.CAP_APP_ID || "br.com.acheix.app",
  appName: process.env.CAP_APP_NAME || "Achei X",
  webDir: "capacitor-web",
  server: {
    url: serverUrl,
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true
    }
  }
};

export default config;

