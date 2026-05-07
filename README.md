# Carnaúba — Gerenciador de Cronograma de Projetos

Aplicação web de gerenciamento de cronograma e orçamento de projetos de investimento, com visualização em Gantt, controle de versões e rastreamento financeiro. Interface em português brasileiro, voltada para o contexto de projetos da Carnaúba Investimentos.

## Funcionalidades

- **Cronograma Gantt interativo** — visualização em meses com barras de progresso por grupo e por item
- **Grupos de itens** — itens organizados em grupos recolhíveis com drag-and-drop para reordenação
- **Controle de versões** — cada edição pode gerar uma nova versão do item, preservando o histórico completo
- **Histórico de versões no Gantt** — quando um item tem 2 ou mais versões, o card Gantt exibe as duas versões simultaneamente: a versão atual (v*n*) na faixa superior do card com cores normais, e a v1 original na faixa inferior como uma barra fina (10 px) em cinza, sem mensagens nem rótulo de gasto — permitindo comparar visualmente o planejamento original com o atual. Cada faixa tem um rótulo "v1", "v2" … à esquerda. No ItemDrawer, todas as versões continuam acessíveis.
- **Rastreamento financeiro** — orçamento previsto (material + mão de obra) vs. realizado por etapa mensal
- **Alertas de estouro** — avisos visuais quando o gasto supera o orçamento (>100%)
- **Indicadores de progresso** — barras de KPI mostrando avanço (%), duração decorrida (%) e gasto (%)
- **Linha do hoje** — marcador visual da data atual no cronograma
- **Sidebar recolhível** — com nome de projeto editável
- **Salvar como template** — persiste o estado completo (grupos, itens, etapas, nome do projeto) no `localStorage` e restaura automaticamente ao reabrir o app

## Estrutura do Projeto

```
carnauba-prototipo/
├── index.html               # Ponto de entrada — carrega React, Babel e CSS
├── app.jsx                  # App, Sidebar, GanttChart, ícones, persistência de template
├── cronograma-itens.jsx     # Cards de ItemCronograma e GrupoItensCronograma
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
