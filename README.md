# Carnaúba — Gerenciador de Cronograma de Projetos

Aplicação web de gerenciamento de cronograma e orçamento de projetos de investimento, com visualização em Gantt, controle de versões e rastreamento financeiro. Interface em português brasileiro, voltada para o contexto de projetos da Carnaúba Investimentos.

## Funcionalidades

- **Cronograma Gantt interativo** com três níveis de zoom: dias, semanas e meses
- **Controle de versões**: cada edição gera uma nova versão do item, preservando o histórico completo
- **Rastreamento financeiro**: orçamento previsto vs. investimento realizado por etapa
- **Indicadores de progresso**: barras de KPI mostrando avanço (%), duração decorrida (%) e gasto (%)
- **Tooltip contextual**: ao passar o cursor sobre uma barra do Gantt, exibe detalhes de todas as versões
- **Edição de etapas em cascata**: ao alterar a data de término de uma etapa, as datas seguintes são ajustadas automaticamente
- **Linha do hoje**: marcador visual da data atual no cronograma
- **Sidebar recolhível** com nome de projeto editável

## Estrutura do Projeto

```
carnauba-prototipo/
├── index.html          # Ponto de entrada — carrega React, Babel e CSS
├── app.jsx             # Componentes principais: App, Sidebar, GanttChart, barras de KPI
├── item-modal.jsx      # Modal de criação/edição de itens e etapas
└── design-system/      # Submodule → carnauba-investimentos/carnauba-design-system
    ├── colors_and_type.css   # Tokens de cor, tipografia e espaçamento
    ├── fonts/                # Família tipográfica Aptos completa
    └── assets/               # Logotipos SVG (claro e escuro)
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

Cada item do cronograma segue a estrutura abaixo:

```
Item
└── versions[]
    ├── number          — número da versão
    ├── nome            — nome do item nesta versão
    └── etapas[]
        ├── id
        ├── titulo      — título da etapa
        ├── definicao   — descrição
        ├── dataInicio  — data de início (ISO)
        ├── dataFim     — data de término (ISO)
        ├── feito       — concluída (boolean)
        ├── orcamento   — valor orçado (BRL)
        └── investimentoRealizado — valor realizado (BRL)
```

## Localização

Totalmente em português brasileiro (pt-BR): formatação de datas `DD/MM/AA`, moeda Real (`R$`) com separador de milhar em ponto, abreviações de meses em português.
