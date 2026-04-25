import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface NodeData {
  id: string;
  label: string;
  type: 'core' | 'major' | 'minor';
  category: 'primary' | 'secondary' | 'tertiary';
  x: number;
  y: number;
  desc?: string;
  icon?: string;
}

export function GraphScreen({ data, onNodeExplored, viewedNodeIds }: { data?: any, onNodeExplored: (id: string) => void, viewedNodeIds: Set<string> }) {
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Highly dense spiral logic to create "loaded" feel
  const displayNodes = (data?.nodes || []).map((node: any, i: number) => {
    const angle = i * 0.35; 
    const typeOffset = (node.type === 'core' ? 0 : (node.type === 'major' ? 280 : 500));
    const spiralRadius = typeOffset + (i * 8); 
    
    return {
        ...node,
        x: node.x ?? (Math.cos(angle) * spiralRadius),
        y: node.y ?? (Math.sin(angle) * spiralRadius),
        isViewed: viewedNodeIds.has(node.id)
    };
  });
  const displayEdges = data?.edges || [];

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.2));
  const handleReset = () => setZoom(1);

  const toggleMaximize = () => setIsMaximized(!isMaximized);

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    onNodeExplored(node.id);
  };

  return (
    <div className={cn("space-y-8 py-8 w-full transition-all duration-500", isMaximized ? "fixed inset-0 z-[60] bg-background p-12 overflow-hidden flex flex-col" : "max-w-full")}>
      {!isMaximized && (
        <div className="max-w-xl space-y-4 px-4 flex justify-between items-end w-full">
            <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Semantic Architecture</p>
                <h2 className="text-5xl font-headline font-bold">Concept Galaxy</h2>
                <p className="text-on-surface-variant leading-relaxed">
                Deep dive into the neural structure of your document. Nodes represent granular concepts.
                </p>
            </div>
            <div className="bg-surface-container-high px-6 py-3 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Mastery</p>
                <p className="text-xl font-headline font-bold text-primary">{viewedNodeIds.size} <span className="text-[10px] text-slate-400">/ {displayNodes.length}</span></p>
            </div>
        </div>
      )}

      <div 
        className={cn(
            "relative w-full bg-surface-container-low rounded-[40px] border border-slate-200 overflow-hidden cursor-grab active:cursor-grabbing shadow-inner transition-all duration-500",
            isMaximized ? "flex-1 rounded-none border-none p-0" : "h-[850px]"
        )}
        ref={containerRef}
      >
        <motion.div
          drag
          dragConstraints={containerRef}
          className="absolute inset-0 flex items-center justify-center w-full h-full transform-origin-center"
          animate={{ scale: zoom }}
          transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
        >
          {/* Edges SVG Layer */}
          <svg 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            width="10000"
            height="10000"
          >
            <g transform="translate(5000, 5000)">
              {displayEdges.map((edge: any, i: number) => {
                const s = displayNodes.find((n: any) => n.id === (edge.source || edge.from));
                const t = displayNodes.find((n: any) => n.id === (edge.target || edge.to));
                if (!s || !t) return null;
                
                const isHoveredEdge = hoveredNode && (hoveredNode.id === s.id || hoveredNode.id === t.id);
                const isViewedEdge = s.isViewed && t.isViewed;
                const opacity = hoveredNode ? (isHoveredEdge ? 1.0 : 0.05) : (isViewedEdge ? 0.6 : 0.2);
                const strokeWidth = (edge.importance || 5) * 0.8;
                
                return (
                  <motion.line
                    key={i}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke={isHoveredEdge ? "var(--color-primary)" : (isViewedEdge ? "var(--color-tertiary)" : "#cbd5e1")}
                    strokeWidth={isHoveredEdge ? Math.max(strokeWidth, 6) : strokeWidth}
                    initial={{ opacity: 0 }}
                    animate={{ opacity }}
                    transition={{ duration: 0.3 }}
                  />
                );
              })}
            </g>
          </svg>

          {/* Nodes Layer */}
          {displayNodes.map((node: any) => (
            <GraphNode
              key={node.id}
              node={node}
              isViewed={node.isViewed}
              isHovered={hoveredNode?.id === node.id}
              isFaded={hoveredNode !== null && hoveredNode.id !== node.id && !displayEdges.find((e: any) => {
                const s = e.source || e.from;
                const t = e.target || e.to;
                return (s === hoveredNode.id && t === node.id) || (t === hoveredNode.id && s === node.id);
              })}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleNodeClick(node)}
            />
          ))}
        </motion.div>

        {/* Controls */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-2 z-40">
          <ControlButton icon="add" onClick={handleZoomIn} />
          <ControlButton icon="remove" onClick={handleZoomOut} />
          <div className="h-4"></div>
          <ControlButton icon={isMaximized ? "close_fullscreen" : "open_in_full"} onClick={toggleMaximize} />
          <ControlButton icon="center_focus_strong" onClick={handleReset} />
        </div>

        {/* Legend */}
        {!isMaximized && (
            <div className="absolute bottom-8 left-8 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 shadow-lg space-y-3 z-40">
                <LegendItem color="bg-primary" label="Foundational" />
                <LegendItem color="bg-secondary" label="Major Topics" />
                <LegendItem color="bg-tertiary" label="Sub-components" />
            </div>
        )}
      </div>

      <AnimatePresence>
        {selectedNode && (
          <ConceptModal 
            node={selectedNode} 
            allNodes={displayNodes} 
            allEdges={displayEdges} 
            onClose={() => setSelectedNode(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GraphNode({ node, isViewed, isHovered, isFaded, onMouseEnter, onMouseLeave, onClick }: any) {
  const isMinor = node.type === 'minor' || (node.importance && node.importance < 4);
  
  const getBorderColor = (category: string) => {
    if (isViewed) return 'border-tertiary shadow-[0_0_15px_rgba(5,150,105,0.2)]';
    switch (category) {
      case 'primary': return 'border-primary';
      case 'secondary': return 'border-secondary';
      case 'tertiary': return 'border-tertiary';
      default: return 'border-slate-200';
    }
  };

  const getTextColor = (category: string) => {
    if (isViewed) return 'text-tertiary';
    switch (category) {
      case 'primary': return 'text-primary';
      case 'secondary': return 'text-secondary';
      case 'tertiary': return 'text-tertiary';
      default: return 'text-slate-500';
    }
  };

  const getBgColor = (category: string) => {
    if (isViewed) return 'bg-tertiary/5';
    switch (category) {
      case 'primary': return 'bg-primary/10';
      case 'secondary': return 'bg-secondary/10';
      case 'tertiary': return 'bg-tertiary/10';
      default: return 'bg-slate-100';
    }
  };

  if (node.type === 'core') {
    return (
      <motion.div 
        className={cn(
          "absolute -ml-20 -mt-10 w-40 h-20 bg-white border-2 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-30 cursor-pointer overflow-visible",
          getBorderColor(node.category),
          isFaded ? "opacity-30" : "opacity-100"
        )}
        style={{ left: `calc(50% + ${node.x}px)`, top: `calc(50% + ${node.y}px)` }}
        animate={{ 
          scale: isHovered ? 1.05 : 1,
          boxShadow: isHovered ? "0 12px 40px rgba(0,0,0,0.08)" : "0 8px 30px rgba(0,0,0,0.04)"
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <div className="text-center">
          <p className="text-sm font-bold px-2">{node.label}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
             <p className={cn("text-[8px] uppercase tracking-widest font-bold", getTextColor(node.category))}>{isViewed ? 'Mastered' : 'Foundational'}</p>
             {isViewed && <span className="material-symbols-outlined text-[10px] text-tertiary">check_circle</span>}
          </div>
        </div>
      </motion.div>
    );
  }

  if (node.type === 'major') {
    return (
      <motion.div
        className={cn(
          "absolute w-32 h-16 bg-white border rounded-2xl flex items-center justify-center z-20 cursor-pointer shadow-sm",
          getBorderColor(node.category),
          isFaded ? "opacity-30" : "opacity-100"
        )}
        style={{ left: `calc(50% + ${node.x - 64}px)`, top: `calc(50% + ${node.y - 32}px)` }}
        animate={{ scale: isHovered ? 1.08 : 1 }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <div className="text-center px-3">
          {node.icon && <span className={cn("material-symbols-outlined text-[18px] mb-0.5", getTextColor(node.category))}>{node.icon}</span>}
          <p className="text-[11px] font-bold leading-tight">{node.label}</p>
          {isViewed && <div className="absolute -top-1 -right-1 w-3 h-3 bg-tertiary rounded-full border-2 border-white"></div>}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "absolute rounded-xl px-4 py-2 flex items-center justify-center z-10 cursor-pointer transition-all border border-transparent",
        getBgColor(node.category),
        isFaded ? "opacity-20" : "opacity-90",
        "hover:border-current"
      )}
      style={{ left: `calc(50% + ${node.x}px)`, top: `calc(50% + ${node.y}px)`, transform: 'translate(-50%, -50%)' }}
      whileHover={{ scale: 1.1, backgroundColor: 'white', borderColor: 'currentColor' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
        <p className={cn("font-bold", isMinor ? "text-[8px]" : "text-[10px]", getTextColor(node.category))}>{node.label}</p>
        {isViewed && <div className="absolute -top-1 -right-1 w-2 h-2 bg-tertiary rounded-full"></div>}
    </motion.div>
  );
}

function ConceptModal({ node, allNodes, allEdges, onClose }: { node: any, allNodes: any[], allEdges: any[], onClose: () => void }) {
  // Get related nodes for the mini-graph
  const relatedEdges = allEdges.filter(e => (e.source || e.from) === node.id || (e.target || e.to) === node.id);
  const relatedNodeIds = new Set([node.id, ...relatedEdges.flatMap(e => [(e.source || e.from), (e.target || e.to)])]);
  
  // Create a sub-graph focus
  const miniNodes = allNodes.filter(n => relatedNodeIds.has(n.id)).map((n, i) => {
    const angle = (i / (relatedNodeIds.size - 1)) * Math.PI * 2;
    const dist = n.id === node.id ? 0 : 150;
    return {
        ...n,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist
    };
  });
  
  const miniEdges = relatedEdges;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[650px]"
      >
        {/* Left Side: Info */}
        <div className="w-full md:w-[350px] p-8 md:p-12 flex flex-col justify-between border-r border-slate-100 bg-white z-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="w-12 h-1 bg-primary rounded-full mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Module Analysis</p>
              <h3 className="text-3xl md:text-4xl font-headline font-bold text-slate-900 leading-[1.1]">{node.label}</h3>
            </div>
            
            <div className="space-y-6">
              <p className="text-sm text-slate-500 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-4 py-1">
                {node.desc || "Interactive module data extracted from source. This component forms a critical part of the semantic relationship web building the overall document structure."}
              </p>
              
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Structural Links</p>
                <div className="grid grid-cols-1 gap-2">
                  {miniNodes.filter(n => n.id !== node.id).slice(0, 4).map(n => (
                    <div key={n.id} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      <span className="text-[10px] font-bold text-slate-600">{n.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="mt-8 group px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-primary transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10 hover:shadow-primary/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm transition-transform group-hover:rotate-90">close</span>
            Collapse View
          </button>
        </div>

        {/* Right Side: Mini Graph */}
        <div className="flex-1 bg-slate-50/50 relative overflow-hidden flex items-center justify-center cursor-default">
            <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
            
            <div className="relative w-full h-full flex items-center justify-center scale-75 md:scale-100">
                {/* Mini Edges */}
                <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                    <g transform="translate(320, 325)">
                        {miniEdges.map((e, i) => {
                            const s = miniNodes.find(n => n.id === (e.source || e.from));
                            const t = miniNodes.find(n => n.id === (e.target || e.to));
                            if (!s || !t) return null;
                            return (
                                <motion.line 
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                                    key={i} 
                                    x1={s.x} y1={s.y} x2={t.x} y2={t.y} 
                                    stroke="#cbd5e1" 
                                    strokeWidth="2" 
                                    strokeDasharray="6 6" 
                                />
                            );
                        })}
                    </g>
                </svg>

                {/* Mini Nodes */}
                {miniNodes.map((n, i) => (
                    <motion.div
                        key={n.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, delay: i * 0.1, type: 'spring' }}
                        className={cn(
                            "absolute rounded-2xl px-5 py-3 flex items-center justify-center border transition-shadow",
                            n.id === node.id 
                                ? "bg-white border-primary border-[3px] z-20 w-40 h-20 shadow-xl shadow-primary/10" 
                                : "bg-white/90 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md"
                        )}
                        style={{ left: `calc(50% + ${n.x}px)`, top: `calc(50% + ${n.y}px)`, transform: 'translate(-50%, -50%)' }}
                    >
                        {n.id === node.id && (
                            <motion.div
                                className="absolute inset-0 border-4 border-primary rounded-2xl"
                                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />
                        )}
                        <p className={cn("font-bold text-center leading-tight", n.id === node.id ? "text-sm text-slate-900" : "text-[10px] text-slate-600")}>
                            {n.label}
                        </p>
                    </motion.div>
                ))}
            </div>
            
            <div className="absolute top-10 right-10 flex gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active Focus</span>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}

function ControlButton({ icon, onClick }: { icon: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-12 h-12 bg-white shadow-xl border border-slate-100/50 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all text-slate-600 hover:text-primary active:scale-95"
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-white", color)}></div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}


