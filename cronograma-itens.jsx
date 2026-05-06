// cronograma-itens.jsx — ItemCronograma + GrupoItensCronograma components
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

// ── Local BarRow (avoids load-order dep on app.jsx) ───────────────────
// Label sits above the bar only; R$ and % are vertically aligned to the bar.
const GroupBarRow = ({ label, pct, absValue, barColor, trackColor, textColor }) => {
  const raw     = Math.max(0, pct || 0);
  const clamped = Math.min(100, raw);
  return (
    <div>
      {/* Label row — offset by the R$ column width so it sits above the bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
        <span style={{ width: 76, flexShrink: 0 }} />
        <span style={{
          flex: 1, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', fontFamily: 'var(--font-display)',
          color: textColor,
        }}>{label}</span>
      </div>
      {/* R$ + bar + % — all on the same baseline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="mono" style={{
          width: 76, flexShrink: 0, textAlign: 'right',
          fontSize: 11, fontWeight: 700, color: textColor,
        }}>{absValue}</span>
        <div style={{ flex: 1, height: 5, background: trackColor, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${clamped}%`, background: barColor, borderRadius: 99, transition: 'width 0.35s var(--ease-out)' }} />
        </div>
        <span className="mono" style={{
          width: 36, flexShrink: 0, textAlign: 'right',
          fontSize: 11, fontWeight: 700, color: textColor,
        }}>{raw}%</span>
      </div>
    </div>
  );
};

// ── Progress pie chart ────────────────────────────────────────────────
// Renders a small filled-pie SVG with "XX%" label to its left.
// overdue=true → warning amber stroke on the circle ring + amber % text.
// 100% → solid success green. else → navy-50 fill on navy-20 background.
const ProgressPie = ({ pct, overdue }) => {
  const size = 20;
  const r    = 7.25; // slightly smaller so the 1.5px stroke stays inside the viewBox
  const cx   = size / 2;
  const cy   = size / 2;
  const clamped = Math.min(100, Math.max(0, pct || 0));

  const fillColor = clamped === 100 ? 'var(--color-success)' : 'var(--color-navy-50)';
  const textColor = overdue ? 'var(--color-warning)' : fillColor;

  let piePath = null;
  if (clamped > 0 && clamped < 100) {
    const angle    = (clamped / 100) * 360;
    const angleRad = ((angle - 90) * Math.PI) / 180;
    const endX     = cx + r * Math.cos(angleRad);
    const endY     = cy + r * Math.sin(angleRad);
    const largeArc = angle > 180 ? 1 : 0;
    piePath = `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${endX.toFixed(3)} ${endY.toFixed(3)} Z`;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <span className="mono" style={{
        fontSize: 10, fontWeight: 700,
        fontFamily: 'var(--font-display)',
        color: textColor,
      }}>{clamped}%</span>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle
          cx={cx} cy={cy} r={r}
          fill="var(--color-navy-20)"
          stroke={overdue ? 'var(--color-warning)' : 'none'}
          strokeWidth="1.5"
        />
        {clamped === 100 && <circle cx={cx} cy={cy} r={r} fill={fillColor} />}
        {piePath && <path d={piePath} fill={fillColor} />}
      </svg>
    </div>
  );
};

// ── Group calculation helpers ─────────────────────────────────────────
// These reference getProgress / getTotalBudget / getTotalSpent / fmtBRL
// from app.jsx — safe because they are only CALLED after app.jsx has run.

const getGroupProgress = (grupo) => {
  if (!grupo.items.length) return 0;
  const sum = grupo.items.reduce((acc, item) => {
    const latest = item.versions[item.versions.length - 1];
    return acc + getProgress(latest);
  }, 0);
  return Math.round(sum / grupo.items.length);
};

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

const getGroupRecebido = (grupo) =>
  grupo.items.reduce((s, item) => {
    const latest = item.versions[item.versions.length - 1];
    return s + latest.etapas.reduce((sum, e) => sum + (Number(e.valorRecebido) || 0), 0);
  }, 0);

// Returns true if the version has any etapa that is past its month end and not completed.
// Mirrors the `monthOver` logic in app.jsx's GanttBar component.
const hasOverdueEtapa = (version) => {
  if (!version?.etapas?.length) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return version.etapas.some(e => {
    if (!e.mes || e.feito) return false;
    const end = new Date(mesToEndISO(e.mes) + 'T00:00:00');
    return today > end;
  });
};

const getGroupHasOverdue = (grupo) =>
  grupo.items.some(item => hasOverdueEtapa(item.versions[item.versions.length - 1]));

// ── ItemCronograma — Trello card ──────────────────────────────────────
const ItemCronograma = ({ item, dragHandleProps, onClick }) => {
  const [hovered, setHovered] = useStateCi(false);
  const latest = item.versions[item.versions.length - 1];

  const progPct     = getProgress(latest);
  const budget      = getTotalBudget(latest);
  const spent       = getTotalSpent(latest);
  const recebido    = latest.etapas.reduce((s, e) => s + (Number(e.valorRecebido) || 0), 0);
  const gastPct     = budget === 0 ? 0 : Math.round((spent    / budget) * 100);
  const recebidoPct = budget === 0 ? 0 : Math.round((recebido / budget) * 100);
  const gastOverrun = spent > budget && budget > 0;
  const isOverdue   = hasOverdueEtapa(latest);

  if (isOverdue) console.log(`[progresso atrasado] item "${latest?.nome}" tem etapa(s) atrasada(s)`);

  return (
    <div
      {...dragHandleProps}
      onClick={() => onClick(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-md)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        border: '1px solid var(--color-gray-200)',
        padding: '10px 12px',
        cursor: 'grab',
        transition: 'box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        userSelect: 'none',
      }}
    >
      {/* Name + progress pie */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{
          fontWeight: 700, color: 'var(--color-navy)',
          fontFamily: 'var(--font-display)', fontSize: 14,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {latest?.nome || <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>Item sem nome</span>}
        </span>
        <ProgressPie pct={progPct} overdue={isOverdue} />
      </div>
      {/* Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <GroupBarRow
          label="Solicitado"
          pct={100}
          absValue={budget ? fmtBRL(budget) : '—'}
          barColor="var(--color-navy-50)"
          trackColor="var(--color-navy-20)"
          textColor="var(--color-navy-50)"
        />
        <GroupBarRow
          label="Recebido"
          pct={recebidoPct}
          absValue={fmtBRL(recebido)}
          barColor="var(--color-blue)"
          trackColor="var(--color-blue-20)"
          textColor="var(--color-blue)"
        />
        <GroupBarRow
          label="Gasto"
          pct={gastPct}
          absValue={fmtBRL(spent)}
          barColor={gastOverrun ? 'var(--color-warning)' : 'var(--color-success)'}
          trackColor="var(--color-sage-20)"
          textColor={gastOverrun ? 'var(--color-warning)' : 'var(--color-success)'}
        />
      </div>
    </div>
  );
};

// ── GrupoHeader — group header for the Gantt left column ─────────────
// Mirrors the GrupoItensCronograma header: name + bars. No add/delete here.
const GrupoHeader = ({ grupo, dragHandleProps, onToggle, onRenameGroup }) => {
  const [editingName, setEditingName] = useStateCi(false);
  const [nameValue,   setNameValue]   = useStateCi(grupo.nome);
  const inputRef = useRefCi(null);

  useEffectCi(() => { setNameValue(grupo.nome); }, [grupo.nome]);
  useEffectCi(() => { if (editingName && inputRef.current) inputRef.current.focus(); }, [editingName]);

  const commitRename = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== grupo.nome) onRenameGroup(trimmed);
    else setNameValue(grupo.nome);
  };

  const progPct     = getGroupProgress(grupo);
  const budget      = getGroupBudget(grupo);
  const spent       = getGroupSpent(grupo);
  const recebido    = getGroupRecebido(grupo);
  const gastPct     = budget === 0 ? 0 : Math.round((spent    / budget) * 100);
  const recebidoPct = budget === 0 ? 0 : Math.round((recebido / budget) * 100);
  const gastOverrun = spent > budget && budget > 0;
  const isOverdue   = getGroupHasOverdue(grupo);

  return (
    <div
      {...dragHandleProps}
      style={{
        padding: '10px 10px 10px 14px',
        background: 'var(--color-navy-10)',
        height: '100%', boxSizing: 'border-box',
        cursor: 'grab', userSelect: 'none',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        border: '1px solid rgba(115,169,199,0.35)',
        borderBottom: 'none',
      }}
    >
      {/* Row: chevron + name + progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-navy)', padding: 2, display: 'flex', flexShrink: 0, borderRadius: 4, transition: 'opacity 0.12s', opacity: 0.5 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
        >
          {grupo.collapsed ? <IconChevronRightSm /> : <IconChevronDown />}
        </button>

        {editingName ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') inputRef.current.blur();
              if (e.key === 'Escape') { setNameValue(grupo.nome); setEditingName(false); }
            }}
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', padding: '1px 4px' }}
          />
        ) : (
          <span
            onDoubleClick={() => setEditingName(true)}
            title="Clique duplo para renomear"
            style={{ flex: 1, fontWeight: 700, color: 'var(--color-navy)', fontFamily: 'var(--font-display)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
          >{grupo.nome}</span>
        )}

        <ProgressPie pct={progPct} overdue={isOverdue} />
      </div>

      {/* Consolidated bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <GroupBarRow
          label="Solicitado" pct={100}
          absValue={budget ? fmtBRL(budget) : '—'}
          barColor="var(--color-navy-50)" trackColor="var(--color-navy-20)" textColor="var(--color-navy-50)"
        />
        <GroupBarRow
          label="Recebido" pct={recebidoPct}
          absValue={fmtBRL(recebido)}
          barColor="var(--color-blue)" trackColor="var(--color-blue-20)" textColor="var(--color-blue)"
        />
        <GroupBarRow
          label="Gasto" pct={gastPct}
          absValue={budget ? fmtBRL(spent) : '—'}
          barColor={gastOverrun ? 'var(--color-warning)' : 'var(--color-success)'}
          trackColor="var(--color-sage-20)"
          textColor={gastOverrun ? 'var(--color-warning)' : 'var(--color-success)'}
        />
      </div>
    </div>
  );
};

// ── GroupFooter — add-item + delete controls at the bottom of a group ─
const GroupFooter = ({ grupo, onAddItemToGroup, onDeleteGroup }) => {
  const [confirmDelete, setConfirmDelete] = useStateCi(false);

  return (
    <div style={{
      padding: '4px 8px',
      background: 'var(--color-navy-10)',
      height: '100%', boxSizing: 'border-box',
      borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
      border: '1px solid rgba(115,169,199,0.35)',
      borderTop: 'none',
    }}>
      {confirmDelete ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px' }}>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--color-navy)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
            Excluir grupo{grupo.items.length > 0 ? ` e ${grupo.items.length} ${grupo.items.length === 1 ? 'item' : 'itens'}` : ''}?
          </span>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
            style={{ background: 'transparent', border: '1px solid rgba(27,60,95,0.25)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 11, color: 'var(--color-navy)', padding: '3px 8px', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
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
            style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-navy)', padding: '5px 4px', borderRadius: 'var(--radius-sm)', textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'opacity 0.12s', opacity: 0.55 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.55'}
          >
            + Adicionar um item
          </button>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-navy)', padding: '5px 6px', display: 'flex', borderRadius: 'var(--radius-sm)', transition: 'color 0.12s, opacity 0.12s', opacity: 0.4 }}
            title="Excluir grupo"
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-navy)'; e.currentTarget.style.opacity = '0.4'; }}
          >
            <IconTrash />
          </button>
        </div>
      )}
    </div>
  );
};

// ── GrupoItensCronograma — Trello list ────────────────────────────────
const GrupoItensCronograma = ({ grupo, dragHandleProps, onToggle, onItemClick, onAddItemToGroup, onRenameGroup, onDeleteGroup }) => {
  const [editingName, setEditingName]   = useStateCi(false);
  const [nameValue, setNameValue]       = useStateCi(grupo.nome);
  const [confirmDelete, setConfirmDelete] = useStateCi(false);
  const inputRef = useRefCi(null);

  useEffectCi(() => { setNameValue(grupo.nome); }, [grupo.nome]);
  useEffectCi(() => { if (editingName && inputRef.current) inputRef.current.focus(); }, [editingName]);

  const commitRename = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== grupo.nome) onRenameGroup(trimmed);
    else setNameValue(grupo.nome);
  };

  const progPct     = getGroupProgress(grupo);
  const budget      = getGroupBudget(grupo);
  const spent       = getGroupSpent(grupo);
  const recebido    = getGroupRecebido(grupo);
  const gastPct     = budget === 0 ? 0 : Math.round((spent    / budget) * 100);
  const recebidoPct = budget === 0 ? 0 : Math.round((recebido / budget) * 100);
  const gastOverrun = spent > budget && budget > 0;
  const isOverdue   = getGroupHasOverdue(grupo);

  return (
    <div style={{
      background: 'var(--color-navy-10)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(115,169,199,0.35)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Group header ─────────────────────────────────────── */}
      <div
        {...dragHandleProps}
        style={{
          padding: '10px 10px 10px 14px',
          background: 'var(--color-navy-10)',
          flexShrink: 0,
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        {/* Row: chevron + name + progress badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--color-navy)', padding: 2, display: 'flex',
              flexShrink: 0, borderRadius: 4, transition: 'opacity 0.12s', opacity: 0.5,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
          >
            {grupo.collapsed ? <IconChevronRightSm /> : <IconChevronDown />}
          </button>

          {editingName ? (
            <input
              ref={inputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') inputRef.current.blur();
                if (e.key === 'Escape') { setNameValue(grupo.nome); setEditingName(false); }
              }}
              onClick={e => e.stopPropagation()}
              style={{ flex: 1, fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', padding: '1px 4px' }}
            />
          ) : (
            <span
              onDoubleClick={() => setEditingName(true)}
              title="Clique duplo para renomear"
              style={{
                flex: 1, fontWeight: 700, color: 'var(--color-navy)',
                fontFamily: 'var(--font-display)', fontSize: 15,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                cursor: 'text',
              }}
            >{grupo.nome}</span>
          )}

          <ProgressPie pct={progPct} overdue={isOverdue} />
        </div>

        {/* Consolidated bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <GroupBarRow
            label="Solicitado"
            pct={100}
            absValue={budget ? fmtBRL(budget) : '—'}
            barColor="var(--color-navy-50)"
            trackColor="var(--color-navy-20)"
            textColor="var(--color-navy-50)"
          />
          <GroupBarRow
            label="Recebido"
            pct={recebidoPct}
            absValue={fmtBRL(recebido)}
            barColor="var(--color-blue)"
            trackColor="var(--color-blue-20)"
            textColor="var(--color-blue)"
          />
          <GroupBarRow
            label="Gasto"
            pct={gastPct}
            absValue={budget ? fmtBRL(spent) : '—'}
            barColor={gastOverrun ? 'var(--color-warning)' : 'var(--color-success)'}
            trackColor="var(--color-sage-20)"
            textColor={gastOverrun ? 'var(--color-warning)' : 'var(--color-success)'}
          />
        </div>
      </div>

      {/* ── Item cards (collapsible) ──────────────────────────── */}
      {!grupo.collapsed && (
        <Droppable droppableId={grupo.id} type="ITEM">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                padding: '6px 8px',
                minHeight: 8,
                background: snapshot.isDraggingOver ? 'rgba(169,200,191,0.15)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              {grupo.items.length === 0 && !snapshot.isDraggingOver && (
                <div style={{
                  padding: '10px 8px', color: 'var(--color-gray-400)',
                  fontSize: 12, textAlign: 'center', fontStyle: 'italic',
                }}>
                  Nenhum item
                </div>
              )}
              {grupo.items.map((item, iIdx) => (
                <Draggable key={item.id} draggableId={item.id} index={iIdx}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={{
                        marginBottom: 6,
                        opacity: snapshot.isDragging ? 0.88 : 1,
                        ...provided.draggableProps.style,
                      }}
                    >
                      <ItemCronograma
                        item={item}
                        dragHandleProps={provided.dragHandleProps}
                        onClick={onItemClick}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(115,169,199,0.3)',
        padding: '4px 8px',
        flexShrink: 0,
        background: 'var(--color-navy-10)',
      }}>
        {confirmDelete ? (
          /* Inline confirmation */
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px' }}>
            <span style={{ flex: 1, fontSize: 11, color: 'var(--color-navy)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
              Excluir grupo{grupo.items.length > 0 ? ` e ${grupo.items.length} ${grupo.items.length === 1 ? 'item' : 'itens'}` : ''}?
            </span>
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              style={{
                background: 'transparent', border: '1px solid rgba(27,60,95,0.25)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontSize: 11, color: 'var(--color-navy)', padding: '3px 8px',
                fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
              }}
            >Cancelar</button>
            <button
              onClick={e => { e.stopPropagation(); onDeleteGroup(); }}
              style={{
                background: 'var(--color-error)', border: 'none',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontSize: 11, color: 'white', padding: '3px 8px',
                fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
              }}
            >Excluir</button>
          </div>
        ) : (
          /* Normal footer: add item (left) + trash (right) */
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={e => { e.stopPropagation(); onAddItemToGroup(); }}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: 12, color: 'var(--color-navy)',
                padding: '5px 4px', borderRadius: 'var(--radius-sm)',
                textAlign: 'left', fontFamily: 'var(--font-body)',
                transition: 'opacity 0.12s', opacity: 0.55,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.55'}
            >
              + Adicionar um item
            </button>
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--color-navy)', padding: '5px 6px', display: 'flex',
                borderRadius: 'var(--radius-sm)', transition: 'color 0.12s, opacity 0.12s',
                opacity: 0.4,
              }}
              title="Excluir grupo"
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-navy)'; e.currentTarget.style.opacity = '0.4'; }}
            >
              <IconTrash />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { GrupoHeader, GroupFooter, GrupoItensCronograma, ItemCronograma, DragDropContext, Droppable, Draggable });
