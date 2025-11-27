import React, { useState, useEffect } from 'react';
import { VideoItem } from '../types';
import { AlertCircle, ExternalLink, Clock, FileWarning } from 'lucide-react';

interface VideoCardProps {
  video: VideoItem;
  isActive: boolean;
  onSelect?: () => void;
  label?: string;
  color?: string;
  hideAction?: boolean; // Nueva prop para ocultar el botón interno
}

const VideoCard: React.FC<VideoCardProps> = ({ video, isActive, onSelect, label, color, hideAction = false }) => {
  const [videoError, setVideoError] = useState(false);
  const [driveId, setDriveId] = useState<string | null>(null);

  // Extraer ID de Drive si es posible para usarlo en el fallback
  useEffect(() => {
    // Patrones comunes de ID de Drive
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,       // .../d/ID...
      /id=([a-zA-Z0-9_-]+)/,         // ...id=ID...
      /file\/d\/([a-zA-Z0-9_-]+)/    // ...file/d/ID...
    ];

    for (const pattern of patterns) {
      const match = video.url.match(pattern);
      if (match && match[1]) {
        setDriveId(match[1]);
        break;
      }
    }
  }, [video.url]);

  return (
    <div 
      className={`relative flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden border-2 transition-all duration-300 group ${isActive ? 'ring-4 ring-offset-2 ring-offset-gray-900' : 'border-gray-700 opacity-60 hover:opacity-100'}`}
      style={{ borderColor: isActive ? (color || '#4f46e5') : '' }}
    >
      {/* Header opcional */}
      {label && (
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex justify-between items-start">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider bg-opacity-90 shadow-lg`} style={{ backgroundColor: color }}>
            {label}
          </span>
        </div>
      )}

      {/* Video Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center min-h-0 overflow-hidden">
        
        {/* Caso 1: Video HTML5 Directo (Ideal) */}
        {!videoError && (
          <video 
            src={video.url}
            className="w-full h-full object-contain"
            controls={true}
            loop
            playsInline
            onError={() => setVideoError(true)}
            onClick={(e) => e.stopPropagation()} 
          />
        )}

        {/* Caso 2: Fallback a Iframe de Drive (Si falla el directo) */}
        {videoError && driveId && (
          <div className="w-full h-full bg-black relative">
            <iframe
              src={`https://drive.google.com/file/d/${driveId}/preview`}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={video.title}
            />
            {/* Overlay transparente para capturar clicks si no se está interactuando con controles */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-transparent pointer-events-none" />
          </div>
        )}

        {/* Caso 3: Error Total (Ni directo ni Drive ID detectado) -> Probable Expiración */}
        {videoError && !driveId && (
          <div className="text-center p-6 flex flex-col items-center justify-center h-full z-10 bg-gray-900/80">
            <div className="bg-gray-800 p-4 rounded-full mb-4 shadow-xl">
              <FileWarning className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Video No Disponible</h3>
            <p className="text-gray-400 text-sm max-w-xs mb-4">
              Es posible que el archivo haya expirado (30+ días) o haya sido eliminado del servidor.
            </p>
            
            <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-900/30 px-3 py-1 rounded-full border border-orange-500/20">
               <Clock size={12} />
               <span>Limpieza automática activa</span>
            </div>

            {video.url && !video.url.includes('blob') && (
              <a 
                href={video.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-6 text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={12} /> Intentar abrir enlace original
              </a>
            )}
          </div>
        )}
      </div>

      {/* Info Area & Button */}
      <div className="flex-none p-4 bg-gray-800 border-t border-gray-700 z-10">
        <div className="mb-2">
          <h3 className="font-bold text-white truncate text-center text-xl">{video.title}</h3>
        </div>
        
        {!hideAction && onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            disabled={videoError && !driveId} // Deshabilitar si está roto
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white text-lg uppercase tracking-wide transition-transform transform active:scale-95 shadow-lg hover:brightness-110 
              ${(videoError && !driveId) ? 'bg-gray-600 cursor-not-allowed opacity-50' : ''}`}
            style={{ backgroundColor: (videoError && !driveId) ? undefined : color }}
          >
             {(videoError && !driveId) ? 'No disponible' : 'Votar por este'}
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoCard;