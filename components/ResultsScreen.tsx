
import React, { useEffect, useState } from 'react';
import { VideoItem, VoteRecord, VotingMethod, RankingQuestion, AppTheme } from '../types';
import { Trophy, Share2, Download, ThumbsUp, FileSpreadsheet, Lock, CheckCircle, Star, AlertTriangle, X } from 'lucide-react';
import { api } from '../services/api';

interface ResultsScreenProps {
  winner?: VideoItem | null; 
  history: VoteRecord[];
  allVideos: VideoItem[];
  tournamentCode: string;
  hostName: string;
  isHost?: boolean; 
  isActive?: boolean; 
  votingMethod: VotingMethod;
  rankingScale?: number;
  rankingQuestions?: RankingQuestion[];
  theme: AppTheme;
}

interface VideoStats {
  totalScore: number; // Suma de puntos o likes
  voteCount: number;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ 
    winner: initialWinner, history, allVideos, tournamentCode, hostName, isHost, isActive: initialActive, votingMethod, rankingScale = 10, rankingQuestions, theme
}) => {
  const [rankedVideos, setRankedVideos] = useState<VideoItem[]>([]);
  const [stats, setStats] = useState<Record<string, VideoStats>>({});
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingRaw, setLoadingRaw] = useState(false);
  const [tournamentActive, setTournamentActive] = useState(initialActive);
  const [closing, setClosing] = useState(false);
  
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  useEffect(() => {
    const localStats: Record<string, VideoStats> = {};
    allVideos.forEach(v => { localStats[v.id] = { totalScore: 0, voteCount: 0 }; });
    
    history.forEach(vote => {
      if (localStats[vote.videoId]) {
        localStats[vote.videoId].voteCount += 1;
        localStats[vote.videoId].totalScore += vote.score;
      }
    });

    setStats(localStats);
    const sorted = [...allVideos].sort((a, b) => {
      return localStats[b.id].totalScore - localStats[a.id].totalScore;
    });
    setRankedVideos(sorted);
  }, [history, allVideos]);

  const winner = initialWinner || (rankedVideos.length > 0 ? rankedVideos[0] : null);
  const isOrange = theme === 'orange';
  const bgBase = isOrange ? 'bg-stone-900' : 'bg-gray-900';
  const cardBg = isOrange ? 'bg-stone-800' : 'bg-gray-800';
  const accentText = isOrange ? 'text-orange-400' : 'text-green-400'; // Winner score color
  const primaryButton = isOrange ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700';

  const performCloseTournament = async () => {
    setClosing(true);
    try {
        await api.closeTournament(tournamentCode);
        setTournamentActive(false);
        setShowCloseWarning(false);
    } catch (e) { 
        alert("Error al cerrar"); 
    } finally { 
        setClosing(false); 
    }
  };

  const downloadCSV = async (mode: 'summary' | 'detailed') => {
    const setLoading = mode === 'summary' ? setLoadingGlobal : setLoadingRaw;
    setLoading(true);

    try {
      let votes: VoteRecord[] = [];
      let isLocal = false;
      try {
        const response = await api.getGlobalResults(tournamentCode);
        votes = response.votes;
      } catch (e) {
        votes = history; isLocal = true;
      }

      if (votes.length === 0) { alert("Sin datos."); setLoading(false); return; }

      let csvContent = "";
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM

      if (mode === 'summary') {
        const globalStats: Record<string, VideoStats> = {};
        allVideos.forEach(v => { globalStats[v.id] = { totalScore: 0, voteCount: 0 }; });
        votes.forEach(vote => {
          if (globalStats[vote.videoId]) {
            globalStats[vote.videoId].voteCount += 1;
            globalStats[vote.videoId].totalScore += vote.score;
          }
        });
        const sorted = [...allVideos].sort((a, b) => (globalStats[b.id]?.totalScore || 0) - (globalStats[a.id]?.totalScore || 0));
        
        const metricName = votingMethod === 'ranking' ? 'Puntos Totales' : 'Total Likes';
        
        const headers = ['Ranking', 'Titulo Video', metricName, 'Total Votos', 'Promedio', 'Metodo'];
        const rows = sorted.map((v, i) => {
          const s = globalStats[v.id];
          const avg = s.voteCount > 0 ? (s.totalScore / s.voteCount).toFixed(2) : "0";
          return [`${i+1}`, `"${v.title.replace(/"/g, '""')}"`, `${s.totalScore}`, `${s.voteCount}`, `${avg}`, votingMethod];
        });
        csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

      } else {
        // DETALLADO
        let headers = ['Codigo Torneo', 'Fecha', 'Nombre Usuario', 'Rol', 'No. Empleado', 'Video ID', 'Titulo Video', 'Metodo Votacion'];
        
        // Columnas dinámicas para ranking
        if (votingMethod === 'ranking' && rankingQuestions) {
            headers.push(`Configuracion Rango (1-${rankingScale})`);
            rankingQuestions.forEach((q, i) => {
                headers.push(`P${i+1}: ${q.text.replace(/,/g, '')}`);
                headers.push(`P${i+1} Score`);
            });
            headers.push('Puntaje Total');
        } else {
            headers.push('Voto (Like)');
        }
        
        // Nueva columna
        headers.push('Comentarios');

        const videoTitles: Record<string, string> = {};
        allVideos.forEach(v => videoTitles[v.id] = v.title);

        const rows = votes.map(v => {
           const common = [
             tournamentCode,
             new Date(v.timestamp).toISOString(),
             `"${(v.username || 'Anonimo').replace(/"/g, '""')}"`, 
             `"${v.userRole || '?'}"`, 
             `"${v.employeeId || 'N/A'}"`, 
             `"${v.videoId}"`,
             `"${(videoTitles[v.videoId] || 'Unknown').replace(/"/g, '""')}"`,
             votingMethod
           ];

           if (votingMethod === 'ranking' && rankingQuestions) {
               common.push(`"1-${rankingScale}"`);

               rankingQuestions.forEach(q => {
                   const qScore = v.rankingScores?.[q.id] || 0;
                   common.push('""'); // Placeholder texto
                   common.push(`${qScore}`);
               });
               common.push(`${v.score}`);
           } else {
               common.push(v.liked ? 'LIKE' : 'DISLIKE');
           }
           
           // Añadir comentario escapando comillas
           common.push(`"${(v.comment || '').replace(/"/g, '""')}"`);

           return common;
        });
        csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      }

      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DATASET_${votingMethod.toUpperCase()}_${tournamentCode}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { console.error(e); alert("Error generando CSV"); } finally { setLoading(false); }
  };

  if (!winner) return <div className="p-10 text-white">No hay datos.</div>;

  return (
    <div className={`min-h-screen ${bgBase} text-white p-4 md:p-8 overflow-y-auto relative`}>
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-green-500 rounded-full shadow-2xl mb-4">
             <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">Resultados Finales</h1>
          <div className="flex justify-center gap-2">
             {tournamentActive !== false ? 
                 <span className="bg-green-900/50 text-green-400 border border-green-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase flex gap-2"><CheckCircle size={14}/> Activo</span> : 
                 <span className="bg-red-900/50 text-red-400 border border-red-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase flex gap-2"><Lock size={14}/> Finalizado</span>
             }
             <span className="bg-blue-900/50 text-blue-400 border border-blue-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase">
                Método: {votingMethod}
             </span>
          </div>
        </div>

        {isHost && tournamentActive !== false && (
            <div className="mb-8 bg-orange-900/20 border border-orange-500/30 p-6 rounded-2xl flex justify-between items-center">
                <div><h3 className="font-bold text-orange-200">Administrar Evento</h3><p className="text-sm text-gray-400">Cerrar votaciones permanentemente.</p></div>
                <button 
                  onClick={() => setShowCloseWarning(true)} 
                  disabled={closing} 
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl flex gap-2"
                >
                  {closing ? '...' : 'Cerrar Torneo'} <Lock size={18}/>
                </button>
            </div>
        )}

        <div className={`${cardBg} rounded-2xl overflow-hidden shadow-2xl border border-green-500/30 mb-8`}>
           <div className="relative aspect-video bg-black">
             <video src={winner.url} controls className="w-full h-full object-contain" />
             <div className="absolute top-4 left-4 bg-green-500 text-white font-bold px-3 py-1 rounded shadow">#1 GANADOR</div>
           </div>
           <div className="p-6">
               <h2 className="text-2xl font-bold mb-1">{winner.title}</h2>
               <span className={`${accentText} font-bold flex items-center gap-1`}>
                   {votingMethod === 'ranking' ? <Star size={16}/> : <ThumbsUp size={16}/>} 
                   {stats[winner.id]?.totalScore} {votingMethod === 'ranking' ? 'Puntos' : 'Likes'}
               </span>
           </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <button onClick={() => downloadCSV('summary')} disabled={loadingGlobal} className={`${primaryButton} text-white font-bold py-4 rounded-xl flex justify-center gap-2 disabled:opacity-50`}>
             {loadingGlobal ? '...' : 'Descargar Ranking'} <Download size={20} />
          </button>
          <button onClick={() => downloadCSV('detailed')} disabled={loadingRaw} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl flex justify-center gap-2 disabled:opacity-50">
             {loadingRaw ? '...' : 'Descargar Dataset Detallado'} <FileSpreadsheet size={20} />
          </button>
        </div>

        <div className={`${cardBg} rounded-2xl shadow-xl border ${isOrange ? 'border-stone-700' : 'border-gray-700'} overflow-hidden mb-8`}>
          <div className={`p-6 border-b ${isOrange ? 'border-stone-700' : 'border-gray-700'}`}><h3 className="text-xl font-bold">Tabla de Posiciones</h3></div>
          <div className={`divide-y ${isOrange ? 'divide-stone-700' : 'divide-gray-700'}`}>
            {rankedVideos.map((video, index) => (
                <div key={video.id} className="p-4 flex items-center gap-4">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index===0?'bg-green-500 text-white': `${isOrange ? 'bg-stone-700' : 'bg-gray-700'} text-gray-400`}`}>{index+1}</div>
                  <div className="flex-1"><h4 className="font-medium text-white">{video.title}</h4></div>
                  <div className={`font-bold ${accentText}`}>{stats[video.id]?.totalScore} pts</div>
                </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center pb-8">
          <button onClick={() => window.location.reload()} className="flex gap-2 text-gray-400 hover:text-white"><Share2 size={16}/> Volver al Inicio</button>
        </div>
      </div>

      {/* MODAL DE ADVERTENCIA AL CERRAR */}
      {showCloseWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`${cardBg} border border-orange-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl transform scale-100`}>
             <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-orange-900/50 rounded-full text-orange-400">
                   <AlertTriangle size={24} />
                 </div>
                 <h3 className="text-xl font-bold text-white">¿Cerrar Votaciones?</h3>
               </div>
               <button onClick={() => setShowCloseWarning(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
             </div>
             
             <p className="text-gray-300 mb-6">
               Al cerrar el evento, <strong>nadie más podrá votar</strong>. <br/>
               Asegúrate de descargar los resultados antes de finalizar.
             </p>

             <div className="space-y-3 mb-6">
                <button onClick={() => downloadCSV('summary')} className={`w-full flex items-center justify-center gap-2 ${isOrange ? 'bg-orange-900/30 text-orange-300 border-orange-500/30 hover:bg-orange-900/50' : 'bg-indigo-900/30 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/50'} border py-3 rounded-lg font-bold text-sm`}>
                   <Download size={16} /> Descargar Ranking (Resumen)
                </button>
                <button onClick={() => downloadCSV('detailed')} className="w-full flex items-center justify-center gap-2 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 py-3 rounded-lg font-bold text-sm">
                   <FileSpreadsheet size={16} /> Descargar Dataset Detallado
                </button>
             </div>

             <div className="flex gap-3">
               <button 
                 onClick={() => setShowCloseWarning(false)}
                 className={`flex-1 py-3 text-gray-400 font-bold hover:text-white ${isOrange ? 'hover:bg-stone-700' : 'hover:bg-gray-700'} rounded-xl`}
               >
                 Cancelar
               </button>
               <button 
                 onClick={performCloseTournament}
                 disabled={closing}
                 className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex justify-center gap-2"
               >
                 {closing ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Confirmar Cierre'}
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResultsScreen;
