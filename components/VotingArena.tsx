
import React, { useState } from 'react';
import { VideoItem, VoteRecord, UserRole } from '../types';
import VideoCard from './VideoCard';
import { Star, ThumbsUp, ThumbsDown, CheckCircle, ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface VotingArenaProps {
  videos: VideoItem[];
  userId: string;
  username: string; // Recibir nombre usuario
  userRole: UserRole; // Recibir rol
  tournamentCode: string;
  onComplete: (winners: VideoItem[], history: VoteRecord[]) => void;
  onExit?: () => void; // Nuevo callback para salir
}

const VotingArena: React.FC<VotingArenaProps> = ({ videos, userId, username, userRole, tournamentCode, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<VoteRecord[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const currentVideo = videos[currentIndex];
  const progress = ((currentIndex) / videos.length) * 100;

  const handleVote = async (liked: boolean) => {
    if (isAnimating || !currentVideo || isSending) return;
    
    setIsAnimating(true);
    const isLastVideo = currentIndex >= videos.length - 1;

    // Si es el último video, mostramos estado de carga para asegurar que se guarde antes de salir
    if (isLastVideo) setIsSending(true);

    const record: VoteRecord = {
      videoId: currentVideo.id,
      userId,
      username, // Guardar nombre
      score: liked ? 1 : 0, 
      liked: liked,
      timestamp: Date.now()
    };

    try {
      // Enviar voto
      // Si es el último, esperamos la respuesta para asegurar consistencia
      const votePromise = api.submitVote(tournamentCode, record);
      if (isLastVideo) {
        await votePromise;
      }
    } catch (e) {
      console.error("Error guardando voto", e);
    }

    const newHistory = [...history, record];
    setHistory(newHistory);

    // Transición visual
    if (isLastVideo) {
       setIsFinished(true);
       setIsSending(false);
    } else {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleAdminFinish = () => {
    // Solo el admin llama a esta función para ir a ResultsScreen
    const scores: Record<string, number> = {};
    history.forEach(v => {
      if (v.liked) {
        scores[v.videoId] = (scores[v.videoId] || 0) + 1;
      }
    });
    // Ordenar videos por likes de esta sesión (aunque en results screen se recalcula globalmente)
    const sortedVideos = [...videos].sort((a, b) => {
      return (scores[b.id] || 0) - (scores[a.id] || 0);
    });
    onComplete(sortedVideos, history);
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6 text-center text-white">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-20 h-20 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold mb-4">¡Gracias por votar!</h2>
          <p className="text-gray-300 mb-8 text-lg">
            <span className="text-white font-bold">{username}</span>, tus calificaciones han sido registradas.
          </p>

          {userRole === 'guest' && (
            <div>
              <button 
                 onClick={() => onExit ? onExit() : window.location.reload()}
                 className="mt-4 flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg"
              >
                <LogOut size={20} /> Finalizar y Volver al Inicio
              </button>
            </div>
          )}

          {userRole === 'admin' && (
            <div className="space-y-4">
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 mb-4">
                 <p className="text-sm text-purple-200 font-bold flex items-center gap-2 justify-center mb-1">
                   <ShieldCheck size={16}/> Panel de Administrador
                 </p>
                 <p className="text-xs text-purple-300">
                   Como organizador, puedes acceder a los resultados finales y descargar los reportes.
                 </p>
              </div>
              <button
                onClick={handleAdminFinish}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <ShieldCheck /> Ver Resultados Globales
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white bg-gray-900">
        <p className="text-xl font-bold animate-pulse">Cargando...</p>
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
              disabled={isAnimating || isSending}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all transform active:scale-95 hover:brightness-110 bg-green-600 text-white shadow-lg border-b-4 border-green-800 hover:border-green-700 disabled:opacity-50 disabled:grayscale"
            >
              {isSending ? <Loader2 className="animate-spin" /> : <ThumbsUp size={32} className="fill-current" />}
              <span className="text-lg">SÍ (LIKE)</span>
            </button>
            
            <button
              onClick={() => handleVote(false)}
              disabled={isAnimating || isSending}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all transform active:scale-95 hover:brightness-110 bg-red-600 text-white shadow-lg border-b-4 border-red-800 hover:border-red-700 disabled:opacity-50 disabled:grayscale"
            >
              {isSending ? <Loader2 className="animate-spin" /> : <ThumbsDown size={32} className="fill-current" />}
              <span className="text-lg">NO (NEXT)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VotingArena;
