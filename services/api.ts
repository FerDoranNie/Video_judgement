import { Tournament, VideoItem, VoteRecord } from '../types';

// In development, this might point to localhost:8080 if running separately.
// In production (Cloud Run), it's the relative path '/api'.
const API_BASE = '/api';

export const api = {
  async uploadVideo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('video', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to upload video');
    const data = await res.json();
    return data.url; // Returns /uploads/filename.mp4
  },

  async createTournament(name: string, hostId: string, videos: VideoItem[]): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, hostId, videos }),
    });

    if (!res.ok) throw new Error('Failed to create tournament');
    return await res.json();
  },

  async getTournament(code: string): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments/${code}`);
    if (!res.ok) throw new Error('Tournament not found');
    return await res.json();
  },

  async submitVote(code: string, voteRecord: VoteRecord): Promise<void> {
    // Fire and forget, don't block UI
    fetch(`${API_BASE}/tournaments/${code}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteRecord }),
    }).catch(err => console.error("Failed to submit vote analytics", err));
  },
  
  async getGlobalResults(code: string): Promise<{votes: VoteRecord[], videos: VideoItem[]}> {
     const res = await fetch(`${API_BASE}/tournaments/${code}/results`);
     if (!res.ok) throw new Error('Failed to fetch results');
     return await res.json();
  }
};