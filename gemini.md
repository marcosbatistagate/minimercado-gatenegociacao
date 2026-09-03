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
- **Status:** Fase 10 (Final) - Sincronização e Persistência Supabase Realtime concluída. Arquitetura de duas instâncias (Totem do Cliente com PIX/RE e Área de Gestão com filtro e leitor de código de barras) registrada e finalizada. Preparação para versão de produção em andamento.

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
- Integração completa da persistência via Supabase (`supabaseService`), RPC para processamento atômico de vendas, e sincronização `Realtime` na store Zustand.
- Criação da migration RPC de vendas em `supabase/migrations/02_create_sale_rpc.sql`.
- Atualização visual no Header da gestão (Inclusão do logo em SVG e atualização dos textos para Gremio Negociação e Minimercado).
- Adição de efeitos responsivos de hover (`scale` e `glow`) nos cards de métricas e formas de pagamento.
- Build de produção verificado com sucesso.
- Implantação na Netlify configurada e rotas SPA criadas via `public/_redirects`.
- Refatoração completa da estrutura de dados para garantir uso estrito da coluna `barcode` na tabela `products` em toda a aplicação (BD, store e views), garantindo a integridade dos dados, sem inserção de dados especulativos em scripts.
- Inclusão do logotipo `gate.png` no cabeçalho do Totem (`ClientTotemView.tsx`) e na barra superior de gestão (`Header.tsx`), posicionado à direita do título, preservando proporção óptica e espaçamento idêntico ao logotipo `negociacao.png`.
- Criação e integração do componente de rodapé institucional `AppFooter.tsx` fixado na base do layout com flex-grow (visível tanto no Totem quanto no Painel Administrativo).
- Remoção do ícone decorativo de loja/casinha (`Store`) do topo da barra lateral (`Sidebar.tsx`), simplificando a navegação apenas para itens funcionais.

## ⏳ Próximos Passos (Aguardando Validação)
- Testes em produção e homologação final com os usuários.
