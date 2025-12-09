
import React, { useState, useEffect } from 'react';
import { VideoItem, VoteRecord, UserRole, VotingMethod, RankingQuestion, AppTheme } from '../types';
import VideoCard from './VideoCard';
import AnalysisView from './AnalysisView';
import { 
  ThumbsUp, ThumbsDown, CheckCircle, ShieldCheck, LogOut, 
  Loader2, ArrowRight, MessageSquare, FileText, ListChecks, 
  Play, ChevronDown, MousePointerClick, ChevronUp, X
} from 'lucide-react';
import { api } from '../services/api';

interface VotingArenaProps {
  videos: VideoItem[];
  userId: string;
  username: string; 
  userRole: UserRole;
  employeeId?: string; 
  tournamentCode: string;
  votingMethod: VotingMethod;
  rankingScale?: number;
  rankingQuestions?: RankingQuestion[];
  onComplete: (winners: VideoItem[], history: VoteRecord[]) => void;
  onExit?: () => void; 
  theme: AppTheme;
}

const VotingArena: React.FC<VotingArenaProps> = ({ 
  videos, userId, username, userRole, employeeId, tournamentCode, votingMethod, 
  rankingScale = 10, rankingQuestions, onComplete, onExit, theme
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<VoteRecord[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Estados para Ranking y Comentarios
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  
  // Estado para UI Móvil (Overlay)
  const [showMobileVoting, setShowMobileVoting] = useState(false);
  const [mobileTab, setMobileTab] = useState<'vote' | 'script'>('vote');

  const currentVideo = videos[currentIndex];
  const progress = ((currentIndex + 1) / videos.length) * 100;
  const isLastVideo = currentIndex >= videos.length - 1;
  const hasScript = !!currentVideo?.scriptText;

  // Theme constants
  const isOrange = theme === 'orange';
  const primaryColor = isOrange ? 'text-orange-400' : 'text-indigo-400';
  const primaryBg = isOrange ? 'bg-orange-600' : 'bg-indigo-600';
  const primaryBgHover = isOrange ? 'hover:bg-orange-500' : 'hover:bg-indigo-500';
  const primaryBorder = isOrange ? 'border-orange-500' : 'border-indigo-500';
  const bgBase = isOrange ? 'bg-stone-950' : 'bg-black';
  const bgPanel = isOrange ? 'bg-stone-900' : 'bg-gray-900';
  const borderPanel = isOrange ? 'border-stone-800' : 'border-gray-800';

  // Resetear estados al cambiar video
  useEffect(() => {
    setCurrentAnswers({});
    setComment('');
    setMobileTab('vote'); 
    setShowMobileVoting(false); // Al cambiar video, volvemos a mostrar el video (ocultamos votación)
  }, [currentIndex]);

  const handleVote = async (likedOrScores: boolean | Record<string, number>) => {
    if (isAnimating || !currentVideo || isSending) return;
    setIsAnimating(true);
    
    if (isLastVideo) setIsSending(true);

    let score = 0;
    let liked = false;
    let rankingScores: Record<string, number> | undefined = undefined;

    if (votingMethod === 'ranking' && typeof likedOrScores === 'object') {
       rankingScores = likedOrScores;
       score = Object.values(rankingScores).reduce((a, b) => a + b, 0);
       liked = score > 0;
    } else if (typeof likedOrScores === 'boolean') {
       liked = likedOrScores;
       score = liked ? 1 : 0;
    }

    const record: VoteRecord = {
      videoId: currentVideo.id,
      userId,
      username, 
      userRole,
      employeeId: employeeId, 
      score, 
      liked,
      rankingScores,
      comment: comment.trim() || undefined,
      timestamp: Date.now()
    };

    try {
      const votePromise = api.submitVote(tournamentCode, record);
      if (isLastVideo) await votePromise;
    } catch (e) {
      console.error("Error guardando voto", e);
    }

    const newHistory = [...history, record];
    setHistory(newHistory);

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

  const handleRankingAnswer = (questionId: string, value: number) => {
    setCurrentAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const submitRanking = () => {
    handleVote(currentAnswers);
  };

  const allQuestionsAnswered = rankingQuestions?.every(q => currentAnswers[q.id] !== undefined);

  const handleAdminFinish = () => {
    const scores: Record<string, number> = {};
    history.forEach(v => {
      scores[v.videoId] = (scores[v.videoId] || 0) + v.score;
    });
    const sortedVideos = [...videos].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    onComplete(sortedVideos, history);
  };

  // --- VISTA FINALIZADA ---
  if (isFinished) {
    return (
      <div className={`flex flex-col items-center min-h-screen text-white overflow-y-auto custom-scrollbar ${isOrange ? 'bg-stone-950' : 'bg-gray-950'}`}>
        <div className="w-full max-w-6xl p-4 md:p-8">
          <div className={`${bgPanel} backdrop-blur-sm border ${borderPanel} rounded-3xl p-8 shadow-2xl`}>
            <div className="flex flex-col items-center justify-center mb-10">
              <div className="bg-green-500/20 p-4 rounded-full mb-4 animate-in zoom-in">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                ¡Votación Completada!
              </h2>
              <p className="text-gray-400 mt-2">Gracias por tu participación, {username}.</p>
            </div>

            <AnalysisView 
              currentUserVotes={history}
              videos={videos}
              tournamentCode={tournamentCode}
              userRole={userRole}
              votingMethod={votingMethod}
              rankingQuestions={rankingQuestions}
              rankingScale={rankingScale}
            />

            <div className="flex justify-center gap-4 mt-10">
              {userRole !== 'admin' && (
                  <button 
                    onClick={() => onExit ? onExit() : window.location.reload()}
                    className={`flex items-center gap-2 px-8 py-4 ${isOrange ? 'bg-stone-800 hover:bg-stone-700' : 'bg-gray-800 hover:bg-gray-700'} text-white font-bold rounded-xl transition border border-gray-700 hover:border-gray-500`}
                  >
                    <LogOut size={20} /> Salir al Inicio
                  </button>
              )}
              {userRole === 'admin' && (
                  <button
                    onClick={handleAdminFinish}
                    className={`px-8 py-4 ${primaryBg} ${primaryBgHover} text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2`}
                  >
                    <ShieldCheck /> Ver Resultados y Gestión
                  </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentVideo) return <div className={`flex h-screen items-center justify-center ${bgBase} text-white`}><Loader2 className="animate-spin"/></div>;

  // --- RENDERIZADO DEL PANEL DE VOTACIÓN ---
  const renderVotingPanel = (isMobile = false) => (
    <div className="h-full flex flex-col">
      {/* Mobile Header for Overlay */}
      {isMobile && (
        <div className={`flex-none flex justify-between items-center p-4 border-b ${borderPanel} bg-black/20`}>
          <h2 className="text-lg font-bold text-white">Calificar Video</h2>
          <button 
            onClick={() => setShowMobileVoting(false)}
            className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white bg-white/10 px-3 py-1.5 rounded-full"
          >
            <ChevronDown size={14} /> Ver Video
          </button>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="flex-none mb-4 px-2 pt-2 md:px-0 md:pt-0">
          <h3 className={`text-xs font-bold uppercase tracking-widest mb-1 ${primaryColor}`}>Tu calificación</h3>
          <h2 className="text-lg md:text-xl font-bold text-white leading-tight">
             {votingMethod === 'like' ? '¿Te gusta este video?' : 'Evalúa el contenido'}
          </h2>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto custom-scrollbar px-4 md:px-0 py-4 md:pb-0 space-y-4 ${isMobile ? 'pb-24' : ''}`}>
        {votingMethod === 'like' ? (
          <div className="grid grid-cols-2 gap-3 h-40 md:h-full md:max-h-[200px]">
            <button
              onClick={() => handleVote(true)}
              disabled={isAnimating || isSending}
              className={`h-full flex flex-col items-center justify-center gap-3 ${isOrange ? 'bg-stone-800' : 'bg-gray-800'} hover:bg-green-600/20 border-2 ${isOrange ? 'border-stone-700' : 'border-gray-700'} hover:border-green-500 rounded-2xl transition-all group disabled:opacity-50`}
            >
              <ThumbsUp size={32} className="text-gray-400 group-hover:text-green-500 transition-colors" />
              <span className="font-bold text-gray-300 group-hover:text-white">Me Gusta</span>
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={isAnimating || isSending}
              className={`h-full flex flex-col items-center justify-center gap-3 ${isOrange ? 'bg-stone-800' : 'bg-gray-800'} hover:bg-red-600/20 border-2 ${isOrange ? 'border-stone-700' : 'border-gray-700'} hover:border-red-500 rounded-2xl transition-all group disabled:opacity-50`}
            >
              <ThumbsDown size={32} className="text-gray-400 group-hover:text-red-500 transition-colors" />
              <span className="font-bold text-gray-300 group-hover:text-white">No Me Gusta</span>
            </button>
          </div>
        ) : (
          rankingQuestions?.map((q, idx) => (
            <div key={q.id} className={`${isOrange ? 'bg-stone-800/50 border-stone-700/50' : 'bg-gray-800/50 border-gray-700/50'} p-4 rounded-xl border`}>
               <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-200">{idx+1}. {q.text}</span>
                  {currentAnswers[q.id] && (
                    <span className={`flex-none ${primaryBg} text-white text-xs font-bold px-2 py-1 rounded`}>
                      {currentAnswers[q.id]}
                    </span>
                  )}
               </div>
               <div className="flex gap-1 justify-between">
                  {Array.from({length: rankingScale}, (_, i) => i + 1).map(num => (
                     <button
                       key={num}
                       onClick={() => handleRankingAnswer(q.id, num)}
                       className={`
                         flex-1 h-10 rounded-lg text-xs font-bold transition-all
                         ${currentAnswers[q.id] === num 
                           ? `${primaryBg} text-white shadow-lg scale-105` 
                           : `${isOrange ? 'bg-stone-700 text-stone-400 hover:bg-stone-600' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'} hover:text-white`}
                       `}
                     >
                        {num}
                     </button>
                  ))}
               </div>
               <div className="flex justify-between mt-1 px-1">
                 <span className="text-[10px] text-gray-500">Bajo</span>
                 <span className="text-[10px] text-gray-500">Alto</span>
               </div>
            </div>
          ))
        )}

        <div className="pt-2">
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex gap-2 items-center">
            <MessageSquare size={12}/> Comentarios (Opcional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            className={`w-full ${isOrange ? 'bg-stone-800 border-stone-700' : 'bg-gray-800 border-gray-700'} border rounded-xl p-3 text-sm text-white focus:${primaryBorder} focus:ring-1 outline-none resize-none h-20 md:h-24 placeholder-gray-600 transition`}
            placeholder="¿Algo que agregar sobre este video?"
          />
          <div className="text-right text-[10px] text-gray-600 mt-1">{comment.length}/500</div>
        </div>
        
        {/* Botón de acción (Móvil y Escritorio) */}
        {votingMethod === 'ranking' && (
          <button
            onClick={submitRanking}
            disabled={!allQuestionsAnswered || isAnimating || isSending}
            className={`w-full mt-4 ${primaryBg} ${primaryBgHover} disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mb-12 md:mb-0`}
          >
            {isSending ? <Loader2 className="animate-spin" /> : (isLastVideo ? <CheckCircle /> : <ArrowRight />)}
            {isLastVideo ? 'Finalizar' : 'Siguiente'}
          </button>
        )}
      </div>
    </div>
  );

  // --- LAYOUT PRINCIPAL ---
  return (
    <div className={`flex flex-col h-[100dvh] ${bgBase} text-white overflow-hidden font-sans`}>
      
      {/* HEADER (Fijo) */}
      <header className={`flex-none h-14 ${bgPanel} border-b ${borderPanel} flex items-center justify-between px-4 z-30`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${primaryBg} flex items-center justify-center`}>
             <Play size={14} className="ml-0.5 fill-current" />
          </div>
          <div>
             <h1 className="text-sm font-bold leading-none text-white truncate max-w-[150px] md:max-w-xs">{currentVideo.title}</h1>
             <p className="text-[10px] text-gray-400">Video {currentIndex + 1} de {videos.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-1/3 md:w-1/4">
           <div className={`flex-1 h-1.5 ${isOrange ? 'bg-stone-800' : 'bg-gray-800'} rounded-full overflow-hidden`}>
              <div className={`h-full ${isOrange ? 'bg-orange-500' : 'bg-indigo-500'} transition-all duration-500 ease-out`} style={{ width: `${progress}%` }}></div>
           </div>
           <span className={`text-xs font-mono ${primaryColor} w-8 text-right`}>{Math.round(progress)}%</span>
        </div>
      </header>

      {/* BODY (Flex) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        
        {/* --- VIDEO CONTAINER ---
            Móvil: 100% Pantalla.
            Escritorio: Ancho flexible.
        */}
        <div className={`
          relative ${bgBase} flex flex-col
          h-full
          w-full md:flex-1
          md:order-2 
        `}>
           {/* Reproductor */}
           <div className={`flex-1 w-full h-full p-0 md:p-6 transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
              <VideoCard video={currentVideo} isActive={true} hideAction={true} color={isOrange ? '#f97316' : '#4f46e5'} />
           </div>

           {/* --- MOBILE FLOATING BUTTON (Solo visible cuando NO se está votando) --- */}
           {!showMobileVoting && (
             <div className="md:hidden absolute bottom-8 left-0 right-0 flex justify-center z-20 pointer-events-none">
                <button 
                  onClick={() => setShowMobileVoting(true)}
                  className={`pointer-events-auto shadow-2xl animate-bounce ${primaryBg} text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 border-2 border-white/20`}
                >
                  <ListChecks size={20} /> CALIFICAR
                </button>
             </div>
           )}
        </div>

        {/* --- SCRIPT SIDEBAR (Solo Escritorio) --- */}
        {hasScript && (
          <div className={`hidden md:flex md:w-[25%] md:order-1 ${bgPanel} border-r ${borderPanel} flex-col z-20`}>
            <div className={`p-4 border-b ${borderPanel} ${isOrange ? 'bg-stone-900/95' : 'bg-gray-900/95'} backdrop-blur sticky top-0`}>
               <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                 <FileText size={14}/> Guion del Video
               </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
               <p className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap font-serif">
                  {currentVideo.scriptText}
               </p>
            </div>
          </div>
        )}

        {/* --- VOTING SIDEBAR (Escritorio) --- */}
        <div className={`hidden md:block md:w-[25%] md:order-3 ${bgPanel} border-l ${borderPanel} p-6 z-20 overflow-hidden`}>
           {renderVotingPanel(false)}
        </div>

        {/* --- MOBILE OVERLAY (Votación Pantalla Completa) --- 
            Se activa con showMobileVoting. Cubre todo el video.
        */}
        <div className={`
            md:hidden fixed inset-0 z-50 flex flex-col transition-transform duration-300 ease-in-out
            ${showMobileVoting ? 'translate-y-0' : 'translate-y-full'}
            ${bgPanel}
        `}>
            {/* Header móvil de votación */}
            {mobileTab === 'vote' ? (
                renderVotingPanel(true)
            ) : (
                <div className="flex-1 overflow-y-auto p-4">
                     <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
                         <h3 className="font-bold">Guion</h3>
                         <button onClick={() => setMobileTab('vote')} className="text-xs bg-gray-700 px-3 py-1 rounded">Volver</button>
                     </div>
                     <p className="text-sm text-gray-300 whitespace-pre-wrap font-serif pb-8">{currentVideo.scriptText}</p>
                </div>
            )}

            {/* Mobile Tab Switcher inside Overlay (si hay script) */}
            {hasScript && showMobileVoting && (
               <div className={`absolute bottom-0 left-0 right-0 h-14 ${isOrange ? 'bg-stone-800' : 'bg-gray-800'} border-t ${borderPanel} flex z-50`}>
                  <button 
                    onClick={() => setMobileTab('vote')}
                    className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${mobileTab === 'vote' ? `${primaryColor}` : 'text-gray-500'}`}
                  >
                    <ListChecks size={16}/> Calificar
                  </button>
                  <button 
                    onClick={() => setMobileTab('script')}
                    className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${mobileTab === 'script' ? `${primaryColor}` : 'text-gray-500'}`}
                  >
                    <FileText size={16}/> Guion
                  </button>
               </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default VotingArena;
