# Carnaúba — Gerenciador de Cronograma de Projetos

Aplicação web de gerenciamento de cronograma e orçamento de projetos de investimento, com visualização em Gantt, controle de versões e rastreamento financeiro. Interface em português brasileiro, voltada para o contexto de projetos da Carnaúba Investimentos.

## Funcionalidades

- **Modos de visualização (Financeiro / Físico)** — alternados por um controle segmentado na barra superior; todos os componentes atualizam simultaneamente
  - **Financeiro** (paleta verde): barras de 3 segmentos mostrando Solicitado → Recebido → Gasto com rótulos em R$ abreviados
  - **Físico** (paleta azul): barras de 3 segmentos mostrando Planejado → Ativo (meses iniciados, não concluídos) → Realizado (etapas `feito=true`) com rótulos em %
- **ProgressCard — componente paramétrico unificado** — substitui todos os componentes de barra anteriores; recebe `segments[]` com cor e rótulo por camada, suporta modo expansível com corpo e rodapé, título editável por duplo-clique e drag-and-drop integrado
- **Cronograma Gantt interativo** — visualização em meses com barras de progresso por grupo e por item, usando `ProgressCard` com segmentos por VM
- **Título do item no card Gantt** — cada `GanttItemCard` exibe o nome e versão do item à esquerda das barras mensais; as barras permanecem sempre alinhadas à grade de meses independentemente do título
- **Grupos de itens** — itens organizados em grupos recolhíveis com drag-and-drop para reordenação
- **Controle de versões** — cada edição pode gerar uma nova versão do item, preservando o histórico completo
- **Rastreamento financeiro** — orçamento previsto (material + mão de obra) vs. realizado por etapa mensal
- **Linha do hoje** — marcador visual da data atual no cronograma
- **Sidebar recolhível** — com nome de projeto editável
- **Salvar como template** — persiste o estado completo (grupos, itens, etapas, nome do projeto) no `localStorage` e restaura automaticamente ao reabrir o app

## Estrutura do Projeto

```
carnauba-prototipo/
├── index.html               # Ponto de entrada — carrega React, Babel e CSS
├── app.jsx                  # App, Sidebar, GanttChart, GanttGroupCard, GanttItemCard,
│                            #   GanttGroupBar, GanttItemBar, VmToggle, ícones, persistência
├── cronograma-itens.jsx     # ProgressCard, ItemCronograma, GrupoHeader, GrupoItensCronograma,
│                            #   GroupFooter, helpers de VM (buildSegments, getRealizadoPct…),
│                            #   constantes de cor (VM_NEUTRAL, VM_FINANCEIRO, VM_FISICO)
├── item-modal.jsx           # Modal de edição de itens existentes e histórico de versões
├── novo-item-drawer.jsx     # Drawer de criação de novos itens com formulário em etapas
├── month-card.jsx           # Card de etapa mensal (modo edição e rastreamento)
└── design-system/           # Submodule → carnauba-investimentos/carnauba-design-system
    ├── colors_and_type.css  # Tokens de cor, tipografia e espaçamento
    ├── fonts/               # Família tipográfica Aptos completa
    └── assets/              # Logotipos SVG (claro e escuro)
```

## Tecnologias

| Camada | Tecnologia |
|---|---|
| UI | React 18.3.1 (CDN, UMD) |
| JSX | Babel Standalone 7.29.0 |
| Estilos | CSS puro com variáveis customizadas (via Design System) |
| Build | Nenhum — executa direto no navegador |
| Backend | Nenhum — SPA estática |

## Design System

Os tokens visuais (cores, tipografia, espaçamento, sombras) vêm do repositório [carnauba-design-system](https://github.com/carnauba-investimentos/carnauba-design-system), incluído aqui como git submodule em `design-system/`. O arquivo `design-system/colors_and_type.css` é a única fonte de verdade para estilos — nunca edite diretamente no prototipo.

- **Paleta primária:** Navy `#1B3C5F`, Blue `#73A9C7`, Sage `#A9C8BF`
- **Semânticas:** Success `#3A8F6A`, Warning `#C08A2A`, Error `#B84040`
- **Tipografia:** família Aptos (Display, Standard, Narrow, Serif, Mono) em pesos 300–900
- **Escala de espaçamento:** 4 px a 96 px

As paletas de VM são definidas em `cronograma-itens.jsx` como constantes exportadas via `window`:

| Constante | Uso | Cor principal |
|---|---|---|
| `VM_FINANCEIRO` | Modo Financeiro (verde) | `#389579` (gasto), `#92B7AD` (recebido) |
| `VM_FISICO` | Modo Físico (azul) | `#3289C0` (realizado), `#8BBBD6` (ativo) |
| `VM_NEUTRAL` | Neutros compartilhados | `#BDC6D6` (trilho), `#DFE4EA` (corpo), `#EDF1F6` (fundo) |

## Como clonar (nova máquina)

O projeto usa um git submodule. Use a flag `--recurse-submodules` para clonar tudo de uma vez:

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

Abra `http://localhost:8080` (ou a porta configurada) no navegador.

> **Nota:** o arquivo `index.html` não pode ser aberto diretamente via `file://` devido às restrições de CORS no carregamento de módulos JS locais. Use sempre um servidor HTTP local.

## Atualizar o Design System

Quando o repositório `carnauba-design-system` receber atualizações, execute dentro desta pasta:

```bash
git submodule update --remote design-system
git add design-system
git commit -m "Update design system to latest"
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
            ├── number          — número da versão
            ├── date            — data de criação (ISO)
            ├── nome            — nome do item nesta versão
            └── etapas[]
                ├── id
                ├── mes                  — mês de referência (YYYY-MM)
                ├── percentual           — % do escopo total desta etapa
                ├── orcamentoMaterial    — orçado: material (BRL)
                ├── orcamentoMaoDeObra   — orçado: mão de obra (BRL)
                ├── descricao            — descrição das atividades
                ├── feito                — etapa concluída (boolean)
                ├── gastoMaterial        — realizado: material (BRL)
                ├── gastoMaoDeObra       — realizado: mão de obra (BRL)
                └── valorRecebido        — valor recebido nesta etapa (BRL)
```

### Template (localStorage)

Ao clicar em **Salvar como template** na sidebar, o estado inteiro é serializado como JSON na chave `carnauba_template` do `localStorage`. Na próxima abertura, o app restaura automaticamente grupos, itens e nome do projeto a partir desta chave; se ausente, usa os dados padrão embutidos no código.

## Localização

Totalmente em português brasileiro (pt-BR): formatação de datas `DD/MM/AA`, moeda Real (`R$`) com separador de milhar em ponto, abreviações de meses em português.
