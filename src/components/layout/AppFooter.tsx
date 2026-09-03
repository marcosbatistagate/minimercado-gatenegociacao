import React from 'react';

interface AppFooterProps {
  className?: string;
}

export const AppFooter: React.FC<AppFooterProps> = ({ className = '' }) => {
  return (
    <footer className={`bg-slate-900/80 backdrop-blur border-t border-slate-800/80 py-4 px-6 mt-auto text-xs text-slate-400 z-20 ${className}`}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        {/* Lado Esquerdo (Institucional) */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
          <span className="font-semibold text-slate-200 tracking-wide">
            Grupo de Ações Táticas Especiais - GATE
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Equipe de Negociação</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online / Operacional
            </span>
          </div>
        </div>

        {/* Centro (Missão do Sistema) */}
        <div className="text-center">
          <span className="text-slate-500 hidden lg:inline">
            Minimercado & Controle Patrimonial
          </span>
        </div>

        {/* Lado Direito (Autoria & Ano) */}
        <div className="text-center md:text-right">
          <span>
            Desenvolvido por: <strong className="text-slate-300 font-medium">Delta Negociação</strong>
          </span>
          <span className="text-slate-500 ml-2">• © 2026 • v1.0</span>
        </div>
      </div>
    </footer>
  );
};
