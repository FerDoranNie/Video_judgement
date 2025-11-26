import React, { useEffect, useState } from 'react';
import { VideoItem, VoteRecord } from '../types';
import { Trophy, Share2, Sparkles, FileSpreadsheet, Cloud } from 'lucide-react';
import { generateTop10Summary } from '../services/geminiService';

interface ResultsScreenProps {
  winner: VideoItem;
  history: VoteRecord[];
  allVideos: VideoItem[];
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ winner, history, allVideos }) => {
  const [top10, setTop10] = useState<VideoItem[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('Generando análisis de la IA...');
  
  useEffect(() => {
    // Calculate Rankings based on "Wins"
    const winCounts: Record<string, number> = {};
    allVideos.forEach(v => winCounts[v.id] = 0);
    
    history.forEach(vote => {
      if (winCounts[vote.winnerId] !== undefined) {
        winCounts[vote.winnerId]++;
      }
    });

    // Sort by wins descending
    const sorted = [...allVideos].sort((a, b) => {
      const winsA = winCounts[a.id] || 0;
      const winsB = winCounts[b.id] || 0;
      return winsB - winsA;
    });

    // Ensure the actual tournament winner is #1
    const finalSorted = [
      winner, 
      ...sorted.filter(v => v.id !== winner.id)
    ].slice(0, 10);

    setTop10(finalSorted);

    // Call AI Summary
    generateTop10Summary(finalSorted, history.length).then(setAiSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, history]);

  const exportToSheets = () => {
    // Mocking the Google Sheets CSV structure
    const headers = ['Rango', 'Titulo de Video', 'ID de Video', 'Total Victorias'];
    const rows = top10.map((v, i) => {
       const wins = history.filter(h => h.winnerId === v.id).length;
       return [`${i + 1}`, v.title, v.id, `${wins}`];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resultados_torneo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert("¡Resultados exportados! Esto simula guardar en tu carpeta pública de Google Sheets.");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-yellow-500 rounded-full shadow-2xl mb-4">
             <Trophy className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
            Torneo Completado
          </h1>
          <p className="text-gray-400">Los jueces han dictado sentencia.</p>
        </div>

        {/* Winner Showcase */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-yellow-500/30 mb-8 transform hover:scale-[1.01] transition duration-500">
           <div className="relative aspect-video bg-black">
             <video src={winner.url} controls className="w-full h-full object-contain" />
             <div className="absolute top-4 left-4 bg-yellow-500 text-black font-bold px-3 py-1 rounded shadow">
               #1 CAMPEÓN
             </div>
           </div>
           <div className="p-6">
             <h2 className="text-2xl font-bold mb-2">{winner.title}</h2>
             <p className="text-gray-400">Ganador indiscutible del torneo.</p>
           </div>
        </div>

        {/* AI Summary */}
        <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-indigo-300">Análisis del Juez Gemini</h3>
          </div>
          <p className="text-gray-200 leading-relaxed italic">
            "{aiSummary}"
          </p>
        </div>

        {/* Top 10 List */}
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold">Top 10 Clasificación</h3>
            <span className="text-sm text-gray-500">Ordenado por Victorias</span>
          </div>
          <div className="divide-y divide-gray-700">
            {top10.map((video, index) => (
              <div key={video.id} className="p-4 flex items-center gap-4 hover:bg-gray-750 transition">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-yellow-500 text-black' : index < 3 ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                  {index + 1}
                </div>
                {video.thumbnail ? (
                  <img 
                    src={video.thumbnail} 
                    alt={video.title} 
                    className="w-16 h-12 object-cover rounded bg-gray-900"
                  />
                ) : (
                  <div className="w-16 h-12 bg-black rounded flex items-center justify-center">
                     <span className="text-xs text-gray-600">VIDEO</span>
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-white">{video.title}</h4>
                  <p className="text-xs text-gray-500">ID: {video.id}</p>
                </div>
                <div className="text-right">
                   <span className="block font-bold text-indigo-400">
                     {history.filter(h => h.winnerId === video.id).length} Victorias
                   </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={exportToSheets}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            <Cloud className="w-5 h-5" />
            Guardar en Drive (CSV)
          </button>
          <button 
             onClick={() => window.location.reload()}
             className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            <Share2 className="w-5 h-5" />
            Nueva Sesión
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResultsScreen;