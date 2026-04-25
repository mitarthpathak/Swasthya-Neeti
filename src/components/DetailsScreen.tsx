import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function DetailsScreen({ data, viewedNodeIds }: { data: any, viewedNodeIds: Set<string> }) {
  const [isRelatedMaximized, setIsRelatedMaximized] = useState(false);
  
  const metadata = data?.metadata || {
    title: "Quantum Mechanics",
    description: "Explore the fundamental nature of reality at its smallest scales. From superposition to entanglement, witness the architecture of the subatomic void.",
    complexity: 9,
    category: "Theoretical Physics",
    roadmap: [
      { number: "01", title: "Classical Mechanics", status: "completed", desc: "Newtonian laws and the determinism of macroscopic objects." },
      { number: "02", title: "Electromagnetism", status: "completed", desc: "Maxwell's equations and the wave nature of light." },
      { number: "★", title: "Linear Algebra", status: "in-progress", desc: "Vector spaces, Hilbert space, and operator theory." },
      { number: "04", title: "Schrödinger Equation", status: "locked", desc: "Differential equations describing how the quantum state changes." }
    ],
    relatedModules: [
      { icon: "waves", title: "Wave-Particle Duality", desc: "The fundamental paradox of quantum entities" },
      { icon: "grid_view", title: "Heisenberg Principle", desc: "Inherent uncertainty in measurement" },
      { icon: "all_inclusive", title: "Quantum Entanglement", desc: "Spooky action at a distance" }
    ],
    quiz: [
      {
        question: "What is the primary difference between Classical and Quantum Mechanics?",
        options: ["Determinism vs Probabilism", "Speed", "Size of objects", "Color"],
        correct: 0,
        explanation: "Classical mechanics is deterministic, while quantum mechanics is fundamentally probabilistic."
      }
    ]
  };

  const nodeCount = data?.nodes?.length || 128;
  const exploredCount = viewedNodeIds?.size || 0;
  const progressPercent = nodeCount > 0 ? Math.round((exploredCount / nodeCount) * 100) : 0;

  return (
    <div className="space-y-12 py-8 relative">
      {/* Top Card */}
      <div className="relative h-64 rounded-[40px] overflow-hidden group">
        <img 
          src={`https://picsum.photos/seed/${metadata.title}/1200/400`} 
          alt="Concept Background" 
          className="w-full h-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/50 to-transparent backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 p-10 flex flex-col justify-between">
          <div className="flex justify-end">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 backdrop-blur-md rounded-full border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live Document Map</span>
            </div>
          </div>
          <div className="max-w-xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-xl">
                 <span className="material-symbols-outlined text-primary text-3xl">auto_stories</span>
              </div>
              <div>
                <h3 className="text-2xl font-headline font-bold text-slate-900">{metadata.category} Intelligence</h3>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{data?.filename || "Syllabus.pdf"}</p>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
              We've processed {nodeCount} semantic entities to build your personal {metadata.title} knowledge graph.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Content Area */}
        <div className="lg:col-span-12 space-y-12 order-2 lg:order-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                    <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-headline font-bold">Prerequisite Roadmap</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{metadata.roadmap.length} Milestones</p>
                    </div>
                    <div className="relative space-y-12 pl-12 pt-4">
                        <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary via-surface-container-highest to-surface-container-highest"></div>
                        
                        {metadata.roadmap.map((item: any, idx: number) => (
                        <RoadmapItem 
                            key={idx}
                            number={item.number} 
                            title={item.title} 
                            status={item.status} 
                            desc={item.desc}
                            active={item.status === 'in-progress'} 
                        />
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-8">
                    <div className="space-y-6">
                        <div className="flex gap-2">
                            <span className="px-4 py-1 bg-tertiary/10 text-tertiary text-[10px] font-black uppercase rounded-full border border-tertiary/20 tracking-widest">{metadata.category}</span>
                            <span className="px-4 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full border border-primary/20 tracking-widest">High Complexity</span>
                        </div>
                        <h2 className="text-7xl font-headline font-bold leading-[0.9] text-slate-900">
                            {metadata.title.split(' ').slice(0, -1).join(' ')} <br />
                            <span className="text-primary italic">{metadata.title.split(' ').slice(-1)}</span>
                        </h2>
                        <p className="text-on-surface-variant text-xl leading-relaxed font-medium opacity-80">
                            {metadata.description}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-container-low p-8 rounded-[32px] border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-4 opacity-50">Syllabus Complexity</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-headline font-bold text-primary">Level {metadata.complexity.toString().padStart(2, '0')}</p>
                                <p className="text-xs font-bold text-slate-400">/ 10</p>
                            </div>
                        </div>
                        <div className="bg-surface-container-low p-8 rounded-[32px] border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-4 opacity-50">Semantic Context</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-headline font-bold text-tertiary">{nodeCount}</p>
                                <p className="text-xs font-bold text-slate-400">Concepts</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-container-low p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Exploration Progress</p>
                                <p className="text-xl font-headline font-bold mt-1">Syllabus Mastery</p>
                            </div>
                            <p className="text-3xl font-headline font-bold text-primary">{progressPercent}%</p>
                        </div>
                        <div className="h-4 bg-surface-container-highest rounded-full overflow-hidden p-1 shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-primary via-secondary to-tertiary rounded-full shadow-lg"
                            ></motion.div>
                        </div>
                        <p className="text-xs text-on-surface-variant font-medium text-center">You have successfully explored {exploredCount} out of {nodeCount} knowledge nodes.</p>
                    </div>

                    <AnimatePresence>
                        {!isRelatedMaximized ? (
                        <motion.div 
                            layoutId="related-container"
                            className="bg-surface-container-low p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8"
                        >
                            <div className="flex justify-between items-center">
                            <h4 className="text-2xl font-headline font-bold">Related Modules</h4>
                            <button onClick={() => setIsRelatedMaximized(true)} className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                                <span className="material-symbols-outlined text-sm">open_in_full</span>
                            </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {metadata.relatedModules.slice(0, 4).map((mod: any, idx: number) => (
                                <RelatedModule key={idx} icon={mod.icon} title={mod.title} desc={mod.desc} />
                            ))}
                            </div>
                        </motion.div>
                        ) : (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-12">
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                                    onClick={() => setIsRelatedMaximized(false)}
                                />
                                <motion.div 
                                    layoutId="related-container"
                                    className="relative w-full max-w-4xl bg-white rounded-[48px] p-16 shadow-2xl space-y-12"
                                >
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-5xl font-headline font-bold">Extended Knowledge Domains</h4>
                                        <button onClick={() => setIsRelatedMaximized(false)} className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-primary transition-all">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {metadata.relatedModules.map((mod: any, idx: number) => (
                                            <RelatedModule key={idx} icon={mod.icon} title={mod.title} desc={mod.desc} large />
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>

        {/* Enhanced Quiz Section (Full Width order) */}
        <div className="lg:col-span-12 order-3 py-4">
          <QuizSection quiz={metadata.quiz} roadmap={metadata.roadmap} />
        </div>
      </div>
    </div>
  );
}

function QuizSection({ quiz, roadmap }: { quiz: any[], roadmap: any[] }) {
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [attempts, setAttempts] = useState(0);

  if (!quiz || quiz.length === 0) return null;

  const handleSelectQuiz = (idx: number) => {
    setCurrentIdx(idx);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsFlipped(true);
  };

  const handleNext = () => {
    if (currentIdx !== null && currentIdx < quiz.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIdx(currentIdx + 1);
        setSelectedOption(null);
        setIsAnswered(false);
        setIsFlipped(true);
      }, 300);
    } else {
      setShowResults(true);
      setAttempts(prev => prev + 1);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered || currentIdx === null) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    if (idx === quiz[currentIdx].correct) {
      setScore(prev => prev + 1);
    }
  };

  if (showResults) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 p-16 rounded-[48px] text-center space-y-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-tertiary/20"></div>
        <div className="relative z-10 space-y-6">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto border border-white/20">
            <span className="material-symbols-outlined text-5xl text-primary font-bold">emoji_events</span>
            </div>
            <div className="space-y-2">
                <h4 className="text-5xl font-headline font-black text-white tracking-tight">Expertise Validated!</h4>
                <p className="text-xl text-white/60 font-medium">You've successfully navigated the knowledge gauntlet.</p>
            </div>
            <div className="flex justify-center gap-12 py-8">
                <div className="text-center">
                    <p className="text-4xl font-headline font-black text-white">{score} / {quiz.length}</p>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Final Score</p>
                </div>
                <div className="w-px h-16 bg-white/10"></div>
                <div className="text-center">
                    <p className="text-4xl font-headline font-black text-white">{Math.round((score/quiz.length)*100)}%</p>
                    <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mt-1">Accuracy</p>
                </div>
            </div>
            <button 
            onClick={() => {
                setCurrentIdx(null);
                setScore(0);
                setShowResults(false);
                setSelectedOption(null);
                setIsAnswered(false);
                setIsFlipped(false);
            }}
            className="px-12 py-5 bg-primary text-white rounded-3xl font-black uppercase tracking-widest hover:bg-white hover:text-primary transition-all shadow-[0_0_30px_rgba(8,145,178,0.4)]"
            >
            Restart Assessment
            </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quiz Header & Dashboard Wrap */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <div className="flex-1 bg-slate-900 rounded-[40px] p-8 md:p-10 flex items-center justify-between overflow-hidden relative group">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-secondary to-tertiary opacity-50"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-primary/20 rounded-2xl">
                        <span className="material-symbols-outlined text-primary text-3xl font-bold">psychology</span>
                    </div>
                    <div>
                        <h3 className="text-4xl font-headline font-black text-white uppercase tracking-tight">Knowledge Gauntlet</h3>
                        <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">Mastery Assessment • {quiz.length} Challenges</p>
                    </div>
                </div>
            </div>
            <div className="hidden md:flex gap-10 relative z-10 pr-4">
                <div className="text-right">
                    <p className="text-3xl font-headline font-black text-white">{attempts}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Attempts</p>
                </div>
                <div className="text-right border-l border-white/10 pl-10">
                    <p className="text-3xl font-headline font-black text-tertiary">{attempts > 0 ? "100" : "0"}%</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completion</p>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Main Quiz Interaction Card */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[48px] p-3 shadow-2xl shadow-slate-200/40 min-h-[550px] flex flex-col perspective-1000">
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div 
                key="selection"
                initial={{ rotateY: -15, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 15, opacity: 0 }}
                className="flex-1 p-10 flex flex-col justify-center gap-10"
              >
                <div className="space-y-4">
                  <h4 className="text-4xl font-headline font-black text-slate-900 leading-none">Choose Your Challenge</h4>
                  <p className="text-on-surface-variant font-medium text-lg leading-relaxed max-w-2xl">Select a module below to validate your understanding of the document's core concepts.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {quiz.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSelectQuiz(idx)}
                      className="aspect-square rounded-[36px] border-2 border-slate-100 bg-slate-50 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-white hover:scale-105 hover:shadow-xl hover:shadow-primary/10 transition-all group"
                    >
                      <span className="text-3xl font-black text-slate-300 group-hover:text-primary transition-colors">{idx + 1}</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Concept</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key={currentIdx}
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="flex-1 flex flex-col bg-slate-50/40 rounded-[40px] m-1 border border-slate-100 p-12 relative overflow-hidden shadow-inner"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-primary via-secondary to-tertiary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(( (currentIdx || 0) + 1) / quiz.length) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-4">
                    <span className="px-5 py-2 bg-slate-900 text-white text-[10px] font-black uppercase rounded-full tracking-widest">Module {(currentIdx || 0) + 1}</span>
                    <div className="flex items-center gap-2 text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Validation Active</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsFlipped(false)}
                    className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all group shadow-sm"
                  >
                    <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform">close</span>
                  </button>
                </div>

                <div className="flex-1 flex flex-col gap-10">
                  <h4 className="text-4xl font-headline font-black text-slate-900 leading-[1.1]">
                      {currentIdx !== null && quiz[currentIdx].question}
                  </h4>

                  <div className="grid grid-cols-1 gap-4">
                      {currentIdx !== null && quiz[currentIdx].options.map((option: string, oIdx: number) => {
                          let state = "idle";
                          if (isAnswered) {
                              if (oIdx === quiz[currentIdx].correct) state = "correct";
                              else if (oIdx === selectedOption) state = "wrong";
                              else state = "dimmed";
                          } else if (selectedOption === oIdx) {
                              state = "selected";
                          }

                          return (
                              <button 
                                  key={oIdx}
                                  onClick={() => handleSelectOption(oIdx)}
                                  disabled={isAnswered}
                                  className={cn(
                                      "p-7 rounded-[32px] border-2 text-left font-bold transition-all flex items-center justify-between group",
                                      state === "idle" && "bg-white border-slate-100 hover:border-primary text-slate-700 hover:shadow-2xl hover:shadow-slate-200",
                                      state === "selected" && "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10",
                                      state === "correct" && "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20",
                                      state === "wrong" && "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20",
                                      state === "dimmed" && "opacity-40 grayscale"
                                  )}
                              >
                                  <span className="text-xl">{option}</span>
                                  {state === "correct" && <span className="material-symbols-outlined text-2xl">check_circle</span>}
                                  {state === "wrong" && <span className="material-symbols-outlined text-2xl">cancel</span>}
                              </button>
                          );
                      })}
                  </div>

                  <AnimatePresence>
                      {isAnswered && (
                          <motion.div 
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-6 space-y-8"
                          >
                              <div className="p-8 bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-sm">lightbulb</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Analytical Preamble</p>
                                  </div>
                                  <p className="text-base text-slate-600 font-medium leading-relaxed">{currentIdx !== null && quiz[currentIdx].explanation}</p>
                              </div>
                              <button 
                                  onClick={handleNext}
                                  className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-[0.3em] hover:bg-primary transition-all flex items-center justify-center gap-4 group shadow-[0_20px_40px_rgba(15,23,42,0.2)]"
                              >
                                  <span>{currentIdx !== null && currentIdx < quiz.length - 1 ? "Next Module" : "Finish Assessment"}</span>
                                  <span className="material-symbols-outlined text-lg group-hover:translate-x-3 transition-transform">trending_flat</span>
                              </button>
                          </motion.div>
                      )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Info Panels */}
        <div className="lg:col-span-4 flex flex-col gap-8">
            {/* Dashboard Sidebar */}
            <div className="bg-white border border-slate-200 rounded-[48px] p-10 shadow-sm space-y-8">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Your Progression</h5>
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <div className="space-y-1">
                            <p className="text-3xl font-headline font-black text-slate-900">{attempts}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sessions</p>
                        </div>
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                            <span className="material-symbols-outlined text-slate-300">history</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-primary/5 p-6 rounded-3xl border border-primary/10">
                        <div className="space-y-1">
                            <p className="text-3xl font-headline font-black text-primary">{Math.round((score/quiz.length)*100)}%</p>
                            <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Best Accuracy</p>
                        </div>
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-primary/20 shadow-sm">
                            <span className="material-symbols-outlined text-primary">target</span>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-900 rounded-3xl space-y-3">
                    <p className="text-[10px] font-bold text-white leading-relaxed">Expert Tip: Take a 5-minute break between sessions for 20% better long-term retention.</p>
                </div>
            </div>

            {/* Recommended Content */}
            <div className="flex-1 bg-surface-container-low border border-slate-200 rounded-[48px] p-10 space-y-8">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Critical Revision</h5>
                <div className="space-y-4">
                    {roadmap.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="p-5 bg-white rounded-[28px] border border-slate-100 shadow-sm group cursor-pointer hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/10">
                                    {item.number}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h6 className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{item.title}</h6>
                                    <p className="text-[9px] text-slate-400 truncate tracking-widest font-bold">READY TO STUDY</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-200 text-sm group-hover:text-primary transition-colors">chevron_right</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-5 bg-tertiary/10 rounded-[28px] flex items-center gap-4 border border-tertiary/10">
                    <span className="material-symbols-outlined text-tertiary">verified</span>
                    <p className="text-[10px] font-bold text-tertiary leading-snug">Studying related concepts before quiz cycles improves scores by 40%.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function RoadmapItem({ number, title, status, desc, active = false }: { number: string; title: string; status: string; desc: string; active?: boolean }) {
  return (
    <div className="relative group">
      <div className={cn(
        "absolute -left-12 w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 transition-all",
        active ? "bg-primary border-primary shadow-[0_0_16px_rgba(8,145,178,0.3)]" : "bg-surface-container-low border-surface-container-highest group-hover:border-primary/50"
      )}>
        <span className={cn("text-xs font-bold", active ? "text-on-primary" : "text-on-surface-variant")}>{number}</span>
      </div>
      <div className={cn(
        "p-6 rounded-3xl border transition-all",
        active ? "bg-surface-container-high border-primary/20" : "bg-surface-container-low border-slate-200 opacity-60"
      )}>
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold">{title}</h4>
          <span className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 rounded", 
            status === 'completed' ? "bg-tertiary/20 text-tertiary" : 
            status === 'in-progress' ? "bg-primary/20 text-primary" : "bg-surface-container-highest text-on-surface-variant"
          )}>
            {status.replace('-', ' ')}
          </span>
        </div>
        <p className="text-[10px] text-on-surface-variant leading-relaxed">
          {desc}
        </p>
        {active && (
          <div className="flex gap-3 mt-4">
            <button className="flex-1 py-2 bg-primary text-on-primary text-[10px] font-bold rounded-lg">Resume Study</button>
            <button className="flex-1 py-2 bg-surface-container-highest text-on-surface text-[10px] font-bold rounded-lg">View Exercises</button>
          </div>
        )}
      </div>
    </div>
  );
}

function RelatedModule({ icon, title, desc, large = false }: { icon: string; title: string; desc: string; large?: boolean }) {
  return (
    <div className={cn(
        "flex gap-4 items-center rounded-2xl transition-all cursor-pointer group",
        large ? "p-6 bg-slate-50 border border-slate-100 hover:border-primary/30" : "p-4 hover:bg-surface-container-high"
    )}>
      <div className={cn(
        "bg-surface-container-highest rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all",
        large ? "w-16 h-16 shadow-sm" : "w-10 h-10"
      )}>
        <span className={cn("material-symbols-outlined", large ? "text-2xl" : "text-sm")}>{icon}</span>
      </div>
      <div>
        <h5 className={cn("font-bold transition-colors group-hover:text-primary", large ? "text-xl" : "text-sm")}>{title}</h5>
        <p className={cn("text-on-surface-variant font-medium", large ? "text-xs mt-1" : "text-[10px]")}>{desc}</p>
      </div>
    </div>
  );
}
