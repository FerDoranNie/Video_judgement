import React, { useState, useEffect } from 'react';
import { User, VideoItem, VoteRecord, Tournament } from './types';
import AuthScreen from './components/AuthScreen';
import UploadScreen from './components/UploadScreen';
import VotingArena from './components/VotingArena';
import ResultsScreen from './components/ResultsScreen';
import TournamentLobby from './components/TournamentLobby';

// Key for persisting tournaments dictionary
const TOURNAMENTS_STORAGE_KEY = 'juez_videos_tournaments';

function App() {
  const [user, setUser] = useState<User | null>(null);
  
  // The full dictionary of tournaments loaded from storage
  const [tournaments, setTournaments] = useState<Record<string, Tournament>>({});
  
  // The ID of the currently active tournament
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  
  // Videos active in the current user's session (shuffled copy of the tournament pool)
  const [sessionVideos, setSessionVideos] = useState<VideoItem[]>([]);
  
  // State to show the Lobby (only for admin right after creation)
  const [showLobby, setShowLobby] = useState(false);
  
  const [votingComplete, setVotingComplete] = useState(false);
  const [winner, setWinner] = useState<VideoItem | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);

  // Load existing tournaments on mount
  useEffect(() => {
    const saved = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
    if (saved) {
      try {
        setTournaments(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load tournaments", e);
      }
    }
  }, []);

  // Save tournaments whenever they change
  useEffect(() => {
    if (Object.keys(tournaments).length > 0) {
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(tournaments));
    }
  }, [tournaments]);

  // Shuffle logic
  const shuffleVideos = (array: VideoItem[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleLogin = (userData: User, tournamentCode?: string) => {
    if (userData.role === 'guest') {
      // Validate Code
      if (!tournamentCode || !tournaments[tournamentCode]) {
        alert("Error: Código de torneo no válido o no encontrado.");
        return;
      }
      
      const tournament = tournaments[tournamentCode];
      setUser(userData);
      setActiveTournamentId(tournament.id);
      setSessionVideos(shuffleVideos(tournament.videos));
      
    } else {
      // Admin Login
      setUser(userData);
      // Admin starts without a tournament, needs to create one
      setActiveTournamentId(null); 
    }
  };

  const handleAdminPublish = (name: string, uploadedVideos: VideoItem[]) => {
    // Generate a simple 5-char code (e.g., A7X2P)
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    const newTournament: Tournament = {
      id: code,
      name: name,
      hostId: user?.id || 'admin',
      videos: uploadedVideos,
      createdAt: Date.now()
    };

    // Save to state (which triggers LS save)
    setTournaments(prev => ({
      ...prev,
      [code]: newTournament
    }));

    setActiveTournamentId(code);
    setShowLobby(true); // Show the share code screen
  };

  const handleStartVotingFromLobby = () => {
    if (activeTournamentId && tournaments[activeTournamentId]) {
      const t = tournaments[activeTournamentId];
      setSessionVideos(shuffleVideos(t.videos));
      setShowLobby(false);
    }
  };

  const handleVotingComplete = (winners: VideoItem[], history: VoteRecord[]) => {
    setWinner(winners[0]); 
    setVoteHistory(history);
    setVotingComplete(true);
  };

  // --- RENDER FLOW ---

  // 1. Auth Step
  if (!user) {
    return (
      <AuthScreen 
        onLogin={handleLogin} 
      />
    );
  }

  // 2. Upload/Creation Step (Only for Admin if no active tournament yet)
  if (user.role === 'admin' && !activeTournamentId) {
    return <UploadScreen onPublish={handleAdminPublish} />;
  }

  // 3. Lobby (Admin only, right after creation)
  if (user.role === 'admin' && showLobby && activeTournamentId) {
    return (
      <TournamentLobby 
        tournament={tournaments[activeTournamentId]} 
        onStartVoting={handleStartVotingFromLobby} 
      />
    );
  }

  // 5. Results Step
  if (votingComplete && winner) {
    return (
      <ResultsScreen 
        winner={winner} 
        history={voteHistory} 
        allVideos={sessionVideos} // Pass the full original list for stats
      />
    );
  }

  // 4. Voting Step
  if (sessionVideos.length > 0) {
    return (
      <VotingArena 
        videos={sessionVideos} 
        userId={user.id} 
        onComplete={handleVotingComplete} 
      />
    );
  }

  // Fallback
  return <div className="text-white p-10">Cargando...</div>;
}

export default App;