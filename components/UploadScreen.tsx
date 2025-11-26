import React, { useState, useRef } from 'react';
import { VideoItem } from '../types';
import { Upload, FileVideo, Trash2, Cloud, PlayCircle, Loader2, Share2, CheckCircle2, AlertCircle, Trophy } from 'lucide-react';
import { MOCK_VIDEOS } from '../services/mockData';

interface UploadScreenProps {
  onPublish: (name: string, videos: VideoItem[]) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onPublish }) => {
  const [tournamentName, setTournamentName] = useState('');
  const [files, setFiles] = useState<VideoItem[]>([]);
  const [fileStatus, setFileStatus] = useState<Record<string, 'loading' | 'ready' | 'error'>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingMock, setIsLoadingMock] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFileStatus = (id: string, status: 'loading' | 'ready' | 'error') => {
    setFileStatus(prev => ({ ...prev, [id]: status }));
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newVideos: VideoItem[] = Array.from(fileList)
      .filter(file => file.type.startsWith('video/'))
      .map(file => {
        const id = crypto.randomUUID();
        // Initialize status as ready for local files
        updateFileStatus(id, 'ready'); 
        return {
          id: id,
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          url: URL.createObjectURL(file),
          thumbnail: '', 
          driveId: 'pending_upload'
        };
      });

    setFiles(prev => [...prev, ...newVideos]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleRemove = (id: string) => {
    setFiles(prev => prev.filter(v => v.id !== id));
    const newStatus = { ...fileStatus };
    delete newStatus[id];
    setFileStatus(newStatus);
  };

  const handleUseDemoData = () => {
    setIsLoadingMock(true);
    setTimeout(() => {
      setTournamentName("Copa de Cine IA");
      setFiles(MOCK_VIDEOS);
      const statuses: Record<string, 'loading' | 'ready' | 'error'> = {};
      MOCK_VIDEOS.forEach(v => statuses[v.id] = 'ready');
      setFileStatus(statuses);
      setIsLoadingMock(false);
    }, 800);
  };

  const handleStart = () => {
    if (!tournamentName.trim()) {
      alert("Por favor, ponle un nombre a tu torneo.");
      return;
    }
    if (files.length < 2) return;
    
    // Check if any errors
    const errors = files.filter(f => fileStatus[f.id] === 'error');
    if (errors.length > 0) {
      alert(`¡Atención! Hay ${errors.length} videos con errores. Elimínalos antes de continuar.`);
      return;
    }

    onPublish(tournamentName.trim(), files);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-900 text-white p-6 pb-24">
      <div className="w-full max-w-6xl">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-purple-600 rounded-full mb-4 shadow-lg shadow-purple-500/20">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Configuración del Torneo</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Dale un nombre a tu evento y sube los videos participantes.
          </p>
        </div>

        {/* Tournament Name Input */}
        <div className="max-w-md mx-auto mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Evento</label>
          <div className="relative">
            <Trophy className="absolute left-3 top-3.5 w-5 h-5 text-yellow-500" />
            <input 
              type="text" 
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-lg"
              placeholder="Ej. Mejores Bloopers 2024"
            />
          </div>
        </div>

        {/* Upload Zone */}
        <div 
          className={`
            border-2 border-dashed rounded-2xl p-8 mb-8 transition-all cursor-pointer text-center relative overflow-hidden
            ${isDragging 
              ? 'border-purple-500 bg-purple-500/10 scale-[1.01]' 
              : 'border-gray-700 hover:border-gray-500 bg-gray-800'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept="video/*" 
            onChange={(e) => processFiles(e.target.files)} 
          />
          
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="p-4 bg-gray-700 rounded-full">
              <Upload className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="text-lg font-medium text-white">Haz clic o arrastra archivos de video aquí</p>
              <p className="text-sm text-gray-500 mt-1">Formatos recomendados: MP4 (H.264)</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileVideo className="w-5 h-5 text-purple-400" />
            Galería de Videos ({files.length})
          </h2>
          
          <div className="flex gap-3">
             {files.length === 0 && (
               <button 
                 onClick={handleUseDemoData}
                 disabled={isLoadingMock}
                 className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition border border-gray-700 flex items-center gap-2"
               >
                 {isLoadingMock ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                 Cargar Demo
               </button>
             )}
             {files.length > 0 && (
                <button 
                  onClick={() => setFiles([])}
                  className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm transition border border-red-900/50"
                >
                  Limpiar Todo
                </button>
             )}
          </div>
        </div>

        {/* Video Grid */}
        {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-800/50 rounded-xl border border-gray-700/50 text-gray-500 border-dashed">
              <FileVideo className="w-16 h-16 mb-4 opacity-20" />
              <p>Tu galería está vacía.</p>
            </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {files.map((file, index) => (
              <div 
                key={file.id} 
                className={`relative group bg-gray-800 rounded-xl overflow-hidden border transition-all hover:shadow-xl ${
                  fileStatus[file.id] === 'error' ? 'border-red-500' : 'border-gray-700 hover:border-indigo-500'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-2 left-2 z-20 flex gap-2">
                  <div className="bg-black/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded">
                    #{index + 1}
                  </div>
                  {fileStatus[file.id] === 'error' && (
                    <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Error
                    </div>
                  )}
                  {fileStatus[file.id] === 'ready' && (
                    <div className="bg-green-500/80 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Listo
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                <button 
                  onClick={() => handleRemove(file.id)}
                  className="absolute top-2 right-2 z-20 p-2 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur"
                  title="Eliminar video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Video Player */}
                <div className="aspect-video bg-black relative">
                  <video 
                    src={file.url} 
                    className="w-full h-full object-contain"
                    controls
                    preload="metadata"
                    onLoadedMetadata={() => updateFileStatus(file.id, 'ready')}
                    onError={() => updateFileStatus(file.id, 'error')}
                  />
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-white truncate text-sm mb-1" title={file.title}>
                    {file.title}
                  </h3>
                  <p className="text-xs text-gray-500 flex justify-between">
                    <span>ID: {file.id.slice(0, 8)}...</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Publish Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/90 backdrop-blur border-t border-gray-800 z-50 flex justify-center">
          <button
            onClick={handleStart}
            disabled={files.length < 2 || !tournamentName.trim()}
            className={`
              w-full max-w-md py-3 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform shadow-lg
              ${files.length >= 2 && tournamentName.trim()
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] hover:shadow-purple-500/25 text-white' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }
            `}
          >
            {files.length < 2 ? (
              <>Sube al menos 2 videos</>
            ) : !tournamentName.trim() ? (
              <>Escribe un nombre al torneo</>
            ) : (
              <>
                Crear Torneo y Obtener Código
                <Share2 className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;