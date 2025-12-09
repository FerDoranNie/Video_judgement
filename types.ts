
export interface VideoItem {
  id: string;
  title: string;
  url: string; // Embed URL or Source URL
  thumbnail: string;
  driveId?: string;
  scriptText?: string; // Nuevo: Contenido del guion
}

export type UserRole = 'admin' | 'director' | 'colaborador' | 'prueba';
export type VotingMethod = 'like' | 'ranking';
export type AppTheme = 'blue' | 'orange';

export interface RankingQuestion {
  id: string;
  text: string;
  // maxScale eliminado, ahora es global en el torneo
}

export interface User {
  username: string;
  id: string;
  role: UserRole;
  employeeId?: string; 
}

export interface Tournament {
  id: string; 
  name: string;
  hostId: string;
  hostName?: string; 
  videos: VideoItem[];
  createdAt: number;
  isActive: boolean;
  validDirectorIds?: string[];
  
  // Nuevo: Configuración de votación
  votingMethod: VotingMethod;
  rankingScale?: number; // Escala global (ej. 10)
  rankingQuestions?: RankingQuestion[];
}

export interface Matchup {
  id: string;
  videoA: VideoItem;
  videoB: VideoItem;
  round: number;
}

export interface VoteRecord {
  videoId: string;
  userId: string;
  username?: string;
  userRole?: UserRole; 
  employeeId?: string; 
  
  score: number; // Total points (1 for like, sum of answers for ranking)
  liked: boolean; // True if score > 0 (simplification for backward compat)
  
  // Nuevo: Desglose de respuestas ranking
  rankingScores?: Record<string, number>; // questionId -> score
  
  // Nuevo: Comentarios opcionales
  comment?: string;

  timestamp: number;
}

export interface TournamentState {
  currentPool: VideoItem[];
  nextPool: VideoItem[];
  currentMatchup: Matchup | null;
  round: number;
  completed: boolean;
  history: VoteRecord[];
  winners: VideoItem[]; 
}
