import React, { useState, useRef } from 'react';
import { VideoItem } from '../types';
import { Upload, FileVideo, Trash2, Cloud, PlayCircle, Loader2, Share2, CheckCircle2, AlertCircle, Trophy } from 'lucide-react';
import { MOCK_VIDEOS } from '../services/mockData';
import { api } from '../services/api';

interface UploadScreenProps {
  onPublish: (name: string, videos: VideoItem[]) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onPublish }) => {
  const [tournamentName, setTournamentName] = useState('');
  const [files, setFiles] = useState<VideoItem[]>([]);
  const [fileStatus, setFileStatus] = useState<Record<string, 'loading' | 'ready' | 'error' | 'uploading'>>({});
  const [errorDetails, setErrorDetails] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFileStatus = (id: string, status: 'loading' | 'ready' | 'error' | 'uploading') => {
    setFileStatus(prev => ({ ...prev, [id]: status }));
  };

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const rawFiles = Array.from(fileList).filter(file => file.type.startsWith('video/'));
    
    // Create placeholders
    const newPlaceholders: VideoItem[] = rawFiles.map(file => ({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(file), // Preview local
      thumbnail: '',
      driveId: 'pending'
    }));

    setFiles(prev => [...prev, ...newPlaceholders]);

    // Upload sequential logic
    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const placeholder = newPlaceholders[i];
      
      updateFileStatus(placeholder.id, 'uploading');
      
      try {
        const serverUrl = await api.uploadVideo(file);
        
        // Si el server devuelve una URL blob (fallback), es "Ready" pero local.
        // Si devuelve /uploads/..., es "Ready" remoto.
        setFiles(prev => prev.map(item => 
          item.id === placeholder.id ? { ...item, url: serverUrl, driveId: 'uploaded' } : item
        ));
        updateFileStatus(placeholder.id, 'ready');
        
      } catch (error: any) {
        console.error("Upload failed", error);
        updateFileStatus(placeholder.id, 'error');
        setErrorDetails(prev => ({...prev, [placeholder.id]: error.message || "Error desconocido"}));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); };
  const handleRemove = (id: string) => { setFiles(prev => prev.filter(v => v.id !== id)); };

  const handleStart = () => {
    if (!tournamentName.trim()) { alert("Ponle un nombre a tu torneo."); return; }
    if (files.length < 2) return;
    
    // Ensure all ready
    const notReady = files.filter(f => fileStatus[f.id] !== 'ready');
    if (notReady.length > 0) {
      alert("Espera a que todos los videos digan 'Listo' o elimina los que tienen error.");
      return;
    }

    setIsPublishing(true);
    onPublish(tournamentName.trim(), files);
  };

  const handleUseDemoData = () => {
     setTournamentName("Demo Local");
     setFiles(MOCK_VIDEOS);
     const s: any = {};
     MOCK_VIDEOS.forEach(v => s[v.id] = 'ready');
     setFileStatus(s);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-900 text-white p-6 pb-24">
      <div className="w-full max-w-6xl">
        <div className="mb-8 text-center">
          <Cloud className="w-12 h-12 text-purple-500 mx-auto mb-2" />
          <h1 className="text-3xl font-bold">Crear Torneo</h1>
          <p className="text-gray-400">Sube tus videos. Si el servidor falla, la app usará modo local automáticamente.</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <input 
            type="text" 
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg"
            placeholder="Nombre del Torneo..."
          />
        </div>

        <div 
          className={`border-2 border-dashed rounded-2xl p-8 mb-8 text-center cursor-pointer ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800'}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        >
          <input type="file" ref={fileInputRef} className="hidden" multiple accept="video/*" onChange={(e) => processFiles(e.target.files)} />
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p>Click o Arrastrar videos aquí</p>
        </div>
        
        {files.length === 0 && (
           <button onClick={handleUseDemoData} className="block mx-auto text-sm text-gray-500 underline mb-8">Cargar Datos de Demo</button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {files.map((file, index) => (
              <div key={file.id} className={`relative bg-gray-800 rounded-xl overflow-hidden border ${fileStatus[file.id] === 'error' ? 'border-red-500' : 'border-gray-700'}`}>
                <div className="absolute top-2 left-2 z-20 flex gap-2">
                   {fileStatus[file.id] === 'uploading' && <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white">Subiendo...</span>}
                   {fileStatus[file.id] === 'ready' && <span className="bg-green-600 text-xs px-2 py-1 rounded text-white">Listo</span>}
                   {fileStatus[file.id] === 'error' && <span className="bg-red-600 text-xs px-2 py-1 rounded text-white">Error</span>}
                </div>
                <button onClick={() => handleRemove(file.id)} className="absolute top-2 right-2 z-20 bg-black/50 p-1 rounded-full hover:bg-red-600 text-white"><Trash2 size={16}/></button>
                
                <div className="aspect-video bg-black">
                   <video src={file.url} className="w-full h-full object-contain" controls />
                </div>
                <div className="p-3">
                   <p className="truncate text-sm font-bold">{file.title}</p>
                   {fileStatus[file.id] === 'error' && (
                     <p className="text-xs text-red-400 mt-1">{errorDetails[file.id]}</p>
                   )}
                </div>
              </div>
            ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800 flex justify-center z-50">
           <button
             onClick={handleStart}
             disabled={isPublishing || files.length < 2}
             className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2"
           >
             {isPublishing ? <Loader2 className="animate-spin"/> : <Share2 />}
             {isPublishing ? 'Publicando...' : 'Publicar Torneo'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;