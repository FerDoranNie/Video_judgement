import { Tournament, VideoItem, VoteRecord } from '../types';

// En producción esto apunta a /api
const API_BASE = '/api';

export const api = {
  async uploadVideo(file: File): Promise<string> {
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
  },

  async createTournament(name: string, hostId: string, videos: VideoItem[]): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, hostId, videos }),
    });

    if (!res.ok) throw new Error('Error al crear torneo en el servidor');
    return await res.json();
  },

  async getTournament(code: string): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments/${code}`);
    if (!res.ok) throw new Error('Torneo no encontrado en el servidor');
    return await res.json();
  },

  async submitVote(code: string, voteRecord: VoteRecord): Promise<void> {
    await fetch(`${API_BASE}/tournaments/${code}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteRecord }),
    });
  },
  
  async getGlobalResults(code: string): Promise<{votes: VoteRecord[], videos: VideoItem[]}> {
     const res = await fetch(`${API_BASE}/tournaments/${code}/results`);
     if (!res.ok) throw new Error('Failed to fetch results');
     return await res.json();
  }
};