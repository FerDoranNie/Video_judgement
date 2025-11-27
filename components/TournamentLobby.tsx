import React from 'react';
import { Tournament } from '../types';
import { Copy, Play, Share2, Trophy, Users, WifiOff } from 'lucide-react';
import { api } from '../services/api';

interface TournamentLobbyProps {
  tournament: Tournament;
  onStartVoting: () => void;
}

const TournamentLobby: React.FC<TournamentLobbyProps> = ({ tournament, onStartVoting }) => {
  const isOffline = api.isOffline;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tournament.id);
    alert("¡Código copiado al portapapeles!");
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
        
        <div className={`p-8 text-center bg-gradient-to-r ${isOffline ? 'from-red-900 to-orange-900' : 'from-purple-900 to-indigo-900'}`}>
          <div className="inline-block p-4 bg-white/10 rounded-full backdrop-blur mb-4">
            <Trophy className="w-12 h-12 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
          <p className="text-purple-200">
            {isOffline ? 'Torneo Creado (MODO LOCAL)' : 'Torneo Creado Exitosamente'}
          </p>
        </div>

        {isOffline && (
          <div className="bg-red-900/50 border-l-4 border-red-500 p-4 mx-8 mt-6 text-left flex items-start gap-3">
             <WifiOff className="w-6 h-6 text-red-400 flex-none" />
             <div>
               <h3 className="font-bold text-red-200">Advertencia de Conexión</h3>
               <p className="text-sm text-gray-300 mt-1">
                 No se pudo conectar con el servidor. Este torneo solo existe en <strong>este dispositivo</strong>. 
                 <br/>
                 Los códigos no funcionarán en otros celulares o computadoras hasta que inicies el servidor (`npm start`).
               </p>
             </div>
          </div>
        )}

        <div className="p-8 text-center space-y-8">
          
          <div>
            <p className="text-gray-400 mb-4 font-medium uppercase tracking-wider text-xs">Comparte este código con tus invitados</p>
            <div 
              onClick={handleCopyCode}
              className={`border-2 border-dashed transition-colors rounded-xl p-6 cursor-pointer group relative ${isOffline ? 'bg-red-900/10 border-red-800 hover:border-red-500' : 'bg-black/40 border-gray-600 hover:border-purple-500 hover:bg-purple-500/10'}`}
            >
              <span className="text-5xl md:text-6xl font-black tracking-widest text-white font-mono select-all">
                {tournament.id}
              </span>
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Copy className={`w-6 h-6 ${isOffline ? 'text-red-400' : 'text-purple-400'}`} />
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
            className={`w-full py-4 text-white font-bold rounded-xl text-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] shadow-xl ${isOffline ? 'bg-gray-600 hover:bg-gray-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
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