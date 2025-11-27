
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  getDocs, 
  updateDoc,
  query,
  where,
  DocumentSnapshot,
  deleteDoc
} from "firebase/firestore";
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from "firebase/storage";
import { db, storage } from "../firebaseConfig";
import { Tournament, VideoItem, VoteRecord } from '../types';

// Referencia a colecciones
const TOURNAMENTS_COLLECTION = "tournaments";
const VOTES_SUBCOLLECTION = "votes";

// Helper para timeout
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
};

export const api = {
  get isOffline() {
    return !navigator.onLine;
  },

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const appOptions = db?.app?.options as any;
      const projectId = appOptions?.projectId || "DESCONOCIDO";
      const dbId = appOptions?.databaseId || "(default)";
      
      console.log(`[TEST] Conectando a Firestore. Project: ${projectId} | DB: ${dbId}`);

      const testRef = doc(db, "_diagnostics", `test_${Date.now()}`);
      
      // Intentamos escribir algo muy simple, aumentando timeout
      await withTimeout(
        setDoc(testRef, { 
          active: true,
          ts: Date.now(),
          dbIdUsed: dbId
        }),
        30000, // 30 segundos
        `Timeout conectando a BD '${dbId}' en proyecto '${projectId}'. Verifica el Database ID.`
      );

      // Si pasa, borramos
      try { await deleteDoc(testRef); } catch (e) {}

      return { success: true, message: `¡Conexión Exitosa a ${dbId}!` };
    } catch (e: any) {
      console.error("[TEST ERROR]", e);
      return { success: false, message: e.message };
    }
  },

  async uploadVideoFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageRef = ref(storage, `videos/${Date.now()}_${safeName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error("Error al subir video:", error);
          if (error.code === 'storage/unauthorized') {
            reject(new Error("Permiso denegado en Storage."));
          } else {
            reject(error);
          }
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  },

  async createTournament(name: string, hostId: string, videos: VideoItem[], hostName?: string): Promise<Tournament> {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    const cleanVideos = videos.map(v => ({
      id: v.id,
      title: v.title || "Sin título",
      url: v.url,
      thumbnail: v.thumbnail || "",
      driveId: v.driveId || null 
    }));

    const newTournament: Tournament = {
      id: code,
      name: name || "Torneo Sin Nombre",
      hostId: hostId || "anon",
      hostName: hostName || 'Admin',
      videos: cleanVideos,
      createdAt: Date.now(),
      isActive: true // Por defecto activo
    };

    const appOptions = db?.app?.options as any;
    const dbId = appOptions?.databaseId || "(default)";
    
    // Verificamos si la API Key está presente (bug común)
    if (!appOptions?.apiKey) {
        console.error("API KEY VACÍA O UNDEFINED");
    }

    try {
      await withTimeout(
        setDoc(doc(db, TOURNAMENTS_COLLECTION, code), newTournament),
        60000, 
        "TimeoutDB"
      );
      console.log("Torneo guardado OK.");
      return newTournament;

    } catch (e: any) {
      console.error("🔥 Error crítico al guardar en Firestore:", e);
      
      let errorText = e.message;
      if (e.code === 'permission-denied') errorText = `Permiso denegado en DB '${dbId}'. Revisa reglas.`;
      if (e.message === 'TimeoutDB') errorText = `El servidor tardó demasiado (Cold Start). Reintenta en unos segundos.\nDB: ${dbId}`;

      throw new Error(errorText);
    }
  },

  async getTournament(code: string): Promise<Tournament> {
    const docRef = doc(db, TOURNAMENTS_COLLECTION, code.toUpperCase());
    
    const docSnap = await withTimeout<DocumentSnapshot>(
      getDoc(docRef),
      30000,
      "Tiempo de espera agotado buscando el torneo."
    );

    if (docSnap.exists()) {
      return docSnap.data() as Tournament;
    } else {
      throw new Error("Torneo no encontrado");
    }
  },

  // Nuevo: Verificar si un usuario ya votó en este torneo
  async checkIfUserVoted(code: string, username: string): Promise<boolean> {
    try {
      const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, code.toUpperCase());
      const votesColRef = collection(tournamentRef, VOTES_SUBCOLLECTION);
      
      // Consultamos si existe algún voto con este username
      const q = query(votesColRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (e) {
      console.error("Error verificando usuario:", e);
      return false; // En caso de error, dejamos pasar para no bloquear injustamente
    }
  },

  // Nuevo: Cerrar torneo
  async closeTournament(code: string): Promise<void> {
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, code.toUpperCase());
    await updateDoc(tournamentRef, { isActive: false });
  },

  async submitVote(code: string, voteRecord: VoteRecord): Promise<void> {
    try {
      const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, code.toUpperCase());
      const votesColRef = collection(tournamentRef, VOTES_SUBCOLLECTION);
      
      const cleanVote = {
        ...voteRecord,
        videoId: voteRecord.videoId || "unknown",
        userId: voteRecord.userId || "anon",
        username: voteRecord.username || "Anonimo",
        timestamp: voteRecord.timestamp || Date.now()
      };
      
      await addDoc(votesColRef, cleanVote);
    } catch (e) {
      console.error("Error guardando voto:", e);
    }
  },

  async getGlobalResults(code: string): Promise<{votes: VoteRecord[], videos: VideoItem[]}> {
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, code.toUpperCase());
    const tournamentSnap = await getDoc(tournamentRef);
    if (!tournamentSnap.exists()) throw new Error("Torneo no encontrado");
    const tournamentData = tournamentSnap.data() as Tournament;

    const votesColRef = collection(tournamentRef, VOTES_SUBCOLLECTION);
    const votesSnapshot = await getDocs(votesColRef);

    const votes: VoteRecord[] = [];
    votesSnapshot.forEach((doc) => {
      votes.push(doc.data() as VoteRecord);
    });

    return {
      votes,
      videos: tournamentData.videos
    };
  }
};
