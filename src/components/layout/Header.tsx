import { useEffect, useState } from 'react';

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl mb-4 md:mb-6 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <img src="/negociacao.png" alt="Grêmio Negociação" className="h-7 md:h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] shrink-0" />
          <h1 className="text-sm sm:text-base md:text-2xl font-jakarta font-bold tracking-tight text-white truncate drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Minimercado Gremio Negociação
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        <div className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-4 md:py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-inter font-medium text-xs md:text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="hidden sm:inline">Caixa Aberto</span>
          <span className="sm:hidden">Aberto</span>
        </div>
        
        <div className="font-jakarta font-medium text-white/90 tracking-widest text-sm md:text-lg">
          {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </header>
  );
}
