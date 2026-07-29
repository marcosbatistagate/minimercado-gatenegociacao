import { useEffect, useState } from 'react';

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl mb-6 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <img src="/negociacao-icon.svg" alt="Grêmio Negociação" className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
          <h1 className="text-2xl font-jakarta font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Gremio Negociação
          </h1>
        </div>
        <div className="h-6 w-[1px] bg-white/20"></div>
        <h2 className="text-lg font-inter text-white/80">
          Minimercado
        </h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-inter font-medium text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          Caixa Aberto
        </div>
        
        <div className="font-jakarta font-medium text-white/90 tracking-widest text-lg">
          {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </header>
  );
}
