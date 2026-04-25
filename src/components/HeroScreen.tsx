import { motion } from 'motion/react';

interface HeroScreenProps {
  onStartJourney: () => void;
  onExploreArchives: () => void;
}

export function HeroScreen({ onStartJourney, onExploreArchives }: HeroScreenProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-12 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-xs text-primary">auto_awesome</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Intelligent Graphing Engine</span>
      </motion.div>

      <div className="space-y-6 max-w-2xl">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl font-headline font-bold leading-tight"
        >
          Uncover the <br />
          <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Hidden Links</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-on-surface-variant text-lg leading-relaxed"
        >
          Transform fragmented data into a cohesive ecosystem. Our AI-driven engine maps relationships across disciplines, turning noise into a high-fidelity knowledge graph.
        </motion.p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-4 w-full max-w-xs"
      >
        <button onClick={onStartJourney} className="bg-primary text-on-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-[0_4px_16px_rgba(8,145,178,0.25)]">
          Start Your Journey <span className="material-symbols-outlined">arrow_downward</span>
        </button>
        <button onClick={onExploreArchives} className="bg-surface-container-high text-on-surface font-bold py-4 rounded-xl hover:bg-surface-bright transition-colors">
          Explore Public Archives
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mt-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-surface-container-low p-8 rounded-3xl border border-slate-200 flex flex-col items-center"
        >
          <div className="flex justify-between w-full mb-8">
            <h3 className="text-2xl font-headline font-bold">Dynamic Synthesis</h3>
            <span className="material-symbols-outlined text-primary">hub</span>
          </div>
          <p className="text-on-surface-variant text-sm mb-8">Real-time relationship mapping</p>
          <div className="relative w-full aspect-square max-w-[240px]">
            <img 
              src="https://picsum.photos/seed/graph/400/400" 
              alt="Graph Visualization" 
              className="w-full h-full object-cover rounded-2xl opacity-80"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur p-3 rounded-xl border border-slate-200">
              <div className="h-2 w-16 bg-primary/40 rounded-full mb-2"></div>
              <div className="h-2 w-10 bg-secondary/40 rounded-full"></div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-surface-container-low p-8 rounded-3xl border border-slate-200 text-center"
          >
            <span className="material-symbols-outlined text-primary mb-4">bolt</span>
            <h4 className="text-4xl font-headline font-bold mb-2">1.2M+</h4>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Nodes Connected</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-surface-container-low p-8 rounded-3xl border border-slate-200 text-center"
          >
            <span className="material-symbols-outlined text-secondary mb-4">menu_book</span>
            <h4 className="text-4xl font-headline font-bold mb-2">98%</h4>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Link Accuracy</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
