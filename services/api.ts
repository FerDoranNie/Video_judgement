import { Tournament, VideoItem, VoteRecord } from '../types';

// En producción esto apunta a /api
const API_BASE = '/api';

export const api = {
  async uploadVideo(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('video', file);

      // Intentamos subir al servidor real
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Error subiendo video: ${res.status} - ${err}`);
      }
      
      const data = await res.json();
      return data.url; 
    } catch (error) {
      console.warn("API Upload failed (Offline/Demo mode active):", error);
      // FALLBACK: Si falla el servidor (o estamos en demo sin backend),
      // usamos el archivo local para que la app no se trabe.
      return URL.createObjectURL(file);
    }
  },

  async createTournament(name: string, hostId: string, videos: VideoItem[]): Promise<Tournament> {
    try {
      const res = await fetch(`${API_BASE}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, hostId, videos }),
      });

      if (!res.ok) throw new Error('Error al crear torneo en el servidor');
      return await res.json();
    } catch (error) {
       console.error("Create Tournament failed:", error);
       // Fallback for Demo purposes so the UI flow continues
       // Note: Guests won't find this tournament if server is down.
       const mockCode = Math.random().toString(36).substring(2, 7).toUpperCase();
       return {
         id: mockCode,
         name: name + " (Local/Offline)",
         hostId,
         videos,
         createdAt: Date.now(),
         votes: [] // This type is actually missing in the interface but implied by usage
       } as unknown as Tournament;
    }
  },

  async getTournament(code: string): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments/${code}`);
    if (!res.ok) throw new Error('Torneo no encontrado en el servidor');
    return await res.json();
  },

  async submitVote(code: string, voteRecord: VoteRecord): Promise<void> {
    try {
      await fetch(`${API_BASE}/tournaments/${code}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteRecord }),
      });
    } catch (e) {
      console.error("Vote submission failed", e);
    }
  },
  
  async getGlobalResults(code: string): Promise<{votes: VoteRecord[], videos: VideoItem[]}> {
     const res = await fetch(`${API_BASE}/tournaments/${code}/results`);
     if (!res.ok) throw new Error('Failed to fetch results');
     return await res.json();
  }
};