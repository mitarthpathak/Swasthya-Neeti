import { motion } from 'motion/react';
import { UploadStatus } from '../types';

export function StatusPanel({ uploads }: { uploads: UploadStatus[] }) {
  return (
    <div className="space-y-4">
      {uploads.map((upload, idx) => (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface-container-low rounded-xl p-6 border border-slate-200"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                description
              </span>
              <div>
                <h4 className="text-sm font-bold">{upload.fileName}</h4>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                  {upload.subtext || "Processing..."}
                </p>
              </div>
            </div>
            <span className="text-xs text-primary font-mono">{upload.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${upload.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
