
import React, { useState, useEffect } from 'react';
import { VideoItem } from '../types';
import { AlertCircle, ExternalLink, Clock, FileWarning, Play } from 'lucide-react';

interface VideoCardProps {
  video: VideoItem;
  isActive: boolean;
  onSelect?: () => void;
  label?: string;
  color?: string;
  hideAction?: boolean; 
}

const VideoCard: React.FC<VideoCardProps> = ({ video, isActive, onSelect, label, color, hideAction = false }) => {
  const [videoError, setVideoError] = useState(false);
  const [driveId, setDriveId] = useState<string | null>(null);

  useEffect(() => {
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,       
      /id=([a-zA-Z0-9_-]+)/,         
      /file\/d\/([a-zA-Z0-9_-]+)/    
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
      className={`relative w-full h-full flex flex-col bg-black rounded-xl overflow-hidden shadow-2xl transition-all duration-300 group ${isActive ? '' : 'opacity-60 hover:opacity-100'}`}
    >
      {label && (
        <div className="absolute top-4 left-4 z-20">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-lg backdrop-blur-md`} style={{ backgroundColor: color || '#4f46e5' }}>
            {label}
          </span>
        </div>
      )}

      {/* Area del Video */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden rounded-xl border border-gray-800/50">
        
        {!videoError && (
          <video 
            src={video.url}
            className="w-full h-full max-h-full object-contain"
            controls={true}
            loop
            playsInline
            onError={() => setVideoError(true)}
            onClick={(e) => e.stopPropagation()} 
          />
        )}

        {videoError && driveId && (
          <iframe
            src={`https://drive.google.com/file/d/${driveId}/preview`}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={video.title}
          />
        )}

        {videoError && !driveId && (
          <div className="text-center p-6 flex flex-col items-center justify-center">
            <div className="bg-gray-800 p-4 rounded-full mb-4 shadow-xl border border-gray-700">
              <FileWarning className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-white font-medium mb-1">No disponible</h3>
            <p className="text-gray-500 text-xs max-w-[200px]">El archivo no pudo ser cargado.</p>
            {video.url && !video.url.includes('blob') && (
              <a 
                href={video.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-4 text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1"
              >
                <ExternalLink size={12} /> Abrir Externamente
              </a>
            )}
          </div>
        )}
      </div>

      {!hideAction && onSelect && (
        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            disabled={videoError && !driveId}
            className={`w-full py-3 rounded-lg font-bold text-white text-sm uppercase tracking-wide transition-all active:scale-95 shadow-lg
              ${(videoError && !driveId) ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
          >
             {(videoError && !driveId) ? 'Error' : 'Seleccionar Video'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoCard;
