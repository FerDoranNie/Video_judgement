import React, { useEffect, useState } from 'react';
import { VideoItem, VoteRecord } from '../types';
import { Trophy, Share2, Download, Users, ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '../services/api';

interface ResultsScreenProps {
  winner?: VideoItem | null; 
  history: VoteRecord[];
  allVideos: VideoItem[];
  tournamentCode: string;
  hostName: string; // Nuevo prop para el nombre del creador
}

interface VideoStats {
  totalLikes: number;
  totalDislikes: number;
  voteCount: number;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ winner: initialWinner, history, allVideos, tournamentCode, hostName }) => {
  const [rankedVideos, setRankedVideos] = useState<VideoItem[]>([]);
  const [stats, setStats] = useState<Record<string, VideoStats>>({});
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  
  // Cálculo local inicial
  useEffect(() => {
    const localStats: Record<string, VideoStats> = {};
    allVideos.forEach(v => {
      localStats[v.id] = { totalLikes: 0, totalDislikes: 0, voteCount: 0 };
    });
    
    // Sumar likes/dislikes del historial local
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
      // Ordenar por Total Likes descendente
      if (statsB.totalLikes !== statsA.totalLikes) {
        return statsB.totalLikes - statsA.totalLikes;
      }
      // Desempate por menos dislikes
      return statsA.totalDislikes - statsB.totalDislikes;
    });

    setRankedVideos(sorted);
  }, [history, allVideos]);

  // Si no viene un winner desde props (caso raro), usamos el primero del ranking calculado
  const winner = initialWinner || (rankedVideos.length > 0 ? rankedVideos[0] : null);

  const downloadGlobalCSV = async () => {
    setLoadingGlobal(true);
    try {
      let votes: VoteRecord[] = [];
      let isLocalFallback = false;

      // 1. Intentar obtener datos globales del servidor
      try {
        const response = await api.getGlobalResults(tournamentCode);
        votes = response.votes;
      } catch (e) {
        console.warn("Fallo al obtener globales, usando fallback");
      }

      // 2. Lógica de Fallback Inteligente
      // Si el servidor no tiene votos suficientes, usamos los locales.
      if (!votes || votes.length < history.length) {
        console.warn("Datos globales insuficientes. Usando historial local para el reporte.");
        votes = history; // Usamos los votos de la sesión actual
        isLocalFallback = true;
      }

      // Fallback final: si aún así está vacío (usuario no votó nada?), intentamos no fallar
      if (!votes || votes.length === 0) {
        alert("No hay votos registrados para generar el archivo.");
        setLoadingGlobal(false);
        return;
      }

      // 3. Calcular Estadísticas para el CSV
      const globalStats: Record<string, VideoStats> = {};
      
      allVideos.forEach(v => {
        globalStats[v.id] = { totalLikes: 0, totalDislikes: 0, voteCount: 0 };
      });

      votes.forEach(vote => {
        if (globalStats[vote.videoId]) {
          globalStats[vote.videoId].voteCount += 1;
          if (vote.liked) {
            globalStats[vote.videoId].totalLikes += 1;
          } else {
            globalStats[vote.videoId].totalDislikes += 1;
          }
        }
      });

      const sortedVideosForCSV = [...allVideos].sort((a, b) => {
        const statA = globalStats[a.id] || { totalLikes: 0 };
        const statB = globalStats[b.id] || { totalLikes: 0 };
        return statB.totalLikes - statA.totalLikes;
      });

      // 4. Generar contenido CSV
      // Se agregó 'Creado Por' a los headers
      const headers = ['Ranking', 'Titulo Video', 'Total Likes', 'Total Dislikes', 'Votos Totales', '% Aceptacion', 'Fuente', 'Creado Por'];
      
      const rows = sortedVideosForCSV.map((v, i) => {
        const s = globalStats[v.id] || { totalLikes: 0, totalDislikes: 0, voteCount: 0 };
        const likePct = s.voteCount > 0 ? ((s.totalLikes / s.voteCount) * 100).toFixed(0) + '%' : "0%";
        
        return [
          `${i + 1}`, 
          `"${v.title.replace(/"/g, '""')}"`,
          `${s.totalLikes}`,
          `${s.totalDislikes}`,
          `${s.voteCount}`,
          `${likePct}`,
          isLocalFallback ? 'LOCAL (Tu Dispositivo)' : 'GLOBAL (Servidor)',
          `"${hostName.replace(/"/g, '""')}"` // Agregamos el nombre del creador
        ];
      });

      const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `RESULTADOS_${isLocalFallback ? 'LOCAL' : 'GLOBAL'}_${tournamentCode}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error(error);
      alert("Error inesperado al generar el archivo.");
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Si winner aún es null (ej. primera renderización antes del useEffect), mostramos carga
  if (!winner) {
    // Si tenemos videos pero no winner, es cuestión de milisegundos para el useEffect
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
          <p className="text-gray-400">Torneo creado por: <span className="text-white font-bold">{hostName}</span></p>
        </div>

        {/* Winner Showcase */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-green-500/30 mb-8 transform hover:scale-[1.01] transition duration-500">
           <div className="relative aspect-video bg-black">
             <video src={winner.url} controls className="w-full h-full object-contain" />
             <div className="absolute top-4 left-4 bg-green-500 text-white font-bold px-3 py-1 rounded shadow">
               #1 GANADOR
             </div>
           </div>
           <div className="p-6 flex flex-wrap justify-between items-center gap-4">
             <div>
               <h2 className="text-2xl font-bold mb-1">{winner.title}</h2>
               <div className="flex gap-4 text-sm text-gray-300">
                 <span className="flex items-center gap-1 text-green-400 font-bold bg-green-900/30 px-2 py-1 rounded">
                   <ThumbsUp size={16} /> {stats[winner.id]?.totalLikes || 0} Likes
                 </span>
                 <span className="flex items-center gap-1 text-red-400 bg-red-900/20 px-2 py-1 rounded">
                   <ThumbsDown size={16} /> {stats[winner.id]?.totalDislikes || 0}
                 </span>
               </div>
             </div>
             <div className="text-5xl font-black text-gray-700">#1</div>
           </div>
        </div>

        {/* Action Area */}
        <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-2xl p-6 mb-8 text-center">
           <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
             <Users className="text-indigo-400"/> Exportar Datos
           </h3>
           <p className="text-sm text-gray-400 mb-6">
             Descarga el archivo CSV compatible con Excel con los votos totales.
           </p>
           <button 
            onClick={downloadGlobalCSV}
            disabled={loadingGlobal}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingGlobal ? 'Generando...' : 'Descargar Resultados (CSV)'}
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Ranking List */}
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold">Tabla de Posiciones</h3>
            <span className="text-sm text-gray-500">Votos Totales: {history.length}</span>
          </div>
          <div className="divide-y divide-gray-700">
            {rankedVideos.map((video, index) => {
              const s = stats[video.id] || { totalLikes: 0, totalDislikes: 0 };
              const totalVotes = s.totalLikes + s.totalDislikes;
              const pct = totalVotes > 0 ? Math.round((s.totalLikes / totalVotes) * 100) : 0;

              return (
                <div key={video.id} className="p-4 flex items-center gap-4 hover:bg-gray-750 transition">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-green-500 text-white' : index < 3 ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{video.title}</h4>
                    <div className="w-24 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
                       <div className="bg-green-500 h-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end min-w-[80px]">
                     <span className="block font-bold text-green-400 text-lg flex items-center gap-1">
                       <ThumbsUp size={14} /> {s.totalLikes}
                     </span>
                     <span className="text-xs text-gray-500">
                       {pct}% Aceptación
                     </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
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