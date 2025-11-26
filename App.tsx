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
  
  // Videos active in the current user's session (shuffled copy of the tournament pool)
  const [sessionVideos, setSessionVideos] = useState<VideoItem[]>([]);
  
  // State to show the Lobby (only for admin right after creation)
  const [showLobby, setShowLobby] = useState(false);
  
  const [votingComplete, setVotingComplete] = useState(false);
  const [winner, setWinner] = useState<VideoItem | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Shuffle logic
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
      }
      
    } else {
      // Admin Login
      setUser(userData);
      // Admin starts without a tournament, needs to create one
      setTournament(null); 
    }
  };

  const handleAdminPublish = async (name: string, uploadedVideos: VideoItem[]) => {
    setLoading(true);
    try {
      const newTournament = await api.createTournament(name, user?.id || 'admin', uploadedVideos);
      setTournament(newTournament);
      setShowLobby(true);
    } catch (e) {
      alert("Error al crear el torneo. Intenta de nuevo.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVotingFromLobby = () => {
    if (tournament) {
      setSessionVideos(shuffleVideos(tournament.videos));
      setShowLobby(false);
    }
  };

  const handleVotingComplete = (winners: VideoItem[], history: VoteRecord[]) => {
    setWinner(winners[0]); 
    setVoteHistory(history);
    setVotingComplete(true);
  };

  // --- RENDER FLOW ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
      </div>
    );
  }

  // 1. Auth Step
  if (!user) {
    return (
      <AuthScreen 
        onLogin={handleLogin} 
      />
    );
  }

  // 2. Upload/Creation Step (Only for Admin if no active tournament yet)
  if (user.role === 'admin' && !tournament) {
    return <UploadScreen onPublish={handleAdminPublish} />;
  }

  // 3. Lobby (Admin only, right after creation)
  if (user.role === 'admin' && showLobby && tournament) {
    return (
      <TournamentLobby 
        tournament={tournament} 
        onStartVoting={handleStartVotingFromLobby} 
      />
    );
  }

  // 5. Results Step
  if (votingComplete && winner && tournament) {
    return (
      <ResultsScreen 
        winner={winner} 
        history={voteHistory} 
        allVideos={sessionVideos} // Pass session videos for local context, or tournament.videos for global
        tournamentCode={tournament.id}
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

  // Fallback
  return <div className="text-white p-10">Cargando aplicación...</div>;
}

export default App;