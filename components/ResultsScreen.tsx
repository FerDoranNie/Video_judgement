import React, { useEffect, useState } from 'react';
import { VideoItem, VoteRecord } from '../types';
import { Trophy, Share2, Cloud } from 'lucide-react';

interface ResultsScreenProps {
  winner: VideoItem;
  history: VoteRecord[];
  allVideos: VideoItem[];
  tournamentCode: string;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ winner, history, allVideos, tournamentCode }) => {
  const [top10, setTop10] = useState<VideoItem[]>([]);
  
  useEffect(() => {
    // Calculate Rankings based on "Wins" locally
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

    // Ensure the actual tournament winner is #1 locally
    const finalSorted = [
      winner, 
      ...sorted.filter(v => v.id !== winner.id)
    ].slice(0, 10);

    setTop10(finalSorted);
  }, [winner, history, allVideos]);

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
    link.setAttribute("download", `resultados_${tournamentCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert("Resultados descargados en CSV.");
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
            ¡Ganador Elegido!
          </h1>
          <p className="text-gray-400">Tu veredicto personal ha sido registrado.</p>
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
             <p className="text-gray-400">Ganador de tu bracket personal.</p>
           </div>
        </div>

        {/* Top 10 List */}
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold">Tu Top 10</h3>
            <span className="text-sm text-gray-500">Basado en tus duelos</span>
          </div>
          <div className="divide-y divide-gray-700">
            {top10.map((video, index) => (
              <div key={video.id} className="p-4 flex items-center gap-4 hover:bg-gray-750 transition">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-yellow-500 text-black' : index < 3 ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white">{video.title}</h4>
                </div>
                <div className="text-right">
                   <span className="block font-bold text-indigo-400">
                     {history.filter(h => h.winnerId === video.id).length} Wins
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
            Descargar mis Resultados
          </button>
          <button 
             onClick={() => window.location.reload()}
             className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            <Share2 className="w-5 h-5" />
            Volver al Inicio
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResultsScreen;