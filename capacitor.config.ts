import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adminbarber.app',
  appName: 'AdminBarber',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // Configure o servidor de desenvolvimento para mobile
    // Exemplo: 'http://192.168.1.100:8080'
    // Deixe vazio para usar o servidor de desenvolvimento padrão
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 1000,
      backgroundColor: "#0f172a",
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Default",
      webSplashResourceName: "splash.png"
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    includePlugins: true,
    plugins: {
      CapacitorHttp: {
        enabled: true
      }
    }
  },
  ios: {
    allowMixedContent: true,
    includePlugins: true,
    plugins: {
      CapacitorHttp: {
        enabled: true
      }
    }
  }
};

export default config;