
// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getFirestore, initializeFirestore } from "firebase/firestore";
// @ts-ignore
import { getStorage } from "firebase/storage";
// @ts-ignore
import { getAuth } from "firebase/auth";

// Fix for 'Property 'env' does not exist on type 'ImportMeta''
const env = (import.meta as any).env || {};

// 1. Intentar cargar desde variables de entorno (Vite)
let config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID_GCLOUD || env.VITE_FIREBASE_PROJECT_ID, 
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  // ACTUALIZACIÓN: Usar 'app-videos' como valor predeterminado en lugar de '(default)'
  databaseId: env.VITE_FIREBASE_DATABASE_ID || 'app-videos'
};

// 2. Fallback: Intentar cargar desde localStorage
const storedConfig = typeof window !== 'undefined' ? localStorage.getItem('firebase_settings') : null;

if (storedConfig) {
  try {
    const parsed = JSON.parse(storedConfig);
    if (!config.apiKey || parsed.forceManualConfig) {
        config = { ...config, ...parsed };
    }
  } catch (e) {
    console.error("Configuración guardada inválida");
  }
}

// Determinar si tenemos lo mínimo necesario para arrancar
export const isConfigured = !!(config.apiKey && config.authDomain && config.projectId);

let app;
let dbExport;
let storageExport;
let authExport;

if (isConfigured) {
  try {
    app = initializeApp(config);
    
    // Aseguramos que use app-videos si no hay nada definido
    const dbId = config.databaseId || 'app-videos';
    console.log(`[Firebase Init] Project: ${config.projectId} | Database: ${dbId}`);

    // Usamos initializeFirestore pasando el databaseId como tercer argumento (si existe)
    try {
      dbExport = initializeFirestore(
        app, 
        { experimentalForceLongPolling: true }, 
        dbId
      );
    } catch (e) {
      console.warn("No se pudo inicializar Firestore con configuración avanzada/named DB, usando default:", e);
      // Fallback a default si falla lo específico
      dbExport = getFirestore(app);
    }

    storageExport = getStorage(app);
    authExport = getAuth(app);
    
  } catch (e) {
    console.error("Error crítico inicializando Firebase:", e);
    if (storedConfig) {
      console.warn("La configuración guardada parece inválida. Reseteando...");
      localStorage.removeItem('firebase_settings');
      window.location.reload();
    }
  }
}

// Exportamos las instancias.
export const db = dbExport!;
export const storage = storageExport!;
export const auth = authExport!;

export const saveConfig = (newConfig: any) => {
  const configToSave = { ...newConfig, forceManualConfig: true };
  localStorage.setItem('firebase_settings', JSON.stringify(configToSave));
  window.location.reload();
};

export const clearConfig = () => {
  localStorage.removeItem('firebase_settings');
  window.location.reload();
};
