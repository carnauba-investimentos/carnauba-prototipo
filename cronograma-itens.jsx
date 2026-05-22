// cronograma-itens.jsx — ProgressCard + ItemCronograma + GrupoHeader + GrupoItensCronograma
const { useState: useStateCi, useRef: useRefCi, useEffect: useEffectCi } = React;
const { DragDropContext, Droppable, Draggable } = window.ReactBeautifulDnd;

// ── Icons ─────────────────────────────────────────────────────────────
const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconChevronRightSm = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2 3.5h9M5 3.5V2.5h3v1M3.5 3.5l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5.5 6v3M7.5 6v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

// ── VM color constants ────────────────────────────────────────────────
const VM_NEUTRAL = {
  bg1: '#EDF1F6', bg2: '#DFE4EA', bg3: '#BDC6D6',
  text1: '#8F99A2', text2: '#4E708E', text3: '#1E1E1E',
};
const VM_FINANCEIRO = { complete: '#389579', active: '#92B7AD', text1: '#255A4A', text2: '#0A4231' };
const VM_FISICO     = { complete: '#3289C0', active: '#8BBBD6', text1: '#064267', text2: '#3C7294' };
const VM_WARNING    = { complete: '#C08A2A', active: '#C8A05A', text1: '#704D0F', text2: '#704D0F' };


// ── Físico calculation helpers ────────────────────────────────────────
// These call mesToStartISO from app.jsx — safe because components are rendered after app.jsx runs.

// Single source of truth for FISICO "done" — mirrors MonthCard: only percentualRealizado >= 100
// feito is ignored in FISICO mode; it was the pre-FISICO marker and is irrelevant here
const etapaIsDone = (e) => (Number(e.percentualRealizado) || 0) >= 100;

// Single source of truth for "should this etapa show warning" — mirrors MonthCard's showWarning.
// Uses new Date(y, m, 0) exactly like MonthCard, not mesToEndISO.
const etapaShowsWarning = (e) => {
  if (!e.mes || etapaIsDone(e)) return false;
  const [y, m] = e.mes.split('-').map(Number);
  return new Date(y, m, 0) < new Date();
};

const getRealizadoPct = (version) =>
  Math.min(100, (version?.etapas || [])
    .reduce((s, e) => s + (Number(e.percentual) || 0) * (Number(e.percentualRealizado) || 0) / 100, 0));

const getAtivoPct = (version) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.min(100, (version?.etapas || [])
    .filter(e => e.mes && new Date(e.mes + '-01T00:00:00') <= today)
    .reduce((s, e) => s + (Number(e.percentual) || 0), 0));
};

// Overdue % = sum of percentual for months where etapaShowsWarning is true
const getOverduePct = (version) =>
  Math.min(100, (version?.etapas || [])
    .filter(e => etapaShowsWarning(e))
    .reduce((s, e) => s + (Number(e.percentual) || 0), 0));

// Overdue realized % = realized portion within overdue months only
const getOverdueRealizadoPct = (version) =>
  Math.min(100, (version?.etapas || [])
    .filter(e => etapaShowsWarning(e))
    .reduce((s, e) => s + (Number(e.percentual) || 0) * (Number(e.percentualRealizado) || 0) / 100, 0));

const getGroupOverduePct = (grupo) => {
  if (!grupo.items.length) return 0;
  const sum = grupo.items.reduce((acc, item) => {
    const latest = item.versions[item.versions.length - 1];
    return acc + getOverduePct(latest);
  }, 0);
  return Math.round(sum / grupo.items.length);
};

const getGroupOverdueRealizadoPct = (grupo) => {
  if (!grupo.items.length) return 0;
  const sum = grupo.items.reduce((acc, item) => {
    const latest = item.versions[item.versions.length - 1];
    return acc + getOverdueRealizadoPct(latest);
  }, 0);
  return Math.round(sum / grupo.items.length);
};

const getGroupRealizadoPct = (grupo) => {
  if (!grupo.items.length) return 0;
  const sum = grupo.items.reduce((acc, item) => {
    const latest = item.versions[item.versions.length - 1];
    return acc + getRealizadoPct(latest);
  }, 0);
  return Math.round(sum / grupo.items.length);
};

const getGroupAtivoPct = (grupo) => {
  if (!grupo.items.length) return 0;
  const sum = grupo.items.reduce((acc, item) => {
    const latest = item.versions[item.versions.length - 1];
    return acc + getAtivoPct(latest);
  }, 0);
  return Math.round(sum / grupo.items.length);
};

// ── Financial calculation helpers ─────────────────────────────────────
const getGroupBudget = (grupo) =>
  grupo.items.reduce((s, item) => {
    const latest = item.versions[item.versions.length - 1];
    return s + getTotalBudget(latest);
  }, 0);

const getGroupSpent = (grupo) =>
  grupo.items.reduce((s, item) => {
    const latest = item.versions[item.versions.length - 1];
    return s + getTotalSpent(latest);
  }, 0);

const etapaRecebido = (e) =>
  (Number(e.recebidoMaterial)||0) + (Number(e.recebidoMaoDeObra)||0) || (Number(e.valorRecebido)||0);

const getGroupRecebido = (grupo) =>
  grupo.items.reduce((s, item) => {
    const latest = item.versions[item.versions.length - 1];
    return s + latest.etapas.reduce((sum, e) => sum + etapaRecebido(e), 0);
  }, 0);

const hasOverdueEtapa = (version) => {
  if (!version?.etapas?.length) return false;
  return version.etapas.some(e => etapaShowsWarning(e));
};

const getGroupHasOverdue = (grupo) =>
  grupo.items.some(item => hasOverdueEtapa(item.versions[item.versions.length - 1]));

// ── Segment builders ──────────────────────────────────────────────────
// Each segment: { pct, bg, label, labelColor, labelSize? }
// Segments are rendered back-to-front (index 0 = full-width track, index 2 = frontmost fill).

const hasEtapaFinancialOverrun = (etapas) =>
  (etapas || []).some(e => {
    const rec = etapaRecebido(e);
    const gas = (Number(e.gastoMaterial)||0) + (Number(e.gastoMaoDeObra)||0);
    return gas > rec;
  });

const hasGroupFinancialOverrun = (grupo) =>
  grupo.items.some(item => {
    const latest = item.versions[item.versions.length - 1];
    return hasEtapaFinancialOverrun(latest.etapas);
  });

const buildFinancialSegments = (solicitado, recebido, gasto, forceWarn = false) => {
  const s = solicitado || 0, r = recebido || 0, g = gasto || 0;
  const warn    = forceWarn || g > r;
  const palette = warn ? VM_WARNING : VM_FINANCEIRO;
  const recPct  = s > 0 ? Math.min(100, r / s * 100) : 0;
  const gasPct  = s > 0 ? Math.min(100, g / s * 100) : 0;
  return [
    { pct: 100,    bg: VM_NEUTRAL.bg3,    label: s > 0 ? fmtK(s) : '0k', labelColor: VM_NEUTRAL.text1 },
    { pct: recPct, bg: palette.active,    label: r > 0 ? fmtK(r) : null, labelColor: warn ? VM_WARNING.text1 : VM_FINANCEIRO.text1 },
    { pct: gasPct, bg: palette.complete,  label: g > 0 ? fmtK(g) : null, labelColor: warn ? VM_WARNING.text1 : VM_FINANCEIRO.text2 },
  ];
};

const buildFisicoSegments = (realizadoPct, ativoPct, overduePct = 0, overdueRealizadoPct = 0, showTrackLabel = true) => {
  const rp  = Math.max(0, Math.min(100, realizadoPct || 0));
  const ap  = Math.max(0, Math.min(100, ativoPct || 0));
  const op  = Math.max(0, Math.min(100, overduePct || 0));
  const orp = Math.max(0, Math.min(op, overdueRealizadoPct || 0));

  const overdueUnrealized          = Math.max(0, op - orp);
  const nonOverdueActiveUnrealized = Math.max(0, (ap - op) - (rp - orp));

  return [
    { pct: 100,                      left: 0,                        bg: VM_NEUTRAL.bg3,    label: showTrackLabel ? '100%' : null,                                        labelColor: VM_NEUTRAL.text1 },
    { pct: rp,                       left: 0,                        bg: VM_FISICO.complete, label: rp > 0 ? `${Math.round(rp)}%` : null,                                  labelColor: VM_FISICO.text1 },
    { pct: overdueUnrealized,        left: rp,                       bg: VM_WARNING.active, label: overdueUnrealized > 0 ? `${Math.round(overdueUnrealized)}%` : null,     labelColor: VM_WARNING.text2 },
    { pct: nonOverdueActiveUnrealized, left: rp + overdueUnrealized, bg: VM_FISICO.active,  label: nonOverdueActiveUnrealized > 0 ? `${Math.round(nonOverdueActiveUnrealized)}%` : null, labelColor: VM_FISICO.text2 },
  ];
};

const buildSegments = (vizMode, { solicitado, recebido, gasto, realizadoPct, ativoPct, overduePct, overdueRealizadoPct, forceWarn = false }) =>
  vizMode === 'fisico'
    ? buildFisicoSegments(realizadoPct || 0, ativoPct || 0, overduePct || 0, overdueRealizadoPct || 0, false)
    : buildFinancialSegments(solicitado || 0, recebido || 0, gasto || 0, forceWarn);

// ── ProgressCard — unified parametric card/bar component ──────────────
//
// The card background IS the bar: segment divs fill the header area absolutely.
// Title and chevron float above (z-index 20). Labels sit at bottom-right of
// each segment's right edge (inside the segment, z-index 21).
//
// Props:
//   minHeight      — header min height in px (default 64)
//   borderRadius   — corner radius in px (default 12)
//   title          — string or null
//   titleSize      — font-size in px (default 15)
//   titleColor     — css color string (default VM_NEUTRAL.text3)
//   onTitleEdit    — fn(newName) | null — enables double-click rename
//   expandable     — bool (default false) — shows chevron, enables body/footer
//   collapsed      — bool — controlled by parent
//   onToggle       — fn()
//   body           — ReactNode shown below header when expanded
//   footer         — ReactNode shown below body when expanded
//   bodyBg         — bg color for body+footer area (default VM_NEUTRAL.bg2)
//   segments       — array of { pct, bg, label, labelColor, labelSize? }
//   onClick        — fn() | null — makes header clickable
//   dragHandleProps — spread onto header div (for DnD)

const ProgressCard = ({
  minHeight = 64,
  borderRadius = 12,
  title,
  titleSize = 15,
  titleColor = VM_NEUTRAL.text3,
  onTitleEdit,
  expandable = false,
  collapsed,
  onToggle,
  body,
  footer,
  bodyBg = VM_NEUTRAL.bg2,
  segments = [],
  onClick,
  dragHandleProps,
  dragging = false,
}) => {
  const [editingName, setEditingName] = useStateCi(false);
  const [nameValue, setNameValue]     = useStateCi(title || '');
  const inputRef  = useRefCi(null);
  const headerRef = useRefCi(null);

  useEffectCi(() => { setNameValue(title || ''); }, [title]);
  useEffectCi(() => { if (editingName && inputRef.current) inputRef.current.focus(); }, [editingName]);

  const commitRename = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== title && onTitleEdit) onTitleEdit(trimmed);
    else setNameValue(title || '');
  };

  const hasExpanded = expandable && !collapsed && (body || footer);
  const headerBR = (expandable && !collapsed)
    ? `${borderRadius}px ${borderRadius}px 0 0`
    : `${borderRadius}px`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header: segments fill + title overlay ── */}
      <div
        ref={headerRef}
        {...dragHandleProps}
        onClick={onClick}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: headerBR,
          minHeight,
          cursor: onClick ? 'pointer' : (dragHandleProps ? 'grab' : 'default'),
          userSelect: 'none',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          flex: hasExpanded ? '0 0 auto' : '1 1 auto',
        }}
      >
        {/* Segment fills (side-by-side, no overlap) */}
        {segments.map((seg, i) => {
          const left  = Math.min(100, Math.max(0, seg.left || 0));
          const pct   = Math.min(100 - left, Math.max(0, seg.pct || 0));
          if (pct === 0 && i > 0) return null; // skip zero-width non-base segments entirely
          return (
            <div key={i} style={{
              position: 'absolute', top: 0, bottom: 0, left: `${left}%`,
              width: `${pct}%`,
              background: seg.bg,
              overflow: 'hidden',
              transition: 'width 0.35s var(--ease-out)',
            }}>
              {seg.label && pct > 0 && (
                <span style={{
                  position: 'absolute', bottom: 6, left: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: seg.labelSize || 11,
                  fontWeight: 700,
                  color: seg.labelColor,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  zIndex: 1,
                  userSelect: 'none',
                }}>{seg.label}</span>
              )}
            </div>
          );
        })}

        {/* Title / chevron overlay (above segments) */}
        {(title != null || expandable) && (
          <div style={{
            position: 'relative', zIndex: 20,
            display: 'flex', alignItems: 'flex-start', gap: 6,
            padding: '12px 14px 6px 12px',
            pointerEvents: 'auto',
          }}>
            {expandable && (
              <button
                onClick={e => { e.stopPropagation(); onToggle?.(); }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: titleColor, padding: 2, display: 'flex', flexShrink: 0,
                  borderRadius: 4, marginTop: 2,
                  transition: 'opacity 0.12s', opacity: 0.7,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
              >
                {collapsed ? <IconChevronRightSm /> : <IconChevronDown />}
              </button>
            )}

            {title != null && (
              editingName && onTitleEdit ? (
                <input
                  ref={inputRef}
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') inputRef.current.blur();
                    if (e.key === 'Escape') { setNameValue(title || ''); setEditingName(false); }
                  }}
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1, fontSize: titleSize, fontWeight: 700,
                    fontFamily: 'var(--font-display)', padding: '1px 4px',
                    color: titleColor, background: 'rgba(255,255,255,0.7)',
                    border: 'none', borderRadius: 4, outline: 'none',
                  }}
                />
              ) : (
                <span
                  onDoubleClick={onTitleEdit ? (e) => { e.stopPropagation(); setEditingName(true); } : undefined}
                  title={onTitleEdit ? 'Clique duplo para renomear' : undefined}
                  style={{
                    flex: 1, fontWeight: 700, color: titleColor,
                    fontFamily: 'var(--font-display)', fontSize: titleSize,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    cursor: onTitleEdit ? 'text' : 'inherit',
                  }}
                >{title}</span>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Body + Footer (expanded groups only) ── */}
      {(expandable && !collapsed) && <div style={{ height: 8, background: bodyBg, flexShrink: 0 }} />}
      {hasExpanded && (
        <div style={{ background: bodyBg, flex: 1, borderRadius: `0 0 ${borderRadius}px ${borderRadius}px`, overflow: 'hidden' }}>
          {body}
          {footer}
        </div>
      )}
    </div>
  );
};

// ── ItemCronograma ────────────────────────────────────────────────────
const ItemCronograma = ({ item, dragHandleProps, onClick, vizMode = 'financeiro', isDragging = false }) => {
  const [hovered, setHovered] = useStateCi(false);
  const latest   = item.versions[item.versions.length - 1];
  const solicitado = getTotalBudget(latest);
  const gasto      = getTotalSpent(latest);
  const recebido   = latest.etapas.reduce((s, e) => s + etapaRecebido(e), 0);
  const realizado        = getRealizadoPct(latest);
  const ativo            = getAtivoPct(latest);
  const overdue          = getOverduePct(latest);
  const overdueRealizado = getOverdueRealizadoPct(latest);
  const hasOverrun       = hasEtapaFinancialOverrun(latest.etapas);

  const segments = buildSegments(vizMode, { solicitado, recebido, gasto, realizadoPct: realizado, ativoPct: ativo, overduePct: overdue, overdueRealizadoPct: overdueRealizado, forceWarn: hasOverrun });

  const atrasoPct = Math.max(0, overdue - overdueRealizado);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: hovered && !isDragging ? 'translate(0.75px, -0.75px)' : 'none',
        boxShadow: hovered && !isDragging ? '-1px 1px 3px rgba(0,0,0,0.25)' : 'none',
        borderRadius: 10,
        transition: 'transform 0.15s ease, box-shadow 0.01s ease',
      }}
    >
      <Tooltip solicitado={solicitado} recebido={recebido} gasto={gasto} warn={hasOverrun || gasto > recebido} disabled={vizMode !== 'financeiro' || isDragging}>
        <FisicoTooltip futuro={Math.max(0, 100 - ativo)} planejado={Math.max(0, (ativo - overdue) - (realizado - overdueRealizado))} realizado={realizado} atraso={atrasoPct} disabled={vizMode !== 'fisico' || isDragging}>
          <ProgressCard
            minHeight={50}
            borderRadius={10}
            title={latest?.nome || 'Item sem nome'}
            titleSize={14}
            titleColor={VM_NEUTRAL.text3}
            segments={segments}
            onClick={() => onClick(item)}
            dragHandleProps={dragHandleProps}
            dragging={isDragging}
          />
        </FisicoTooltip>
      </Tooltip>
    </div>
  );
};

// ── GrupoHeader — left-column group header row (used inside Gantt rows) ─
// Renders only the header bar (no body/footer — those are handled by app.jsx row structure).
const GrupoHeader = ({ grupo, dragHandleProps, onToggle, onRenameGroup, vizMode = 'financeiro', isDragging = false }) => {
  const solicitado = getGroupBudget(grupo);
  const gasto      = getGroupSpent(grupo);
  const recebido   = getGroupRecebido(grupo);
  const realizado        = getGroupRealizadoPct(grupo);
  const ativo            = getGroupAtivoPct(grupo);
  const overdue          = getGroupOverduePct(grupo);
  const overdueRealizado = getGroupOverdueRealizadoPct(grupo);
  const hasOverrun       = hasGroupFinancialOverrun(grupo);

  const segments = buildSegments(vizMode, { solicitado, recebido, gasto, realizadoPct: realizado, ativoPct: ativo, overduePct: overdue, overdueRealizadoPct: overdueRealizado, forceWarn: hasOverrun });

  const atrasoPct = Math.max(0, overdue - overdueRealizado);

  return (
    <div style={{ height: '100%' }} onClick={onToggle}>
      <Tooltip solicitado={solicitado} recebido={recebido} gasto={gasto} warn={hasOverrun || gasto > recebido} disabled={vizMode !== 'financeiro' || isDragging}>
        <FisicoTooltip futuro={Math.max(0, 100 - ativo)} planejado={Math.max(0, (ativo - overdue) - (realizado - overdueRealizado))} realizado={realizado} atraso={atrasoPct} disabled={vizMode !== 'fisico' || isDragging}>
          <ProgressCard
            minHeight={56}
            borderRadius={10}
            title={grupo.nome}
            titleSize={15}
            titleColor={VM_NEUTRAL.text3}
            onTitleEdit={onRenameGroup}
            expandable
            collapsed={grupo.collapsed}
            onToggle={onToggle}
            segments={segments}
            dragHandleProps={dragHandleProps}
            dragging={isDragging}
          />
        </FisicoTooltip>
      </Tooltip>
    </div>
  );
};

// ── GroupFooter — add-item + delete controls ───────────────────────────
const GroupFooter = ({ grupo, onAddItemToGroup, onDeleteGroup }) => {
  const [confirmDelete, setConfirmDelete] = useStateCi(false);

  return (
    <div style={{ padding: '4px 8px' }}>
      {confirmDelete ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px' }}>
          <span style={{ flex: 1, fontSize: 11, color: VM_NEUTRAL.text3, fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
            Excluir grupo{grupo.items.length > 0 ? ` e ${grupo.items.length} ${grupo.items.length === 1 ? 'item' : 'itens'}` : ''}?
          </span>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
            style={{ background: 'transparent', border: `1px solid ${VM_NEUTRAL.bg3}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 11, color: VM_NEUTRAL.text3, padding: '3px 8px', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
          >Cancelar</button>
          <button
            onClick={e => { e.stopPropagation(); onDeleteGroup(); }}
            style={{ background: 'var(--color-error)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 11, color: 'white', padding: '3px 8px', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
          >Excluir</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={e => { e.stopPropagation(); onAddItemToGroup(); }}
            style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: VM_NEUTRAL.text2, padding: '5px 4px', borderRadius: 'var(--radius-sm)', textAlign: 'left', fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'opacity 0.12s', opacity: 0.8 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
          >
            + Adicionar um item
          </button>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: VM_NEUTRAL.text2, padding: '5px 6px', display: 'flex', borderRadius: 'var(--radius-sm)', transition: 'color 0.12s, opacity 0.12s', opacity: 0.5 }}
            title="Excluir grupo"
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.color = VM_NEUTRAL.text2; e.currentTarget.style.opacity = '0.5'; }}
          >
            <IconTrash />
          </button>
        </div>
      )}
    </div>
  );
};

// ── GrupoItensCronograma — standalone expandable group card ───────────
// Uses ProgressCard with body (item list) and footer (add/delete).
// Not currently used directly in app.jsx (which uses GrupoHeader in row layout)
// but kept as a reusable component.
const GrupoItensCronograma = ({ grupo, dragHandleProps, onToggle, onItemClick, onAddItemToGroup, onRenameGroup, onDeleteGroup, vizMode = 'financeiro' }) => {
  const [confirmDelete, setConfirmDelete] = useStateCi(false);

  const solicitado = getGroupBudget(grupo);
  const gasto      = getGroupSpent(grupo);
  const recebido   = getGroupRecebido(grupo);
  const realizado        = getGroupRealizadoPct(grupo);
  const ativo            = getGroupAtivoPct(grupo);
  const overdue          = getGroupOverduePct(grupo);
  const overdueRealizado = getGroupOverdueRealizadoPct(grupo);

  const segments = buildSegments(vizMode, { solicitado, recebido, gasto, realizadoPct: realizado, ativoPct: ativo, overduePct: overdue, overdueRealizadoPct: overdueRealizado });

  const body = (
    <Droppable droppableId={grupo.id} type="ITEM">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          style={{
            padding: '6px 8px',
            minHeight: 8,
            background: snapshot.isDraggingOver ? 'rgba(169,200,191,0.12)' : 'transparent',
            transition: 'background 0.15s',
          }}
        >
          {grupo.items.length === 0 && !snapshot.isDraggingOver && (
            <div style={{ padding: '10px 8px', color: VM_NEUTRAL.text1, fontSize: 12, textAlign: 'center', fontStyle: 'italic' }}>
              Nenhum item
            </div>
          )}
          {grupo.items.map((item, iIdx) => (
            <Draggable key={item.id} draggableId={item.id} index={iIdx}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  style={{ marginBottom: 6, opacity: snapshot.isDragging ? 0.88 : 1, ...provided.draggableProps.style }}
                >
                  <ItemCronograma
                    item={item}
                    dragHandleProps={provided.dragHandleProps}
                    onClick={onItemClick}
                    vizMode={vizMode}
                    isDragging={snapshot.isDragging}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  const footer = (
    <div>
      {confirmDelete ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
          <span style={{ flex: 1, fontSize: 11, color: VM_NEUTRAL.text3, fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
            Excluir grupo{grupo.items.length > 0 ? ` e ${grupo.items.length} ${grupo.items.length === 1 ? 'item' : 'itens'}` : ''}?
          </span>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
            style={{ background: 'transparent', border: `1px solid ${VM_NEUTRAL.bg3}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 11, color: VM_NEUTRAL.text3, padding: '3px 8px', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
          >Cancelar</button>
          <button
            onClick={e => { e.stopPropagation(); onDeleteGroup(); }}
            style={{ background: 'var(--color-error)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 11, color: 'white', padding: '3px 8px', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
          >Excluir</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
          <button
            onClick={e => { e.stopPropagation(); onAddItemToGroup(); }}
            style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: VM_NEUTRAL.text2, padding: '8px 8px', borderRadius: 'var(--radius-sm)', textAlign: 'left', fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'opacity 0.12s', opacity: 0.8 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
          >
            + Adicionar um item
          </button>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: VM_NEUTRAL.text2, padding: '8px 10px', display: 'flex', borderRadius: 'var(--radius-sm)', transition: 'color 0.12s, opacity 0.12s', opacity: 0.5 }}
            title="Excluir grupo"
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.color = VM_NEUTRAL.text2; e.currentTarget.style.opacity = '0.5'; }}
          >
            <IconTrash />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <ProgressCard
      minHeight={60}
      borderRadius={12}
      title={grupo.nome}
      titleSize={15}
      titleColor={VM_NEUTRAL.text3}
      onTitleEdit={onRenameGroup}
      expandable
      collapsed={grupo.collapsed}
      onToggle={onToggle}
      body={body}
      footer={footer}
      bodyBg={VM_NEUTRAL.bg2}
      segments={segments}
      dragHandleProps={dragHandleProps}
    />
  );
};

Object.assign(window, {
  ProgressCard,
  GrupoHeader, GroupFooter, GrupoItensCronograma, ItemCronograma,
  DragDropContext, Droppable, Draggable,
  buildSegments, buildFinancialSegments, buildFisicoSegments,
  etapaIsDone, etapaShowsWarning, etapaRecebido, hasEtapaFinancialOverrun, hasGroupFinancialOverrun,
  getRealizadoPct, getAtivoPct, getOverduePct, getOverdueRealizadoPct,
  getGroupRealizadoPct, getGroupAtivoPct, getGroupOverduePct, getGroupOverdueRealizadoPct,
  VM_NEUTRAL, VM_FINANCEIRO, VM_FISICO, VM_WARNING,
});
