# Design System - MiniMarket POS

Este documento centraliza as diretrizes visuais e de User Experience (UX) para todo o frontend do PDV. A arquitetura de interface é baseada no estilo **Glassmorphism**, promovendo um visual moderno, elegante e de alto contraste (Dark Mode Premium).

## 1. Temática e Fundo (Background)
O sistema opera com um tema dark sofisticado focado em contraste para visibilidade prolongada.
- **Fundo Principal (Root):**
  Utilizar gradientes profundos em containers raiz.
  `bg-gradient-to-br from-darkGray-100 via-darkGray-50 to-slate-900`
- **Fundo de Cards/Painéis (Glass Effect):**
  Painéis flutuantes sobre o fundo principal.
  `bg-white/5 backdrop-blur-md` (Pode escalar para `backdrop-blur-3xl` dependendo da profundidade desejada).
- **Bordas Translucidas:**
  Garantir a separação ótica sem ser intrusiva.
  `border border-white/10` (Uso comum) ou `border-white/20` (Elementos de maior elevação).

## 2. Paleta de Cores e Glow (Efeitos Luminosos)
O uso estratégico de cores de destaque (accent colors) emite luz sobre o fundo escuro, focando a atenção do operador.
- **Primária (Brand/Accent):** Roxo (Purple/Violet).
  - *Glow de Elementos Ativos:* `shadow-[0_0_30px_rgba(139,92,246,0.4)]`
  - *Hover effects:* `hover:shadow-[0_0_40px_rgba(139,92,246,0.6)]`
- **Sucesso (Caixa, Venda Confirmada):** Esmeralda (Emerald).
  - *Fundo suavizado:* `bg-emerald-500/20`
  - *Texto/Borda:* `text-emerald-300 border-emerald-500/30`
  - *Glow de Sucesso:* `shadow-[0_0_15px_rgba(16,185,129,0.3)]`
- **Alerta/Erro (Cancelamento):** Rosa Forte/Vermelho (Rose/Red).
  - Segue o mesmo padrão de transparência e brilho da cor de sucesso.

## 3. Tipografia (Hierarquia Textual)
A legibilidade é prioridade absoluta no PDV.
- **Títulos e Destacados (Números Grandes, Logos):**
  - Fonte: **Plus Jakarta Sans** (`font-jakarta`)
  - Uso: Headers, Total da Venda, Valores em destaque.
  - Peso: `font-bold` ou `font-extrabold`.
  - Efeito opcional: `drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]` para dar brilho ao texto branco puro.
- **Corpo, Rótulos e Tabelas:**
  - Fonte: **Inter** (`font-inter`)
  - Uso: Botões secundários, itens de tabela, informações textuais, rótulos de input.
  - Cor padrão: `text-white/80` ou `text-white/60` (secundário).

## 4. Botões e Ações (UX & Interação)
Micro-interações são fundamentais para que o sistema pareça "vivo" e responsivo.

### Botão Principal (Ação Primária / Finalizar Venda)
- Estilo Sólido mas Vibrante: `bg-violet-600 hover:bg-violet-500 text-white font-jakarta font-bold`
- Sombra Luminosa: `shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:shadow-[0_0_35px_rgba(139,92,246,0.8)]`
- Transição suave: `transition-all duration-300 ease-out`
- Feedback tátil visual: `active:scale-95`

### Botão Secundário / Ícones de Ação
- Estilo Glass/Outline: `bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20 text-white/80 hover:text-white`
- Transição no ícone: Usar o modificador `group` no botão e escalar o ícone: `group-hover:scale-110 transition-transform`.
- Feedback tátil visual: `active:scale-95`

### Inputs e Campos de Busca (Atalhos de Teclado)
O design deve sugerir que o sistema é operado rapidamente por teclado.
- Fundo do input: `bg-black/20 border border-white/10 focus:border-violet-500/50`
- Texto de Input: `text-white placeholder:text-white/30 font-mono` (Para códigos de barras e valores financeiros) ou `font-inter`.
- Badges de atalho: Inserir pequenas indicações de tecla (ex: `[F2]`, `[ESC]`) nos cantos dos botões com estilo `bg-white/10 text-white/50 text-xs px-2 rounded-md`.

## 5. Estrutura de Arredondamento (Border Radius)
Manter a consistência na forma geométrica de cantos curvos para harmonizar com o Glassmorphism.
- Containers principais e modais: `rounded-3xl` ou `rounded-2xl`.
- Botões, Badges e Inputs: `rounded-xl` ou `rounded-lg`.
- Indicadores pontuais (status): `rounded-full`.

## Resumo de Classes Essenciais Tailwind
Sempre aplique este combo básico ao estruturar novos componentes no layout:
`className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-[0_0_20px_rgba(0,0,0,0.2)]"`
