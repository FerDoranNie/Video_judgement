
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
import { Tournament, VideoItem, VoteRecord, VotingMethod, RankingQuestion } from '../types';

const TOURNAMENTS_COLLECTION = "tournaments";
const VOTES_SUBCOLLECTION = "votes";

const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
};

export const api = {
  get isOffline() { return !navigator.onLine; },

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const appOptions = db?.app?.options as any;
      const projectId = appOptions?.projectId || "DESCONOCIDO";
      const dbId = appOptions?.databaseId || "(default)";
      console.log(`[TEST] Conectando a Firestore. Project: ${projectId} | DB: ${dbId}`);

      const testRef = doc(db, "_diagnostics", `test_${Date.now()}`);
      
      // Intentamos escribir algo muy simple
      await withTimeout(
        setDoc(testRef, { 
          active: true,
          ts: Date.now(),
          dbIdUsed: dbId
        }),
        30000, // 30 segundos máximo para cold starts
        `Timeout. Firebase no responde a la dirección '${projectId}' (DB: ${dbId}). Posible causa: API no habilitada o ID incorrecto.`
      );

      // Si pasa, borramos
      try { await deleteDoc(testRef); } catch (e) {}

      // Log para verificar API Key (sin mostrarla completa por seguridad)
      const apiKey = appOptions?.apiKey;
      console.log(`[TEST] Config cargada: ProjectID=${projectId}, APIKey=${apiKey ? (apiKey.substr(0,5)+'...') : 'undefined'}`);

      return { success: true, message: `¡Conexión Exitosa a ${dbId}! Base de datos responde.` };
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
      uploadTask.on("state_changed",
        (snapshot) => { if (onProgress) onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100); },
        (error) => reject(error),
        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
      );
    });
  },

  async createTournament(
    name: string, 
    hostId: string, 
    videos: VideoItem[], 
    hostName?: string, 
    validDirectorIds: string[] = [],
    votingMethod: VotingMethod = 'like',
    rankingScale?: number,
    rankingQuestions: RankingQuestion[] = []
  ): Promise<Tournament> {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const cleanVideos = videos.map(v => ({
      id: v.id, 
      title: v.title || "Sin título", 
      url: v.url, 
      thumbnail: v.thumbnail || "", 
      driveId: v.driveId || null,
      scriptText: v.scriptText || null
    }));

    const newTournament: Tournament = {
      id: code,
      name: name || "Torneo Sin Nombre",
      hostId: hostId || "anon",
      hostName: hostName || 'Admin',
      videos: cleanVideos,
      createdAt: Date.now(),
      isActive: true,
      validDirectorIds: validDirectorIds,
      votingMethod: votingMethod,
      // Firestore odia 'undefined'. Usamos null o un valor por defecto.
      rankingScale: rankingScale ?? 10, 
      rankingQuestions: rankingQuestions ?? []
    };

    // SANITIZACIÓN FINAL: Convertir cualquier undefined remanente a null o eliminarlo
    const safeData = JSON.parse(JSON.stringify(newTournament));

    try {
      await withTimeout(
        setDoc(doc(db, TOURNAMENTS_COLLECTION, code), safeData),
        60000, 
        "El servidor tardó demasiado en responder. Posible causa: Firewall corporativo o API no habilitada."
      );
      return newTournament;
    } catch (e: any) {
      const projectId = (db?.app?.options as any)?.projectId;
      console.error(`[CREATE ERROR] Fallo al crear en ProjectID: ${projectId}`, e);
      throw new Error(e.message);
    }
  },

  async getTournament(code: string): Promise<Tournament> {
    const docRef = doc(db, TOURNAMENTS_COLLECTION, code.toUpperCase());
    const docSnap = await withTimeout<DocumentSnapshot>(
      getDoc(docRef), 30000, "Tiempo de espera agotado buscando el torneo."
    );
    if (docSnap.exists()) return docSnap.data() as Tournament;
    else throw new Error("Torneo no encontrado");
  },

  async checkIfUserVoted(code: string, username: string, employeeId?: string): Promise<boolean> {
    try {
      const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, code.toUpperCase());
      const votesColRef = collection(tournamentRef, VOTES_SUBCOLLECTION);
      
      const qUser = query(votesColRef, where("username", "==", username));
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) return true;

      if (employeeId && employeeId.trim() !== "") {
        const qEmployee = query(votesColRef, where("employeeId", "==", employeeId));
        const snapEmployee = await getDocs(qEmployee);
        if (!snapEmployee.empty) return true;
      }

      return false;
    } catch (e) { 
      console.error("Error verificando votos:", e);
      return false; 
    }
  },

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
        userRole: voteRecord.userRole || "prueba",
        employeeId: voteRecord.employeeId || "N/A",
        timestamp: voteRecord.timestamp || Date.now(),
        rankingScores: voteRecord.rankingScores || {},
        comment: voteRecord.comment || null // Convertir undefined a null para Firestore
      };

      const safeVote = JSON.parse(JSON.stringify(cleanVote));
      
      await withTimeout(
        addDoc(votesColRef, safeVote), 
        10000, 
        "Tiempo de espera al guardar voto"
      );
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
    votesSnapshot.forEach((doc) => votes.push(doc.data() as VoteRecord));
    return { votes, videos: tournamentData.videos };
  }
};
