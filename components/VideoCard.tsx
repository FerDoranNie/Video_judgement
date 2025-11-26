import React, { useState } from 'react';
import { VideoItem } from '../types';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface VideoCardProps {
  video: VideoItem;
  isActive: boolean;
  onSelect: () => void;
  label: string; // "Video A" or "Video B"
  color: string; // Border color
}

const VideoCard: React.FC<VideoCardProps> = ({ video, isActive, onSelect, label, color }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div 
      className={`relative flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden border-2 transition-all duration-300 group cursor-pointer ${isActive ? 'ring-4 ring-offset-2 ring-offset-gray-900' : 'border-gray-700 opacity-60 hover:opacity-100'}`}
      style={{ borderColor: isActive ? color : '' }}
      onClick={onSelect} // Make whole card clickable for better UX
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex justify-between items-start">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider bg-opacity-90 shadow-lg`} style={{ backgroundColor: color }}>
          {label}
        </span>
      </div>

      {/* Video Area with min-h-0 to prevent flex overflow */}
      <div className="flex-1 relative bg-black flex items-center justify-center min-h-0 overflow-hidden">
        {!hasError ? (
          <video 
            src={video.url}
            className="w-full h-full object-contain"
            controls={false} // Hide controls in voting mode to focus on the decision (optional, but cleaner)
            autoPlay
            muted
            loop
            playsInline
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="text-center p-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-white font-bold">Error de reproducción</p>
            <p className="text-sm text-gray-400">El video no se pudo cargar.</p>
          </div>
        )}

        {/* Hover/Tap Overlay - Tinder Style */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="transform scale-90 group-hover:scale-110 transition-transform duration-300 bg-white/20 backdrop-blur-sm p-4 rounded-full border-2 border-white">
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
        </div>
      </div>

      {/* Info Area & Button */}
      <div className="flex-none p-3 bg-gray-800 border-t border-gray-700 z-10">
        <div className="mb-3">
          <h3 className="font-bold text-white truncate text-center text-lg">{video.title}</h3>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent double trigger
            onSelect();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white text-lg uppercase tracking-wide transition-transform transform active:scale-95 shadow-lg"
          style={{ backgroundColor: color }}
        >
           Votar por este
        </button>
      </div>
    </div>
  );
};

export default VideoCard;