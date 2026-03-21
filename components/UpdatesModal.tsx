'use client';

import { X, Sparkles, Clock, ChevronRight } from 'lucide-react';
import { UPDATES, UpdateEntry } from '@/lib/updates';

interface UpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'superadmin' | 'admin' | 'guard';
}

export default function UpdatesModal({ isOpen, onClose, userRole }: UpdatesModalProps) {
  if (!isOpen) return null;

  const filteredUpdates = UPDATES.filter(update => {
    if (userRole === 'superadmin') return true;
    if (userRole === 'admin') return update.roles.includes('admin') || update.roles.includes('guard');
    return update.roles.includes('guard');
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-white/20 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-primary dark:text-white tracking-tight uppercase">Novedades</h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Historial de actualizaciones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-2xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-8">
          {filteredUpdates.map((update, idx) => (
            <div key={update.version} className="relative pl-8 border-l-2 border-slate-100 dark:border-slate-800 pb-2">
              {/* Dot */}
              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 shadow-sm ${idx === 0 ? 'bg-brand-primary animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>

              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-white rounded-full text-xs font-black tracking-wider border border-brand-primary/10">
                  v{update.version}
                </span>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {update.date}
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">{update.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">{update.description}</p>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2 border border-slate-100 dark:border-slate-800">
                {update.changes.map((change, cIdx) => (
                  <div key={cIdx} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <ChevronRight className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                    <span className="font-medium">{change}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredUpdates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 font-bold">No hay actualizaciones recientes para tu rol.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            NexoPark Cloud • Versión Actual {UPDATES[0].version}
          </p>
        </div>
      </div>
    </div>
  );
}
