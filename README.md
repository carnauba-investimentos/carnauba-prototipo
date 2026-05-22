# Carnaúba — Gerenciador de Cronograma de Projetos

Aplicação web de gerenciamento de cronograma e orçamento de projetos de investimento, com visualização em Gantt, controle de versões e rastreamento financeiro. Interface em português brasileiro, voltada para o contexto de projetos da Carnaúba Investimentos.

## Funcionalidades

- **Modos de visualização (Financeiro / Físico)** — alternados por botões posicionados ao lado do título "Cronograma" no cabeçalho; todos os componentes atualizam simultaneamente
  - **Financeiro** (paleta verde): barras de 3 segmentos mostrando Solicitado → Recebido → Gasto com rótulos em R$ abreviados; alerta (âmbar) se qualquer etapa tem `gasto > recebido` (incluindo recebido = 0 com gasto > 0); a comparação é por etapa individual, não pelo agregado
  - **Físico** (paleta azul): barras de 4 segmentos lado a lado (sem sobreposição): Progresso realizado (azul escuro) → Atividades em atraso não realizadas (âmbar) → Pendente no mês (azul claro) → Planejamento futuro (cinza); rótulos visíveis apenas quando o segmento tem largura suficiente (clipped por `overflow: hidden`)
- **DrawerHeader — componente paramétrico compartilhado** (`drawer-header.jsx`) — cabeçalho de 2 linhas usado por `ItemDrawer` e `MonthCard`; linha 1: círculo opcional + títulos + `statusDiv` alinhado à direita; linha 2: tags em pílulas; sub-componentes `ValueTag` (badge com rótulo + valor) e `SegBar` (barra de progresso com segmentos sobrepostos e rótulos flutuantes)
- **ItemDrawer — modos FÍSICO / FINANCEIRO** — cabeçalho mostra 3 `ValueTag` (Gasto / Recebido / Solicitado) no modo Financeiro, ou barra de progresso agregada com segmentos Ativo + Realizado no modo Físico; corpo exibe campos de gasto (Financeiro) ou campo `percentualRealizado %` (Físico); rodapé reorganizado: Deletar + Editar à esquerda, Cancelar + Salvar à direita
- **MonthCard — modos FÍSICO / FINANCEIRO** — cabeçalho usa `DrawerHeader` com `statusDiv` por modo; no modo Físico: barra cumulativa por mês (cada barra começa onde a anterior terminou); círculo mostra número ou ✓ conforme conclusão; cores de alerta (âmbar) quando mês encerrado e `percentualRealizado < 100`
- **Campo `percentualRealizado`** — adicionado ao schema de etapa (0–100); no modo Físico, substitui `feito` como indicador de conclusão: `percentualRealizado >= 100` = etapa concluída; `feito` é ignorado em todos os cálculos Físicos
- **Lógica de alerta unificada** — dois gatilhos independentes por modo:
  - *Físico:* `etapaShowsWarning(e)` — `mês encerrado && percentualRealizado < 100`
  - *Financeiro:* `hasEtapaFinancialOverrun(etapas)` — qualquer etapa com `gasto > recebido` (recebido = 0 com gasto > 0 também dispara)
- **Badge RECEBIDO clicável no MonthCard** — no modo Financeiro, clicar no badge RECEBIDO abre um modal para inserir `recebidoMaterial` e `recebidoMaoDeObra` separadamente; badges GASTO / RECEBIDO / SOLICITADO exibem valor completo em R$ (ex.: R$ 66.000, sem abreviação em k)
- **ProgressCard — componente paramétrico unificado** — recebe `segments[]` com cor e rótulo por camada, suporta modo expansível com corpo e rodapé, título editável por duplo-clique e drag-and-drop integrado
- **Cronograma Gantt interativo** — visualização em meses com barras de progresso por grupo e por item; grupos recolhíveis com drag-and-drop para reordenação
- **Controle de versões** — cada edição pode gerar uma nova versão do item, preservando o histórico completo; o Gantt exibe V1 e a versão atual lado a lado
- **Rastreamento financeiro** — orçamento previsto (material + mão de obra) vs. realizado por etapa mensal
- **Sistema de templates compartilhados** — salva configurações de cronograma como templates nomeados, armazenados na nuvem e acessíveis a todos os usuários; inclui template pré-carregado de Residência Unifamiliar baseado em estimativas de obra

## Estrutura do Projeto

```
carnauba/
├── index.html                   # Ponto de entrada — carrega React, Babel e CSS
├── app.jsx                      # App, Sidebar, GanttChart, ícones, persistência,
│                                #   lógica de templates e helpers de data
├── cronograma-itens.jsx         # ProgressCard, ItemCronograma, GrupoHeader,
│                                #   GrupoItensCronograma, GroupFooter, helpers de VM
├── drawer-header.jsx            # DrawerHeader, ValueTag, SegBar
├── item-modal.jsx               # ItemDrawer — edição, histórico de versões
├── novo-item-drawer.jsx         # Drawer de criação de novos itens
├── month-card.jsx               # MonthCard — etapa mensal com modos Físico/Financeiro
├── design-system/               # Submodule → carnauba-investimentos/carnauba-design-system
│   ├── colors_and_type.css
│   ├── fonts/
│   └── assets/
├── templates/
│   └── carnauba-residencia.json # Template pré-carregado: Residência Unifamiliar
└── carnauba-api/                # Cloudflare Worker — backend de templates
    ├── src/index.js
    ├── wrangler.toml
    └── package.json
```

## Tecnologias

| Camada | Tecnologia |
|---|---|
| UI | React 18.3.1 (CDN, UMD) |
| JSX | Babel Standalone 7.29.0 |
| Estilos | CSS puro com variáveis customizadas (via Design System) |
| Build | Nenhum — executa direto no navegador |
| Backend | Cloudflare Workers + KV (templates compartilhados) |

## Backend — Cloudflare Workers + KV

O sistema de templates usa um Cloudflare Worker como API REST mínima, com persistência em Cloudflare KV. Templates salvos por qualquer usuário ficam disponíveis para todos os usuários do app.

### Arquitetura

```
Browser (React SPA)
  ↕ fetch com CORS
Cloudflare Worker  →  KV namespace: CARNAUBA_TEMPLATES
  GET  /templates          → lista todos os templates
  POST /templates          → cria / sobrescreve um template
  DELETE /templates/:id    → remove um template
```

- **Worker:** `carnauba-api/src/index.js` — ~60 linhas, handler `fetch` nativo (sem framework)
- **KV namespace:** `CARNAUBA_TEMPLATES` — cada template é uma entrada separada (chave = `id`); evita race conditions em saves/deletes simultâneos
- **CORS:** `Access-Control-Allow-Origin: *` em todas as respostas
- **URL do Worker:** `https://carnauba-api.cronemberger.workers.dev`

### Configuração local e deploy

Requer [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/):

```bash
cd carnauba-api
npm install
npx wrangler login
npx wrangler deploy
```

Para criar um novo namespace KV (somente na primeira vez):

```bash
npx wrangler kv namespace create CARNAUBA_TEMPLATES
# copie o id gerado para wrangler.toml
```

### Seed de templates

Para popular o template de Residência Unifamiliar no KV:

```bash
cd carnauba-api
npx wrangler kv key put "tpl-carnauba-residencia-v1" \
  --path="../templates/carnauba-residencia.json" \
  --namespace-id=7ec4b3debdcd4ff58cf7c9d618eaf9b7
```

## Sistema de Templates

### Rodapé do cronograma

Um rodapé fixo (52 px) abaixo do Gantt exibe:
- **Pílulas de templates** (alinhadas à direita) — clique no nome carrega o template; `×` deleta após confirmação
- **Exportar (↓)** — baixa todos os templates como `carnauba-templates.json`
- **Importar (↑)** — lê um arquivo `.json` e adiciona templates novos (não duplica por `id`)
- **Salvar como Template** — abre diálogo para nomear e salvar o cronograma atual; todos os itens são normalizados para V1 com dados de execução zerados (gasto, recebido, feito, percentualRealizado)

### Carregar template com ajuste de calendário

Ao carregar qualquer template, o app pergunta o **mês de início das obras (MM/AAAA)**. O algoritmo:

1. Encontra o mês mais antigo entre todas as etapas do template
2. Calcula o offset em meses entre esse mês e o mês escolhido pelo usuário
3. Desloca todos os campos `mes` de todas as etapas pelo offset calculado

Isso permite reutilizar o template em projetos com calendários diferentes sem edição manual.

### Template: Residência Unifamiliar

Template pré-carregado baseado em estimativas de obra (`templates/carnauba-residencia.json`), com:

- **5 grupos:** Preliminares, Fundação, Estrutura, Instalações, Acabamento
- **26 itens** com orçamento dividido em `orcamentoMaterial` e `orcamentoMaoDeObra`
- **83 etapas** distribuídas em 10 meses (base: nov/25 – ago/26)
- `fisico_items` e `financeiro_items` preenchidos por etapa

| Grupo | Itens | Orçamento total |
|---|---|---|
| Preliminares | Limpeza do Terreno | R$ 65.500 |
| Fundação | Aço Estrutural, Concreto, Fôrmas, Escavação, Outros 1 | R$ 187.500 |
| Estrutura | Alvenaria, Laje, Aço, Escoramento, Concreto, Telhado, Outros 2 | R$ 540.000 |
| Instalações | Elétricas, Hidráulicas, Gás, Bombeiro Civil | R$ 158.000 |
| Acabamento | 13 itens de acabamento | R$ 480.000 |

## Design System

Os tokens visuais (cores, tipografia, espaçamento, sombras) vêm do repositório [carnauba-design-system](https://github.com/carnauba-investimentos/carnauba-design-system), incluído aqui como git submodule em `design-system/`. O arquivo `design-system/colors_and_type.css` é a única fonte de verdade para estilos.

- **Paleta primária:** Navy `#1B3C5F`, Blue `#73A9C7`, Sage `#A9C8BF`
- **Semânticas:** Success `#3A8F6A`, Warning `#C08A2A`, Error `#B84040`
- **Tipografia:** família Aptos (Display, Standard, Narrow, Serif, Mono) em pesos 300–900

As paletas de VM são definidas em `cronograma-itens.jsx`:

| Constante | Uso | Cor principal |
|---|---|---|
| `VM_FINANCEIRO` | Modo Financeiro (verde) | `#389579` (gasto), `#92B7AD` (recebido) |
| `VM_FISICO` | Modo Físico (azul) | `#3289C0` (realizado), `#8BBBD6` (ativo/planejado) |
| `VM_NEUTRAL` | Neutros compartilhados | `#BDC6D6` (trilho), `#DFE4EA` (corpo) |
| `VM_WARNING` | Alerta (âmbar) | `#C08A2A` (realizado/gasto), `#C8A05A` (ativo/recebido) |

## Como clonar (nova máquina)

O projeto usa um git submodule. Use `--recurse-submodules` para clonar tudo de uma vez:

```bash
git clone --recurse-submodules https://github.com/carnauba-investimentos/carnauba-prototipo.git
```

Se já clonou sem a flag e a pasta `design-system/` está vazia:

```bash
git submodule update --init
```

## Como executar

O projeto não requer instalação de dependências ou etapa de build. Basta servir a pasta raiz como arquivos estáticos:

**Com Python:**
```bash
python -m http.server 8080
```

**Com Node.js (`serve`):**
```bash
npx serve .
```

**Com VS Code:** instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) e clique em *Go Live*.

Abra `http://localhost:8080` no navegador.

> **Nota:** o arquivo `index.html` não pode ser aberto diretamente via `file://` devido às restrições de CORS. Use sempre um servidor HTTP local.

## Atualizar o Design System

```bash
git submodule update --remote design-system
git add design-system
git commit -m "chore: update design system to latest"
git push
```

## Modelo de dados

```
Grupo
├── id
├── nome
├── collapsed           — estado recolhido/expandido
└── items[]
    └── Item
        ├── id
        └── versions[]
            ├── number          — número da versão (1, 2, 3…)
            ├── date            — data de criação (ISO)
            ├── nome            — nome do item nesta versão
            └── etapas[]
                ├── id
                ├── mes                  — mês de referência (YYYY-MM)
                ├── percentual           — % do escopo total desta etapa
                ├── orcamentoMaterial    — orçado: material (BRL)
                ├── orcamentoMaoDeObra   — orçado: mão de obra (BRL)
                ├── descricao            — descrição das atividades
                ├── feito                — concluída (boolean; modo Financeiro)
                ├── gastoMaterial        — realizado: material (BRL)
                ├── gastoMaoDeObra       — realizado: mão de obra (BRL)
                ├── valorRecebido        — campo legado (substituído pelos dois abaixo)
                ├── recebidoMaterial     — recebido: material (BRL)
                ├── recebidoMaoDeObra    — recebido: mão de obra (BRL)
                ├── percentualRealizado  — % realizado no mês (0–100; modo Físico)
                ├── fisico_items[]       — tags de atividades físicas do mês
                └── financeiro_items[]   — tags de itens financeiros do mês
```

### Formato do template (Cloudflare KV)

Cada entrada no KV corresponde a um template, com chave = `id`:

```json
{
  "id": "tpl-...",
  "name": "Nome do template",
  "savedAt": "2026-05-21T12:00:00.000Z",
  "grupos": [ ... ]
}
```

Ao salvar como template, todos os itens são normalizados: versão reduzida a V1, campos de execução zerados (`gastoMaterial`, `gastoMaoDeObra`, `recebidoMaterial`, `recebidoMaoDeObra`, `valorRecebido` → 0; `feito` → false; `percentualRealizado` → 0). IDs de grupos e itens são regenerados para evitar colisões.

## Localização

Totalmente em português brasileiro (pt-BR): formatação de datas `DD/MM/AA`, moeda Real (`R$`) com separador de milhar em ponto, abreviações de meses em português.
