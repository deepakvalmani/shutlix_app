import React from 'react';
import { motion } from 'motion/react';
import { Compass, Target, Maximize2, Layers } from 'lucide-react';

interface MapViewProps {
  mapRef: React.RefObject<HTMLDivElement | null>;
  onRecenter: () => void;
  onToggleStyle: () => void;
  onFitAll: () => void;
  isActive: boolean;
}

export const MapView = ({ mapRef, onRecenter, onToggleStyle, onFitAll, isActive }: MapViewProps) => {
  return (
    <div className="relative flex-1 bg-zinc-900 overflow-hidden">
      {/* The Leaflet Map Container */}
      <div 
        id="driver-map" 
        ref={mapRef} 
        className="w-full h-full z-0" 
      />

      {/* Map Control Floating Buttons */}
      <div className="absolute bottom-10 right-6 z-[1000] flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleStyle}
          className="w-12 h-12 glass-heavy rounded-2xl border border-white/10 flex items-center justify-center text-white/70 shadow-2xl hover:bg-white/10"
          title="Satellite View"
        >
          <Layers size={20} />
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onFitAll}
          className="w-12 h-12 glass-heavy rounded-2xl border border-white/10 flex items-center justify-center text-white/70 shadow-2xl hover:bg-white/10"
          title="View All Shifts"
        >
          <Target size={20} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onRecenter}
          className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center shadow-2xl transition-all ${
            isActive 
              ? 'bg-brand border-white/20 text-white animate-pulse' 
              : 'glass-heavy border-white/10 text-white/70'
          }`}
          title="Recenter Map"
        >
          <Compass size={24} className={isActive ? 'animate-spin-slow' : ''} />
        </motion.button>
      </div>

      {/* Decorative Overlay for HUD integration */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.4)] md:shadow-none" />
    </div>
  );
};
