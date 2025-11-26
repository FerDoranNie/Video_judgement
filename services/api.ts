import { Tournament, VideoItem, VoteRecord } from '../types';

// En producción esto apunta a /api, pero si falla, usamos modo local.
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
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      return data.url; 
    } catch (error) {
      console.warn("Upload failed or backend unavailable. Using local fallback (Demo Mode).", error);
      // FALLBACK: Si falla el servidor (o estamos en demo estática), usamos una URL local
      // para que el usuario pueda seguir probando la app sin bloquearse.
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

      if (!res.ok) throw new Error('Failed to create tournament');
      return await res.json();
    } catch (error) {
      console.warn("Create Tournament failed. Using local fallback.", error);
      // Fallback para demo local
      const mockTournament: Tournament = {
        id: "DEMO-123",
        name: name,
        hostId,
        videos,
        createdAt: Date.now()
      };
      // Guardar en localStorage para persistencia básica si falla el server
      localStorage.setItem('demo_tournament', JSON.stringify(mockTournament));
      return mockTournament;
    }
  },

  async getTournament(code: string): Promise<Tournament> {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${code}`);
      if (!res.ok) throw new Error('Tournament not found');
      return await res.json();
    } catch (error) {
      console.warn("Get Tournament failed. Checking local fallback.", error);
      const stored = localStorage.getItem('demo_tournament');
      if (stored && JSON.parse(stored).id === code) {
        return JSON.parse(stored);
      }
      throw error;
    }
  },

  async submitVote(code: string, voteRecord: VoteRecord): Promise<void> {
    // Fire and forget
    fetch(`${API_BASE}/tournaments/${code}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteRecord }),
    }).catch(err => console.log("Analytics unavailable in demo mode"));
  },
  
  async getGlobalResults(code: string): Promise<{votes: VoteRecord[], videos: VideoItem[]}> {
     try {
       const res = await fetch(`${API_BASE}/tournaments/${code}/results`);
       if (!res.ok) throw new Error('Failed to fetch results');
       return await res.json();
     } catch (error) {
       return { votes: [], videos: [] };
     }
  }
};