
import React, { useEffect, useState } from 'react';
import { VideoItem, VoteRecord } from '../types';
import { Trophy, Share2, Download, ThumbsUp, FileSpreadsheet, Lock, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

interface ResultsScreenProps {
  winner?: VideoItem | null; 
  history: VoteRecord[];
  allVideos: VideoItem[];
  tournamentCode: string;
  hostName: string;
  isHost?: boolean; // Nuevo: Saber si quien ve esto es el admin
  isActive?: boolean; // Nuevo: Estado del torneo
}

interface VideoStats {
  totalLikes: number;
  totalDislikes: number;
  voteCount: number;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ winner: initialWinner, history, allVideos, tournamentCode, hostName, isHost, isActive: initialActive }) => {
  const [rankedVideos, setRankedVideos] = useState<VideoItem[]>([]);
  const [stats, setStats] = useState<Record<string, VideoStats>>({});
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingRaw, setLoadingRaw] = useState(false);
  
  const [tournamentActive, setTournamentActive] = useState(initialActive);
  const [closing, setClosing] = useState(false);

  // Cálculo local
  useEffect(() => {
    const localStats: Record<string, VideoStats> = {};
    allVideos.forEach(v => {
      localStats[v.id] = { totalLikes: 0, totalDislikes: 0, voteCount: 0 };
    });
    
    history.forEach(vote => {
      if (localStats[vote.videoId]) {
        localStats[vote.videoId].voteCount += 1;
        if (vote.liked) {
          localStats[vote.videoId].totalLikes += 1;
        } else {
          localStats[vote.videoId].totalDislikes += 1;
        }
      }
    });

    setStats(localStats);

    const sorted = [...allVideos].sort((a, b) => {
      const statsA = localStats[a.id];
      const statsB = localStats[b.id];
      if (statsB.totalLikes !== statsA.totalLikes) {
        return statsB.totalLikes - statsA.totalLikes;
      }
      return statsA.totalDislikes - statsB.totalDislikes;
    });

    setRankedVideos(sorted);
  }, [history, allVideos]);

  const winner = initialWinner || (rankedVideos.length > 0 ? rankedVideos[0] : null);

  const handleCloseTournament = async () => {
    if (!confirm("¿Estás seguro de cerrar el evento?\n\nNadie más podrá entrar a votar usando este código. Esta acción no se puede deshacer fácilmente.")) return;
    
    setClosing(true);
    try {
        await api.closeTournament(tournamentCode);
        setTournamentActive(false);
        alert("Torneo cerrado exitosamente. Ya no se aceptan nuevos jueces.");
    } catch (e) {
        alert("Error al cerrar torneo");
    } finally {
        setClosing(false);
    }
  };

  const downloadCSV = async (mode: 'summary' | 'detailed') => {
    const setLoading = mode === 'summary' ? setLoadingGlobal : setLoadingRaw;
    setLoading(true);

    try {
      let votes: VoteRecord[] = [];
      let isLocalFallback = false;

      // Intentar obtener datos globales de Firestore
      try {
        const response = await api.getGlobalResults(tournamentCode);
        votes = response.votes;
      } catch (e) {
        console.warn("Fallo al conectar con la base de datos", e);
      }

      // Fallback
      if (!votes || votes.length === 0) {
        votes = history;
        isLocalFallback = true;
      }

      if (votes.length === 0) {
        alert("No hay datos para exportar.");
        setLoading(false);
        return;
      }

      let csvContent = "";
      let filename = "";

      if (mode === 'summary') {
        const globalStats: Record<string, VideoStats> = {};
        allVideos.forEach(v => { globalStats[v.id] = { totalLikes: 0, totalDislikes: 0, voteCount: 0 }; });

        votes.forEach(vote => {
          if (globalStats[vote.videoId]) {
            globalStats[vote.videoId].voteCount += 1;
            if (vote.liked) globalStats[vote.videoId].totalLikes += 1;
            else globalStats[vote.videoId].totalDislikes += 1;
          }
        });

        const sorted = [...allVideos].sort((a, b) => {
          return (globalStats[b.id]?.totalLikes || 0) - (globalStats[a.id]?.totalLikes || 0);
        });

        const headers = ['Ranking', 'Titulo Video', 'Total Likes', 'Total Dislikes', '% Aceptacion', 'Fuente'];
        const rows = sorted.map((v, i) => {
          const s = globalStats[v.id];
          const likePct = s.voteCount > 0 ? ((s.totalLikes / s.voteCount) * 100).toFixed(0) + '%' : "0%";
          return [
            `${i + 1}`, `"${v.title.replace(/"/g, '""')}"`, `${s.totalLikes}`, `${s.totalDislikes}`, `${likePct}`,
            isLocalFallback ? 'LOCAL' : 'CLOUD'
          ];
        });
        csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        filename = `RANKING_GLOBAL_${tournamentCode}.csv`;

      } else {
        const headers = ['Codigo Torneo', 'Fecha', 'Nombre Usuario', 'Usuario ID', 'Video ID', 'Titulo Video', 'Voto (Liked)'];
        const videoTitles: Record<string, string> = {};
        allVideos.forEach(v => videoTitles[v.id] = v.title);

        const rows = votes.map(v => {
          return [
            tournamentCode,
            new Date(v.timestamp).toISOString(),
            `"${(v.username || 'Anonimo').replace(/"/g, '""')}"`, 
            `"${v.userId}"`, 
            `"${v.videoId}"`,
            `"${(videoTitles[v.videoId] || 'Video Desconocido').replace(/"/g, '""')}"`,
            v.liked ? 'LIKE' : 'DISLIKE'
          ];
        });
        
        csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        filename = `DETALLE_VOTOS_${tournamentCode}.csv`;
      }

      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error(error);
      alert("Error al generar reporte.");
    } finally {
      setLoading(false);
    }
  };

  if (!winner) {
    if (allVideos.length > 0) return <div className="p-10 text-white">Calculando ranking...</div>;
    return <div className="p-10 text-white">No hay datos para mostrar.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-green-500 rounded-full shadow-2xl mb-4">
             <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
            Resultados Finales
          </h1>
          
          {/* Status Badge */}
          <div className="mt-4 flex justify-center">
             {tournamentActive !== false ? (
                 <span className="bg-green-900/50 text-green-400 border border-green-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle size={14} /> Torneo Activo (Recibiendo votos)
                 </span>
             ) : (
                 <span className="bg-red-900/50 text-red-400 border border-red-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Lock size={14} /> Torneo Finalizado
                 </span>
             )}
          </div>
        </div>

        {/* CONTROLES DE ADMIN (CERRAR TORNEO) */}
        {isHost && tournamentActive !== false && (
            <div className="mb-8 bg-orange-900/20 border border-orange-500/30 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-left">
                    <h3 className="font-bold text-orange-200 text-lg">Administrar Evento</h3>
                    <p className="text-sm text-gray-400">Cuando termines, cierra el torneo para que nadie más pueda votar.</p>
                </div>
                <button 
                    onClick={handleCloseTournament}
                    disabled={closing}
                    className="whitespace-nowrap bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition"
                >
                    {closing ? 'Cerrando...' : 'Cerrar Torneo'}
                    <Lock size={18} />
                </button>
            </div>
        )}

        {/* Winner Showcase */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-green-500/30 mb-8 transform hover:scale-[1.01] transition duration-500">
           <div className="relative aspect-video bg-black">
             <video src={winner.url} controls className="w-full h-full object-contain" />
             <div className="absolute top-4 left-4 bg-green-500 text-white font-bold px-3 py-1 rounded shadow">
               #1 MÁS VOTADO
             </div>
           </div>
           <div className="p-6 flex flex-wrap justify-between items-center gap-4">
             <div>
               <h2 className="text-2xl font-bold mb-1">{winner.title}</h2>
               <div className="flex gap-4 text-sm text-gray-300">
                 <span className="flex items-center gap-1 text-green-400 font-bold bg-green-900/30 px-2 py-1 rounded">
                   <ThumbsUp size={16} /> {stats[winner.id]?.totalLikes || 0} Likes
                 </span>
               </div>
             </div>
             <div className="text-5xl font-black text-gray-700">#1</div>
           </div>
        </div>

        {/* Action Area */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Botón Resumen */}
          <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-2xl p-6 text-center">
             <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
               <Trophy className="text-indigo-400"/> Ranking Global
             </h3>
             <p className="text-sm text-gray-400 mb-4">
               Descarga la tabla de posiciones consolidada.
             </p>
             <button 
              onClick={() => downloadCSV('summary')}
              disabled={loadingGlobal}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg disabled:opacity-50"
            >
              {loadingGlobal ? '...' : 'Descargar Ranking'}
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Botón Detallado (Homologación) */}
          <div className="bg-purple-900/40 border border-purple-500/30 rounded-2xl p-6 text-center">
             <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
               <FileSpreadsheet className="text-purple-400"/> Dataset Detallado
             </h3>
             <p className="text-sm text-gray-400 mb-4">
               Descarga todos los votos individuales para analizar por usuario.
             </p>
             <button 
              onClick={() => downloadCSV('detailed')}
              disabled={loadingRaw}
              className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg disabled:opacity-50"
            >
              {loadingRaw ? '...' : 'Descargar Dataset'}
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ranking List Visual */}
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold">Tabla de Posiciones (Tu Sesión)</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {rankedVideos.map((video, index) => {
              const s = stats[video.id] || { totalLikes: 0, totalDislikes: 0 };
              
              return (
                <div key={video.id} className="p-4 flex items-center gap-4">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{video.title}</h4>
                  </div>
                  <div className="text-right">
                     <span className="block font-bold text-green-400 flex items-center gap-1 justify-end">
                       <ThumbsUp size={14} /> {s.totalLikes}
                     </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center pb-8">
          <button 
             onClick={() => window.location.reload()}
             className="flex items-center justify-center gap-2 text-gray-400 hover:text-white font-medium py-3 px-6 transition"
          >
            <Share2 className="w-4 h-4" />
            Volver al Inicio
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResultsScreen;
