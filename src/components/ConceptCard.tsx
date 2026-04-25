import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Concept } from '../types';

export function ConceptCard({ concept }: { concept: Concept; key?: string }) {
  const borderColors = {
    'Theoretical Framework': 'border-primary',
    'Historical Context': 'border-secondary',
    'Interdisciplinary Link': 'border-tertiary',
  };

  const textColors = {
    'Theoretical Framework': 'text-primary',
    'Historical Context': 'text-secondary',
    'Interdisciplinary Link': 'text-tertiary',
  };

  const icons = {
    'Theoretical Framework': 'trending_up',
    'Historical Context': 'account_tree',
    'Interdisciplinary Link': 'hub',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-surface-container-high p-5 rounded-xl border-l-4 hover:bg-surface-bright transition-all cursor-default group",
        borderColors[concept.category],
        concept.category === 'Interdisciplinary Link' && "md:col-span-2 bg-surface-container-high/60"
      )}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-bold uppercase tracking-widest", textColors[concept.category])}>
            {concept.category}
          </span>
          {concept.isNew && (
            <span className="bg-tertiary text-on-tertiary text-[8px] font-bold px-1.5 py-0.5 rounded">NEW</span>
          )}
        </div>
        <span className={cn("material-symbols-outlined text-sm text-on-surface-variant transition-colors", `group-hover:${textColors[concept.category]}`)}>
          {icons[concept.category]}
        </span>
      </div>
      <h4 className="text-xl font-headline font-bold mb-2">{concept.title}</h4>
      <p className="text-sm text-on-surface-variant leading-relaxed">{concept.description}</p>
      
      {concept.correlationNote && (
        <div className="mt-4 flex gap-4 items-center">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full border-2 border-surface-container-high bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[10px] text-primary">psychology</span>
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-surface-container-high bg-secondary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[10px] text-secondary">memory</span>
            </div>
          </div>
          <span className="text-[10px] text-on-surface-variant italic">{concept.correlationNote}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {concept.tags.map(tag => (
          <span key={tag} className={cn(
            "px-2 py-0.5 rounded bg-surface-container-lowest text-[9px] border",
            `text-${textColors[concept.category].split('-')[1]}/80`,
            `border-${textColors[concept.category].split('-')[1]}/10`
          )}>
            {tag.toUpperCase()}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
