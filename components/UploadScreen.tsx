import React, { useState } from 'react';
import { VideoItem } from '../types';
import { Link, Plus, Trash2, Share2, ExternalLink, Loader2, Info } from 'lucide-react';
import { MOCK_VIDEOS } from '../services/mockData';

interface UploadScreenProps {
  onPublish: (name: string, videos: VideoItem[]) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onPublish }) => {
  const [tournamentName, setTournamentName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Función inteligente para convertir links de Drive/Youtube
  const parseLink = (inputUrl: string): { url: string, type: 'drive' | 'youtube' | 'direct' } => {
    let url = inputUrl.trim();
    
    // Detectar Google Drive
    // Patrón robusto para detectar ID de drive en /view, /preview, /file/d/, etc.
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    
    if (driveMatch && (url.includes('drive.google.com') || url.includes('googleusercontent'))) {
      const id = driveMatch[1];
      // Intentamos usar el link de descarga directa primero para <video>, 
      // si falla, el componente VideoCard hará fallback al modo embed usando el ID.
      return { 
        url: `https://drive.google.com/uc?export=download&id=${id}`,
        type: 'drive'
      };
    }

    return { url, type: 'direct' };
  };

  const handleAddLink = () => {
    if (!urlInput.trim()) return;

    // MEJORA: Separar por saltos de línea (\n), espacios (\s) o comas (,)
    // Esto soluciona el problema de que solo se detecte un video si están pegados seguidos.
    const lines = urlInput.split(/[\n\s,]+/);
    const newVideos: VideoItem[] = [];

    lines.forEach(line => {
      // Ignorar líneas vacías o muy cortas
      if (!line || line.trim().length < 5) return;
      
      const { url, type } = parseLink(line);
      
      newVideos.push({
        id: crypto.randomUUID(),
        title: `Video ${videos.length + newVideos.length + 1}`,
        url: url,
        thumbnail: '',
        driveId: type === 'drive' ? 'drive-linked' : undefined
      });
    });

    if (newVideos.length === 0) {
      alert("No se detectaron enlaces válidos. Asegúrate de pegarlos correctamente.");
      return;
    }

    setVideos(prev => [...prev, ...newVideos]);
    setUrlInput('');
  };

  const handleRemove = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const handleTitleChange = (id: string, newTitle: string) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, title: newTitle } : v));
  };

  const handlePublish = () => {
    if (!tournamentName.trim()) { alert("Ponle nombre al torneo"); return; }
    if (videos.length < 2) { alert("Agrega al menos 2 videos para crear un torneo."); return; }
    
    setIsPublishing(true);
    // Enviamos directamente los links al backend
    onPublish(tournamentName, videos);
  };

  const loadDemo = () => {
    setTournamentName("Demo Enlaces Públicos");
    setVideos(MOCK_VIDEOS);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-900 text-white p-6 pb-24">
      <div className="w-full max-w-4xl">
        
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-900/30 rounded-full mb-4">
            <Link className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Configurar Torneo</h1>
          <p className="text-gray-400">
            Pega los enlaces de tus videos (Google Drive público).
          </p>
        </div>

        {/* Nombre Torneo */}
        <div className="mb-8">
           <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del Evento</label>
           <input 
             type="text" 
             value={tournamentName}
             onChange={e => setTournamentName(e.target.value)}
             className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
             placeholder="Ej. Mejores Comerciales 2024"
           />
        </div>

        {/* Input Links */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
           <label className="block text-sm font-medium text-gray-400 mb-2">Enlaces de Video</label>
           
           <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4 flex items-start gap-3">
             <Info className="w-5 h-5 text-blue-400 flex-none mt-0.5" />
             <div className="text-xs text-blue-200">
               <p className="font-bold mb-1">Consejo para Google Drive:</p>
               <p>Selecciona tus videos en Drive, da clic derecho &gt; <strong>Copiar enlaces</strong> y pega todo aquí. El sistema detectará automáticamente cada video.</p>
             </div>
           </div>

           <div className="flex gap-2 mb-2">
             <textarea 
               value={urlInput}
               onChange={e => setUrlInput(e.target.value)}
               className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm font-mono h-32 focus:ring-2 focus:ring-blue-500 outline-none"
               placeholder="Pega aquí tu lista de enlaces...&#10;https://drive.google.com/file/d/VIDEO_ID_1/view https://drive.google.com/file/d/VIDEO_ID_2/view"
             />
           </div>
           <button 
             onClick={handleAddLink}
             className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
           >
             <Plus size={18} /> Procesar Enlaces Pegados
           </button>
        </div>

        {/* Lista de Videos */}
        {videos.length > 0 && (
          <div className="mb-24 space-y-3">
            <h3 className="font-bold text-gray-300">Videos en el Torneo ({videos.length})</h3>
            {videos.map((video, idx) => (
              <div key={video.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3 group hover:border-blue-500/50 transition">
                <div className="w-8 h-8 flex-none bg-black rounded flex items-center justify-center text-gray-500 font-bold text-xs">
                  {idx + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <input 
                    type="text" 
                    value={video.title}
                    onChange={(e) => handleTitleChange(video.id, e.target.value)}
                    className="bg-transparent border-none text-white font-medium w-full focus:ring-0 p-0 placeholder-gray-500"
                    placeholder={`Video ${idx + 1}`}
                  />
                  <p className="text-xs text-gray-500 truncate font-mono">{video.url}</p>
                </div>

                <div className="flex items-center gap-2">
                  <a href={video.url} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-blue-400" title="Verificar Link">
                    <ExternalLink size={16} />
                  </a>
                  <button onClick={() => handleRemove(video.id)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {videos.length === 0 && (
           <button onClick={loadDemo} className="block mx-auto text-sm text-gray-500 hover:text-white underline">
             Cargar datos de ejemplo
           </button>
        )}

        {/* Footer Action */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex justify-center z-50">
           <button
             onClick={handlePublish}
             disabled={isPublishing || videos.length < 2}
             className={`
               font-bold py-4 px-12 rounded-xl flex items-center gap-3 text-lg shadow-xl transition-all
               ${(isPublishing || videos.length < 2) 
                 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                 : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transform hover:scale-105'}
             `}
           >
             {isPublishing ? <Loader2 className="animate-spin"/> : <Share2 />}
             {isPublishing ? 'Creando...' : 'Crear Torneo y Obtener Código'}
           </button>
        </div>

      </div>
    </div>
  );
};

export default UploadScreen;