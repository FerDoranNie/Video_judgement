import React from 'react';
import { Tournament } from '../types';
import { Copy, Play, Share2, Trophy, Users } from 'lucide-react';

interface TournamentLobbyProps {
  tournament: Tournament;
  onStartVoting: () => void;
}

const TournamentLobby: React.FC<TournamentLobbyProps> = ({ tournament, onStartVoting }) => {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(tournament.id);
    alert("¡Código copiado al portapapeles!");
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
        
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-8 text-center">
          <div className="inline-block p-4 bg-white/10 rounded-full backdrop-blur mb-4">
            <Trophy className="w-12 h-12 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
          <p className="text-purple-200">Torneo Creado Exitosamente</p>
        </div>

        <div className="p-8 text-center space-y-8">
          
          <div>
            <p className="text-gray-400 mb-4 font-medium uppercase tracking-wider text-xs">Comparte este código con tus invitados</p>
            <div 
              onClick={handleCopyCode}
              className="bg-black/40 border-2 border-dashed border-gray-600 hover:border-purple-500 hover:bg-purple-500/10 transition-colors rounded-xl p-6 cursor-pointer group relative"
            >
              <span className="text-5xl md:text-6xl font-black tracking-widest text-white font-mono select-all">
                {tournament.id}
              </span>
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Copy className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Haz clic en el código para copiarlo</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left bg-gray-700/30 p-4 rounded-lg">
             <div>
               <p className="text-xs text-gray-500">Videos</p>
               <p className="font-bold text-xl">{tournament.videos.length}</p>
             </div>
             <div>
               <p className="text-xs text-gray-500">Creado</p>
               <p className="font-bold">{new Date(tournament.createdAt).toLocaleDateString()}</p>
             </div>
          </div>

          <button
            onClick={onStartVoting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] shadow-xl"
          >
            <Play className="w-6 h-6 fill-current" />
            Comenzar a Juzgar
          </button>
          
          <p className="text-xs text-gray-500">
            Puedes comenzar a votar ahora. Los invitados pueden unirse en cualquier momento usando el código.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TournamentLobby;