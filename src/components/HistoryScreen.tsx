import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import type { User } from '../types';
import { apiRequest } from '../services/api';

interface SavedGraph {
  _id: string;
  filename: string;
  createdAt: string;
  metadata?: any;
  graph: any;
}

interface HistoryScreenProps {
  onLoadGraph: (graph: any) => void;
}

export function HistoryScreen({ onLoadGraph, user }: { onLoadGraph: (graph: any) => void, user: User | null }) {
  const [graphs, setGraphs] = useState<SavedGraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGraphs = async () => {
      if (!user?.email) return;
      try {
        const response = await apiRequest(`/api/graphs?userEmail=${encodeURIComponent(user.email)}`);
        const data = await response.json();
        if (data.success) {
          setGraphs(data.graphs);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to fetch saved graphs');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphs();
  }, [user]);

  return (
    <div className="space-y-10 py-8">
      <div className="max-w-xl">
        <h2 className="text-5xl font-headline font-bold mb-4">Saved Networks</h2>
        <p className="text-on-surface-variant leading-relaxed">
          Access your previous excavations. Every PDF you've analyzed is stored here for retrieval.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-500 p-6 rounded-2xl border border-red-100 text-center">
          {error}
        </div>
      ) : graphs.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-low rounded-[40px] border border-slate-200">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">folder_open</span>
          <p className="text-slate-500 font-medium">No saved graphs found yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {graphs.map((item) => (
            <motion.div
              key={item._id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => onLoadGraph(item)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <h4 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors truncate">
                {item.metadata?.title || item.filename}
              </h4>
              <p className="text-xs text-on-surface-variant line-clamp-2 mb-6 h-8">
                {item.metadata?.description || "Knowledge network generated from document."}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase">
                    {item.graph?.nodes?.length || 0} Nodes
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase">
                    Level {item.metadata?.complexity || "0"}
                  </span>
                </div>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all">
                  arrow_forward
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
