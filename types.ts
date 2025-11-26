export interface VideoItem {
  id: string;
  title: string;
  url: string; // Embed URL or Source URL
  thumbnail: string;
  driveId?: string;
}

export type UserRole = 'admin' | 'guest';

export interface User {
  username: string;
  id: string;
  role: UserRole;
}

export interface Tournament {
  id: string; // Unique code (e.g., "AF3D2")
  name: string;
  hostId: string;
  videos: VideoItem[];
  createdAt: number;
}

export interface Matchup {
  id: string;
  videoA: VideoItem;
  videoB: VideoItem;
  round: number;
}

export interface VoteRecord {
  matchupId: string;
  winnerId: string;
  loserId: string;
  userId: string;
  timestamp: number;
}

export interface TournamentState {
  currentPool: VideoItem[];
  nextPool: VideoItem[];
  currentMatchup: Matchup | null;
  round: number;
  completed: boolean;
  history: VoteRecord[];
  winners: VideoItem[]; // Final top list
}