import React, { useState } from 'react';
import { User, VideoItem, VoteRecord, Tournament } from './types';
import AuthScreen from './components/AuthScreen';
import UploadScreen from './components/UploadScreen';
import VotingArena from './components/VotingArena';
import ResultsScreen from './components/ResultsScreen';
import TournamentLobby from './components/TournamentLobby';
import { api } from './services/api';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  
  // Videos active in the current user's session
  const [sessionVideos, setSessionVideos] = useState<VideoItem[]>([]);
  
  const [showLobby, setShowLobby] = useState(false);
  
  const [votingComplete, setVotingComplete] = useState(false);
  const [winner, setWinner] = useState<VideoItem | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Procesando...');

  const shuffleVideos = (array: VideoItem[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleLogin = async (userData: User, tournamentCode?: string) => {
    if (userData.role === 'guest') {
      if (!tournamentCode) {
        alert("Error: Código de torneo requerido.");
        return;
      }
      
      setLoading(true);
      setStatusMessage("Buscando torneo...");
      try {
        const t = await api.getTournament(tournamentCode);
        setTournament(t);
        setUser(userData);
        setSessionVideos(shuffleVideos(t.videos));
      } catch (e) {
        alert("No se encontró el torneo. Verifica el código.");
        console.error(e);
      } finally {
        setLoading(false);
        setStatusMessage("");
      }
      
    } else {
      // Admin Login
      setUser(userData);
      setTournament(null); 
    }
  };

  const handleAdminPublish = async (name: string, videos: VideoItem[]) => {
    setLoading(true);
    setStatusMessage("Conectando con el servidor...");
    try {
      // Ahora enviamos URLs y el nombre del creador (hostName)
      const newTournament = await api.createTournament(
        name, 
        user?.id || 'admin', 
        videos, 
        user?.username // Pasamos el nombre del usuario logueado
      );
      setStatusMessage("¡Torneo creado!");
      
      setTournament(newTournament);
      setShowLobby(true);
      
      // Actualizar URL del navegador para que el Admin pueda copiarla fácilmente
      const url = new URL(window.location.href);
      url.searchParams.set('code', newTournament.id);
      window.history.pushState({}, '', url);

    } catch (e: any) {
      // Mostrar el error real del backend de forma amigable
      const msg = e.message || "Error desconocido";
      
      alert(`Ups! Hubo un problema: ${msg}`);
      console.error("Detalle del error:", e);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleStartVotingFromLobby = () => {
    if (tournament) {
      setSessionVideos(shuffleVideos(tournament.videos));
      setShowLobby(false);
    }
  };

  const handleVotingComplete = (winners: VideoItem[], history: VoteRecord[]) => {
    setWinner(winners[0] || null); 
    setVoteHistory(history);
    setVotingComplete(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 animate-pulse text-lg">{statusMessage}</p>
        </div>
      </div>
    );
  }

  // 1. Auth Step
  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // 2. Upload/Creation Step (Admin)
  if (user.role === 'admin' && !tournament) {
    return <UploadScreen onPublish={handleAdminPublish} />;
  }

  // 3. Lobby (Admin)
  if (user.role === 'admin' && showLobby && tournament) {
    return (
      <TournamentLobby 
        tournament={tournament} 
        onStartVoting={handleStartVotingFromLobby} 
      />
    );
  }

  // 5. Results Step
  if (votingComplete && tournament) {
    return (
      <ResultsScreen 
        winner={winner} 
        history={voteHistory} 
        allVideos={sessionVideos} 
        tournamentCode={tournament.id}
        hostName={tournament.hostName || "Admin"} // Pasamos el nombre del creador
      />
    );
  }

  // 4. Voting Step
  if (sessionVideos.length > 0 && tournament) {
    return (
      <VotingArena 
        videos={sessionVideos} 
        userId={user.id} 
        tournamentCode={tournament.id}
        onComplete={handleVotingComplete} 
      />
    );
  }

  return <div className="text-white p-10">Cargando aplicación...</div>;
}

export default App;