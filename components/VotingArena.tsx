import React, { useState, useEffect } from 'react';
import { VideoItem, Matchup, VoteRecord } from '../types';
import VideoCard from './VideoCard';
import { Swords, AlertCircle } from 'lucide-react';
import { generateJudgeCommentary } from '../services/geminiService';

interface VotingArenaProps {
  videos: VideoItem[];
  userId: string;
  onComplete: (winners: VideoItem[], history: VoteRecord[]) => void;
}

const VotingArena: React.FC<VotingArenaProps> = ({ videos, userId, onComplete }) => {
  // Game State
  const [currentPool, setCurrentPool] = useState<VideoItem[]>(videos);
  const [nextRoundPool, setNextRoundPool] = useState<VideoItem[]>([]);
  const [currentMatchup, setCurrentMatchup] = useState<Matchup | null>(null);
  const [round, setRound] = useState(1);
  const [history, setHistory] = useState<VoteRecord[]>([]);
  const [commentary, setCommentary] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Initialize first matchup
  useEffect(() => {
    if (!currentMatchup && currentPool.length >= 2) {
      createNextMatchup(currentPool);
    } else if (!currentMatchup && currentPool.length === 1 && nextRoundPool.length === 0) {
       // Only 1 video total?
       onComplete([currentPool[0]], history);
    } else if (!currentMatchup && currentPool.length <= 1) {
      // Round Over
      startNextRound();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatchup, currentPool]);

  const createNextMatchup = (pool: VideoItem[]) => {
    // Take first 2
    const videoA = pool[0];
    const videoB = pool[1];
    
    setCurrentMatchup({
      id: crypto.randomUUID(),
      videoA,
      videoB,
      round
    });
  };

  const startNextRound = () => {
    const survivors = [...nextRoundPool, ...currentPool]; // Add any straggler from odd numbered pool
    
    if (survivors.length === 1) {
      // Tournament Complete
      onComplete(survivors, history);
      return;
    }

    if (survivors.length === 0) {
      // Should not happen unless 0 videos started
      onComplete([], history);
      return;
    }

    setRound(r => r + 1);
    setCurrentPool(survivors);
    setNextRoundPool([]);
    setCurrentMatchup(null);
    setCommentary('');
  };

  const handleVote = async (winner: VideoItem, loser: VideoItem) => {
    if (isAnimating || !currentMatchup) return;
    
    setIsAnimating(true);

    // AI Commentary (Fire and forget)
    generateJudgeCommentary(winner, loser, round).then(text => setCommentary(text));

    const record: VoteRecord = {
      matchupId: currentMatchup.id,
      winnerId: winner.id,
      loserId: loser.id,
      userId,
      timestamp: Date.now()
    };

    setHistory(prev => [...prev, record]);
    setNextRoundPool(prev => [...prev, winner]);

    // Delay for animation effect
    setTimeout(() => {
      // Remove the 2 videos we just judged from current pool
      const newPool = currentPool.slice(2);
      setCurrentPool(newPool);
      setCurrentMatchup(null); // Triggers effect to load next
      setIsAnimating(false);
    }, 400);
  };

  if (!currentMatchup) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
        <p>Preparando Enfrentamiento...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-900">
      {/* Top Bar */}
      <div className="flex-none bg-gray-800 p-3 md:p-4 shadow-md z-20 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Swords className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white leading-tight">Ronda {round}</h2>
            <p className="text-xs text-gray-400">
              {currentPool.length} videos restantes
            </p>
          </div>
        </div>
        
        {commentary && (
          <div className="hidden lg:flex flex-1 mx-8 bg-gray-700/50 rounded-lg px-4 py-2 items-center gap-2 border border-indigo-500/30">
             <AlertCircle className="w-4 h-4 text-indigo-400 flex-none" />
             <p className="text-sm text-indigo-200 italic truncate">"{commentary}"</p>
          </div>
        )}

        <div className="text-right">
           <span className="text-[10px] md:text-xs font-mono text-gray-500 uppercase">Siguiente Ronda: {nextRoundPool.length}</span>
        </div>
      </div>

      {/* Arena */}
      <div className="flex-1 relative flex flex-col md:flex-row gap-2 md:gap-8 p-2 md:p-6 items-center justify-center min-h-0">
        
        {/* VS Badge */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none hidden md:block">
           <div className="bg-white text-gray-900 font-black text-2xl px-4 py-2 rounded-full shadow-2xl border-4 border-gray-900">
             VS
           </div>
        </div>

        {/* Video A Container */}
        <div className={`w-full flex-1 md:w-1/2 h-[42vh] md:h-full transition-opacity duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <VideoCard 
            video={currentMatchup.videoA} 
            isActive={true}
            label="Desafiante A"
            color="#ec4899" // Pink
            onSelect={() => handleVote(currentMatchup.videoA, currentMatchup.videoB)}
          />
        </div>
        
        {/* Mobile VS Badge */}
        <div className="md:hidden flex items-center justify-center -my-2 z-30">
            <div className="bg-gray-800 border border-gray-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">VS</div>
        </div>

        {/* Video B Container */}
        <div className={`w-full flex-1 md:w-1/2 h-[42vh] md:h-full transition-opacity duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <VideoCard 
            video={currentMatchup.videoB} 
            isActive={true}
            label="Desafiante B"
            color="#3b82f6" // Blue
            onSelect={() => handleVote(currentMatchup.videoB, currentMatchup.videoA)}
          />
        </div>

      </div>
      
      {/* Bottom info */}
      <div className="flex-none p-2 text-center text-gray-600 text-[10px] md:text-xs bg-gray-900">
        Toca cualquier tarjeta para votar. El perdedor será eliminado.
      </div>
    </div>
  );
};

export default VotingArena;