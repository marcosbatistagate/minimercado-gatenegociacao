# Agent Workspace - minimercado-gatenegociacao

## 🎯 Objetivo
Sistema de alto desempenho para registro, controle de estoque e vendas (PDV) de mini mercado.
Foco: UX/UI intuitiva, operabilidade por atalhos de teclado, responsividade e arquitetura limpa.

## 🛠️ Stack Tecnológica
- **Frontend:** React + TypeScript + Vite
- **Estilização & UI:** Tailwind CSS + Lucide Icons + Shadcn UI (Radix UI)
- **Gerenciamento de Estado:** Zustand
- **Backend / Persistência:** Supabase (PostgreSQL + Supabase Auth + Realtime)
- **Hospedagem / Deploy:** Vercel
- **Package Manager:** npm

## 📌 Estado Atual do Projeto
- **Status:** Fase 3.0 - Nova Arquitetura de Duas Instâncias (Cliente/Totem e Gestão/Admin) com autenticação por RE (Registro de Empregado) e suporte à leitura por código de barras.

## ✅ Tarefas Concluídas
- Instalação de dependências principais (`lucide-react`, `zustand`, utilitários para Shadcn).
- Configuração de Alias de Paths (`@/*` para `./src/*`) no `vite.config.ts` e `tsconfig.app.json`.
- Downgrade para Tailwind CSS v3 (para garantir compatibilidade estável com o Shadcn UI).
- Instalação do SDK oficial do Supabase (`@supabase/supabase-js`).
- Criação da estrutura e arquivo de migração SQL em `supabase/migrations/01_initial_schema.sql` (inserido DDL final).
- Criação do cliente de inicialização do Supabase em `src/lib/supabase.ts`.
- Criação do arquivo de ambiente de exemplo `.env.example`.
- Implementação do Layout Base Glassmorphic: `Sidebar.tsx`, `Header.tsx` e `MainLayout.tsx`.
- Integração do `MainLayout` no `App.tsx` e customização do `tailwind.config.js` com diretrizes visuais.
- Criação e integração do Módulo PDV (Caixa Rápido) com interface Glass UI (`PDVView.tsx`) e lógica Zustand (`useMarketStore.ts`).
- Criação e integração do Módulo de Gestão de Estoque (`InventoryView.tsx`) e atualização da lógica no Zustand (`useMarketStore.ts`).
- Criação e integração do Módulo Dashboard e Métricas Gerenciais (`DashboardView.tsx`) com registro histórico de vendas.
- Reestruturação da arquitetura para suportar duas instâncias (Cliente/Totem e Gestão/Admin) e autenticação por RE.
- Criação e integração da Instância 1: Totem do Cliente (`ClientTotemView.tsx`) com fluxo de identificação por RE, bipagem rápida e pagamento PIX.
- Aplicação de identidade visual no Totem (background `bg.png` com degradê e logotipo `negociacao.png`).
- Atualização da Instância Administrativa com suporte otimizado a leitor de código de barras, botão de retorno ao Totem na Sidebar, e auditoria de vendas com filtro e exibição por RE no Dashboard.

## ⏳ Próximos Passos (Aguardando Validação)
1. Inicializar o Shadcn UI (`npx shadcn@latest init`).
2. Configurar a estrutura básica de diretórios em `src/` (components, pages, store, etc.).
3. Testar a inicialização do projeto e renderização básica.

Aguardando auditoria e validação para prosseguir com os próximos passos.
