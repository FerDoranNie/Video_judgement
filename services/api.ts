import { Tournament, VideoItem, VoteRecord } from '../types';

// En producción esto apunta a /api relativo
const API_BASE = '/api';

export const api = {
  async uploadVideo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('video', file);

    console.log("Subiendo archivo a:", `${API_BASE}/upload`);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      // Intentar leer el error JSON
      const text = await res.text();
      let errorMessage = `Error ${res.status}`;
      try {
        const json = JSON.parse(text);
        if (json.error) errorMessage = json.error;
      } catch (e) {
        errorMessage = `Error del servidor: ${text.substring(0, 50)}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await res.json();
    return data.url; 
  },

  async createTournament(name: string, hostId: string, videos: VideoItem[]): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, hostId, videos }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Error creando torneo: ${text}`);
    }
    return await res.json();
  },

  async getTournament(code: string): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments/${code}`);
    if (!res.ok) throw new Error('Torneo no encontrado');
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