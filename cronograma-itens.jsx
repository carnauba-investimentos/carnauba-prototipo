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
// barColor / trackColor override the default sage palette when provided
const GroupBarRow = ({ label, pct, valueFmt, overrun, barColor: barColorProp, trackColor }) => {
  const clamped = Math.min(100, Math.max(0, pct || 0));
  const barColor = overrun
    ? 'var(--color-warning)'
    : barColorProp
    ? barColorProp
    : clamped === 100
    ? 'var(--color-success)'
    : 'var(--color-sage)';
  const track = trackColor || 'var(--color-sage-20)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.07em', fontFamily: 'var(--font-display)',
          color: 'rgb(78,110,138)'
        }}>{label}</span>
        <span className="mono" style={{
          fontSize: 10, fontWeight: 700,
          color: overrun ? 'var(--color-warning)' : clamped === 100 ? 'var(--color-success)' : 'var(--color-navy)'
        }}>{valueFmt}</span>
      </div>
      <div style={{ height: 5, background: track, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${clamped}%`, background: barColor, borderRadius: 99, transition: 'width 0.35s var(--ease-out)' }} />
      </div>
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

// ── ItemCronograma — Trello card ──────────────────────────────────────
const ItemCronograma = ({ item, dragHandleProps, onClick }) => {
  const [hovered, setHovered] = useStateCi(false);
  const latest = item.versions[item.versions.length - 1];

  const progPct = getProgress(latest);
  const budget  = getTotalBudget(latest);
  const spent   = getTotalSpent(latest);
  const gastPct = budget === 0 ? 0 : Math.round((spent / budget) * 100);
  const gastOverrun = spent > budget && budget > 0;

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
      {/* Name */}
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <span style={{
          fontWeight: 700, color: 'var(--color-navy)',
          fontFamily: 'var(--font-display)', fontSize: 14,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
        }}>
          {latest?.nome || <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>Item sem nome</span>}
        </span>
      </div>
      {/* Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <GroupBarRow label="Progresso" pct={progPct} valueFmt={`${progPct}%`} />
        <GroupBarRow
          label="Gastos"
          pct={gastPct}
          valueFmt={budget ? `${fmtBRL(spent)} / ${fmtBRL(budget)}` : '—'}
          overrun={gastOverrun}
        />
      </div>
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

  const progPct = getGroupProgress(grupo);
  const budget  = getGroupBudget(grupo);
  const spent   = getGroupSpent(grupo);
  const gastPct = budget === 0 ? 0 : Math.round((spent / budget) * 100);
  const gastOverrun = spent > budget && budget > 0;

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
          borderLeft: '3px solid var(--color-blue)',
          background: 'var(--color-navy-10)',
          flexShrink: 0,
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        {/* Row: name + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
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
        </div>

        {/* Consolidated bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <GroupBarRow
            label="Progresso"
            pct={progPct}
            valueFmt={`${progPct}%`}
            barColor="var(--color-blue)"
            trackColor="rgba(115,169,199,0.25)"
          />
          <GroupBarRow
            label="Gastos"
            pct={gastPct}
            valueFmt={budget ? `${fmtBRL(spent)} / ${fmtBRL(budget)}` : '—'}
            overrun={gastOverrun}
            barColor="var(--color-navy)"
            trackColor="rgba(27,60,95,0.15)"
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

Object.assign(window, { GrupoItensCronograma, ItemCronograma, DragDropContext, Droppable, Draggable });
