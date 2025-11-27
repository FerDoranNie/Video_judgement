import { Tournament, VideoItem, VoteRecord } from '../types';

const API_BASE = '/api/v2';

// --- OFFLINE STORAGE (Fallback cuando no hay backend) ---
const localTournaments: Record<string, Tournament> = {};
const localVotes: Record<string, VoteRecord[]> = {};

// Estado global de conexión
let isOfflineMode = false;

// Función auxiliar para fetch con timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    throw error;
  }
};

export const api = {
  // Getter para saber si estamos en modo offline
  get isOffline() {
    return isOfflineMode;
  },

  async createTournament(name: string, hostId: string, videos: VideoItem[], hostName?: string): Promise<Tournament> {
    const creatorName = hostName || 'Admin';
    try {
      const res = await fetchWithTimeout(`${API_BASE}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, hostId, videos, hostName: creatorName }),
      }, 5000); 

      // Verificar Content-Type por si devuelve HTML (error de proxy)
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        if (res.ok) {
          isOfflineMode = false;
          return await res.json();
        }
      }
    } catch (e) {
      console.warn("Backend no disponible. Activando Modo Offline Temporal.", e);
    }

    // --- FALLBACK OFFLINE ---
    isOfflineMode = true; // Marcar flag
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newTournament: Tournament = {
      id: code,
      name,
      hostId,
      hostName: creatorName,
      videos,
      createdAt: Date.now()
    };
    
    localTournaments[code] = newTournament;
    localVotes[code] = [];
    console.log(`[Offline Mode] Torneo creado: ${code}`);
    
    // Simulamos un pequeño delay de red
    await new Promise(r => setTimeout(r, 500));
    
    return newTournament;
  },

  async getTournament(code: string): Promise<Tournament> {
    const upperCode = code.toUpperCase();
    
    try {
      const res = await fetchWithTimeout(`${API_BASE}/tournaments/${code}`, {}, 5000);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        isOfflineMode = false;
        const t = await res.json();
        // Opcional: Cachear en local por si luego se cae la red
        if (!localTournaments[upperCode]) {
           localTournaments[upperCode] = t;
        }
        return t;
      }
    } catch (e) {
      console.warn("Backend no disponible. Buscando en memoria local.");
    }

    // --- FALLBACK OFFLINE ---
    const t = localTournaments[upperCode];
    if (t) {
      isOfflineMode = true;
      return t;
    }

    throw new Error('Torneo no encontrado. Si estás en otro dispositivo, asegúrate de que el servidor (Host) esté corriendo y accesible.');
  },

  async submitVote(code: string, voteRecord: VoteRecord): Promise<void> {
    const upperCode = code.toUpperCase();
    
    // 1. SIEMPRE guardar en local como respaldo inmediato (Optimistic UI)
    if (!localVotes[upperCode]) {
      localVotes[upperCode] = [];
    }
    localVotes[upperCode].push(voteRecord);

    // 2. Intentar enviar al servidor
    try {
      await fetchWithTimeout(`${API_BASE}/tournaments/${code}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteRecord }),
      }, 3000);
    } catch (e) {
      // Si falla, ya está guardado localmente, no hacemos nada más
      console.warn("Voto guardado solo localmente (Offline mode activo o red inestable)");
    }
  },
  
  async getGlobalResults(code: string): Promise<{votes: VoteRecord[], videos: VideoItem[]}> {
     const upperCode = code.toUpperCase();
     
     try {
       const res = await fetchWithTimeout(`${API_BASE}/tournaments/${code}/results`, {}, 5000);
       const contentType = res.headers.get("content-type");
       if (res.ok && contentType && contentType.includes("application/json")) {
         const data = await res.json();
         // Si el servidor devuelve 0 votos pero tenemos votos locales, significa que el servidor se reinició.
         // En ese caso, devolvemos un mix o preferimos lo local si está vacío.
         if (data.votes.length === 0 && localVotes[upperCode] && localVotes[upperCode].length > 0) {
            console.warn("Servidor sin votos. Usando caché local.");
            return {
              votes: localVotes[upperCode],
              videos: data.videos
            };
         }
         return data;
       }
     } catch (e) {
       console.warn("Backend no disponible. Devolviendo resultados locales.");
     }

     // --- FALLBACK OFFLINE ---
     // Si falla la red, devolvemos lo que tengamos en memoria
     return {
       votes: localVotes[upperCode] || [],
       videos: localTournaments[upperCode]?.videos || []
     };
  },

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout('/api/health', {}, 3000);
      return res.ok;
    } catch (e) {
      return false;
    }
  }
};