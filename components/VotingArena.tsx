import React, { useState } from 'react';
import { VideoItem, VoteRecord } from '../types';
import VideoCard from './VideoCard';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '../services/api';

interface VotingArenaProps {
  videos: VideoItem[];
  userId: string;
  tournamentCode: string;
  onComplete: (winners: VideoItem[], history: VoteRecord[]) => void;
}

const VotingArena: React.FC<VotingArenaProps> = ({ videos, userId, tournamentCode, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<VoteRecord[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentVideo = videos[currentIndex];
  const progress = ((currentIndex) / videos.length) * 100;

  const handleVote = async (liked: boolean) => {
    if (isAnimating || !currentVideo) return;
    
    setIsAnimating(true);

    const record: VoteRecord = {
      videoId: currentVideo.id,
      userId,
      score: liked ? 1 : 0, 
      liked: liked,
      timestamp: Date.now()
    };

    // Enviar voto (no bloqueante para la UI)
    api.submitVote(tournamentCode, record);

    const newHistory = [...history, record];
    setHistory(newHistory);

    // Transición
    setTimeout(() => {
      if (currentIndex >= videos.length - 1) {
        finishSession(newHistory);
      } else {
        // Siguiente video
        setCurrentIndex(prev => prev + 1);
        setIsAnimating(false);
      }
    }, 300); 
  };

  const finishSession = (finalHistory: VoteRecord[]) => {
    // Calcular ranking local rápido para pasar un ganador válido a la App
    // y evitar que se quede bloqueada esperando un "winner".
    const scores: Record<string, number> = {};
    
    finalHistory.forEach(v => {
      if (v.liked) {
        scores[v.videoId] = (scores[v.videoId] || 0) + 1;
      }
    });

    // Ordenar videos por likes de esta sesión
    const sortedVideos = [...videos].sort((a, b) => {
      return (scores[b.id] || 0) - (scores[a.id] || 0);
    });

    // Enviar lista ordenada (el index 0 es el ganador de la sesión)
    onComplete(sortedVideos, finalHistory);
  };

  if (!currentVideo) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white bg-gray-900">
        <p className="text-xl font-bold animate-pulse">Procesando resultados...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-900">
      {/* Top Bar with Progress */}
      <div className="flex-none bg-gray-800 pt-4 pb-2 px-4 shadow-md z-20 border-b border-gray-700">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Star className="text-yellow-500 fill-current" />
            Video {currentIndex + 1} de {videos.length}
          </h2>
          <span className="text-sm font-mono text-indigo-400">
             {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative p-2 flex flex-col items-center justify-center min-h-0 bg-black">
        <div className={`w-full max-w-5xl h-full transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <VideoCard 
            video={currentVideo} 
            isActive={true}
            hideAction={true}
            color="#6366f1"
          />
        </div>
      </div>
      
      {/* Footer Voting Controls */}
      <div className="flex-none bg-gray-800 p-6 border-t border-gray-700 safe-area-bottom">
        <div className="max-w-md mx-auto flex flex-col items-center gap-4">
          
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">
            ¿Te gusta este video?
          </p>

          <div className="flex justify-center gap-4 w-full">
            <button
              onClick={() => handleVote(true)}
              disabled={isAnimating}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all transform active:scale-95 hover:brightness-110 bg-green-600 text-white shadow-lg border-b-4 border-green-800 hover:border-green-700"
            >
              <ThumbsUp size={32} className="fill-current" />
              <span className="text-lg">SÍ (LIKE)</span>
            </button>
            
            <button
              onClick={() => handleVote(false)}
              disabled={isAnimating}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all transform active:scale-95 hover:brightness-110 bg-red-600 text-white shadow-lg border-b-4 border-red-800 hover:border-red-700"
            >
              <ThumbsDown size={32} className="fill-current" />
              <span className="text-lg">NO (NEXT)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VotingArena;