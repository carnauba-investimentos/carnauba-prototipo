// app.jsx — Carnaúba DS · v4 with Grupos de Itens de Cronograma
const { useState, useRef, useEffect } = React;

// ── Helpers ───────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().split('T')[0];

const fmtDatePT = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${String(y).slice(-2)}`;
};

const fmtCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(v) || 0);

const fmtBRL = (v) =>
  'R$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(v) || 0);

const fmtK = (v) => {
  const n = Number(v) || 0;
  return n >= 1000 ? Math.round(n / 1000) + 'K' : String(Math.round(n));
};

const diffDays = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000));
};

const mesToStartISO = (mes) => mes ? `${mes}-01` : null;
const mesToEndISO = (mes) => {
  if (!mes) return null;
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m, 0).toISOString().split('T')[0];
};

const getVersionRange = (version) => {
  if (!version) return null;
  const starts = version.etapas.filter((e) => e.mes).map((e) => mesToStartISO(e.mes));
  const ends   = version.etapas.filter((e) => e.mes).map((e) => mesToEndISO(e.mes));
  if (!starts.length || !ends.length) return null;
  return {
    start: starts.reduce((a, b) => a < b ? a : b),
    end:   ends.reduce((a, b) => a > b ? a : b),
  };
};

const getProgress = (v) => {
  if (!v || !v.etapas.length) return 0;
  return Math.min(100, v.etapas.reduce((sum, e) => sum + (e.feito ? (Number(e.percentual) || 0) : 0), 0));
};

const getTotalBudget = (v) =>
  (v?.etapas || []).reduce((s, e) => s + (Number(e.orcamentoMaterial) || 0) + (Number(e.orcamentoMaoDeObra) || 0), 0);

const getTotalSpent = (v) =>
  (v?.etapas || []).reduce((s, e) => s + (Number(e.gastoMaterial) || 0) + (Number(e.gastoMaoDeObra) || 0), 0);

// ── Gantt layout constants ─────────────────────────────────────────
const PX_DAY             = 3.5;
const COL_GAP            = 8;
const CARD_PAD           = 8;
const LEFT_COL_W         = 300;
const HEADER_H           = 40;
const GROUP_ROW_H          = 80;  // group header bar row
const GROUP_ROW_H_COLLAPSED = 80; // same: collapsed shows same bar
const GROUP_FOOTER_ROW_H   = 40;  // footer row
const ITEM_ROW_H         = 68;   // item bar row

// ── Icons ─────────────────────────────────────────────────────────
const IconCalendar = () =>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3" width="13" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5 1.5v3M11 1.5v3M1.5 7h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;

const IconChevronLeft = () =>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;

const IconChevronRight = () =>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;

const IconUser = () =>
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
    <path d="M1.5 14c0-3.314 2.686-5.5 6-5.5s6 2.186 6 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;

const IconEdit = () =>
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M1 9.5h9M7 1.5l2 2L3.5 9H1.5V7L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;

const IconSave = () =>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h6.086a1 1 0 0 1 .707.293l2.414 2.414A1 1 0 0 1 13 4.414V11.5A1.5 1.5 0 0 1 11.5 13h-9A1.5 1.5 0 0 1 1 11.5v-9Z" stroke="currentColor" strokeWidth="1.3" />
    <rect x="4" y="1" width="5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
    <rect x="3" y="7.5" width="8" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>;

// ── Template persistence ───────────────────────────────────────────
const TEMPLATE_KEY = 'carnauba_template';

const saveTemplate = (projectName, grupos) => {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ projectName, grupos }));
};

const loadTemplate = () => {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};


// ── Sidebar ────────────────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle, projectName, onProjectNameChange, onSaveTemplate }) => {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);

  const handleSaveTemplate = () => {
    onSaveTemplate();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  return (
    <div style={{
      width: collapsed ? 52 : 210, flexShrink: 0,
      background: 'var(--color-navy)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s var(--ease-out)',
      overflow: 'hidden', zIndex: 10,
    }}>
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 12px' : '0 12px 0 14px',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, gap: 8,
      }}>
        {!collapsed &&
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing
              ? <input
                  ref={inputRef}
                  value={projectName}
                  onChange={(e) => onProjectNameChange(e.target.value)}
                  onBlur={() => setEditing(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(115,169,199,0.4)',
                    borderRadius: 'var(--radius-sm)', color: 'white', fontSize: 13, fontWeight: 600,
                    padding: '3px 7px', width: '100%', fontFamily: 'var(--font-display)', outline: 'none',
                  }} />
              : <span
                  onClick={() => setEditing(true)}
                  style={{
                    fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontFamily: 'var(--font-display)', cursor: 'text', display: 'block',
                  }}>
                  {projectName || 'Projeto'}
                </span>
            }
          </div>
        }
        <button onClick={onToggle} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 4,
          display: 'flex', transition: 'color 0.15s', flexShrink: 0,
        }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      <div style={{ flex: 1, padding: '10px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 'var(--radius-md)',
          background: 'rgba(115,169,199,0.15)',
          justifyContent: collapsed ? 'center' : 'flex-start', cursor: 'pointer',
        }}>
          <span style={{ color: 'var(--color-blue)', flexShrink: 0 }}><IconCalendar /></span>
          {!collapsed &&
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-blue)', whiteSpace: 'nowrap' }}>
              Cronograma
            </span>
          }
        </div>
      </div>

      <div style={{
        height: 44, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 12px' : '0 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <button
          onClick={handleSaveTemplate}
          title="Salvar como template"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 0, opacity: saved ? 1 : 0.35, transition: 'opacity 0.15s',
            color: saved ? 'rgba(115,169,199,0.9)' : 'rgba(255,255,255,0.8)',
          }}
          onMouseEnter={e => { if (!saved) e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { if (!saved) e.currentTarget.style.opacity = '0.35'; }}
        >
          <IconSave />
          {!collapsed && (
            <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {saved ? 'Salvo!' : 'Salvar como template'}
            </span>
          )}
        </button>
      </div>

      <div style={{
        height: 52, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 12px' : '0 14px', gap: 10,
        borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)',
        }}><IconUser /></div>
        {!collapsed && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, whiteSpace: 'nowrap' }}>Usuário</span>}
      </div>
    </div>
  );
};

// ── GanttChart ─────────────────────────────────────────────────────
const GanttChart = ({ grupos, onItemClick, onAddItemToGroup, onToggleGroup, onRenameGroup, onDeleteGroup, onDragEnd, onAddGroup, vizMode = 'financeiro' }) => {
  const scrollRef = useRef(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName]   = useState('');

  const handleConfirmAddGroup = () => {
    const name = newGroupName.trim();
    if (name) onAddGroup(name);
    setNewGroupName('');
    setCreatingGroup(false);
  };

  // ── Date range ──
  const allItems = grupos.flatMap(g => g.items);
  let minDate = null, maxDate = null;
  allItems.forEach(item => {
    item.versions.forEach(v => v.etapas.forEach(e => {
      if (e.mes) {
        const s  = new Date(mesToStartISO(e.mes) + 'T00:00:00');
        const en = new Date(mesToEndISO(e.mes) + 'T00:00:00');
        if (!minDate || s < minDate) minDate = s;
        if (!maxDate || en > maxDate) maxDate = en;
      }
    }));
  });
  if (!minDate) { minDate = new Date(today); minDate.setMonth(minDate.getMonth() - 1); }
  if (!maxDate) { maxDate = new Date(today); maxDate.setMonth(maxDate.getMonth() + 4); }

  const startDate = new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1);
  const endDate   = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 1);

  // ── Month columns ──
  const cols = [];
  const cur  = new Date(startDate);
  while (cur < endDate) {
    const daysInMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    cols.push({
      label:  cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
      mesKey: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`,
      x:      Math.floor((cur - startDate) / 86400000) * PX_DAY,
      width:  daysInMonth * PX_DAY,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  const totalWidth   = cols.length > 0 ? cols[cols.length - 1].x + cols[cols.length - 1].width : 1000;
  const todayX       = Math.floor((today - startDate) / 86400000) * PX_DAY;
  const getX         = (iso) => !iso ? 0 : Math.floor((new Date(iso + 'T00:00:00') - startDate) / 86400000) * PX_DAY;
  const getCol       = (mes) => cols.find(c => c.mesKey === mes);
  const getMonthColW = (mes) => { const col = getCol(mes); return col ? col.width : 80; };

  useEffect(() => {
    if (scrollRef.current && todayX > 0) {
      setTimeout(() => { scrollRef.current.scrollLeft = Math.max(0, todayX - 100); }, 120);
    }
  }, []);

  // ── GanttItemBar — one etapa bar (uses ProgressCard segments) ───────
  // Title area width reserved at the left of each GanttItemCard
  const GANTT_ITEM_TITLE_W = 90;
  const GANTT_BAR_H        = 48;

  const GanttItemBar = ({ etapa, itemOriginX, vizMode = 'financeiro' }) => {
    const col = getCol(etapa.mes);
    if (!col) return null;
    const barLeft  = col.x - itemOriginX + 8;
    const barWidth = col.width - 16;

    let segments;
    if (vizMode === 'fisico') {
      const etapaStart = new Date(mesToStartISO(etapa.mes) + 'T00:00:00');
      const isDone     = etapa.feito;
      const isActive   = !isDone && etapaStart <= today;
      const pctLabel   = `${Number(etapa.percentual) || 0}%`;
      segments = [
        { pct: 100,                      bg: VM_NEUTRAL.bg3,      label: pctLabel,              labelColor: VM_NEUTRAL.text1 },
        { pct: isDone || isActive ? 100 : 0, bg: VM_FISICO.active, label: (isDone || isActive) ? pctLabel : null, labelColor: VM_FISICO.text },
        { pct: isDone ? 100 : 0,         bg: VM_FISICO.complete,  label: isDone ? pctLabel : null, labelColor: VM_FISICO.text },
      ];
    } else {
      const budget   = (Number(etapa.orcamentoMaterial) || 0) + (Number(etapa.orcamentoMaoDeObra) || 0);
      const gasto    = (Number(etapa.gastoMaterial) || 0) + (Number(etapa.gastoMaoDeObra) || 0);
      const recebido = Number(etapa.valorRecebido) || 0;
      segments = buildFinancialSegments(budget, recebido, gasto);
    }

    return (
      <div style={{ position: 'absolute', left: barLeft, width: barWidth, height: GANTT_BAR_H, top: '50%', transform: 'translateY(-50%)', borderRadius: 8, overflow: 'hidden' }}>
        <ProgressCard segments={segments} minHeight={GANTT_BAR_H} borderRadius={8} />
      </div>
    );
  };

  // ── GanttGroupBar — aggregate bar for one month in a group ───────────
  const GanttGroupBar = ({ grupo, mes, groupOriginX, vizMode = 'financeiro' }) => {
    const col = getCol(mes);
    if (!col) return null;
    let hasEtapas = false;
    let segments;

    if (vizMode === 'fisico') {
      let totalPct = 0, realizadoPct = 0, ativoPct = 0;
      const mesStart = new Date(mesToStartISO(mes) + 'T00:00:00');
      grupo.items.forEach(item => {
        const latest = item.versions[item.versions.length - 1];
        latest.etapas.filter(e => e.mes === mes).forEach(e => {
          hasEtapas = true;
          const pct = Number(e.percentual) || 0;
          totalPct += pct;
          if (e.feito) realizadoPct += pct;
          else if (mesStart <= today) ativoPct += pct;
        });
      });
      if (!hasEtapas) return null;
      const norm    = totalPct > 0 ? 100 / totalPct : 0;
      const rp      = Math.min(100, realizadoPct * norm);
      const seg1Pct = Math.min(100, rp + Math.min(100, ativoPct * norm));
      segments = [
        { pct: 100,     bg: VM_NEUTRAL.bg3,     label: `${Math.round(totalPct)}%`, labelColor: VM_NEUTRAL.text1 },
        { pct: seg1Pct, bg: VM_FISICO.active,   label: seg1Pct > 0 ? `${Math.round(seg1Pct)}%` : null, labelColor: VM_FISICO.text },
        { pct: rp,      bg: VM_FISICO.complete, label: rp > 0 ? `${Math.round(rp)}%` : null, labelColor: VM_FISICO.text },
      ];
    } else {
      let budget = 0, recebidoSum = 0, gasto = 0;
      grupo.items.forEach(item => {
        const latest = item.versions[item.versions.length - 1];
        latest.etapas.filter(e => e.mes === mes).forEach(e => {
          hasEtapas   = true;
          budget      += (Number(e.orcamentoMaterial) || 0) + (Number(e.orcamentoMaoDeObra) || 0);
          gasto       += (Number(e.gastoMaterial) || 0) + (Number(e.gastoMaoDeObra) || 0);
          recebidoSum += Number(e.valorRecebido) || 0;
        });
      });
      if (!hasEtapas) return null;
      segments = buildFinancialSegments(budget, recebidoSum, gasto);
    }

    const barLeft  = col.x - groupOriginX + CARD_PAD + 8;
    const barWidth = col.width - 16;

    return (
      <div style={{ position: 'absolute', left: barLeft, width: barWidth, height: GANTT_BAR_H, top: '50%', transform: 'translateY(-50%)', borderRadius: 8, overflow: 'hidden' }}>
        <ProgressCard segments={segments} minHeight={GANTT_BAR_H} borderRadius={8} />
      </div>
    );
  };

  // ── GanttItemCard — white card for one item ──────────────────────────
  const GanttItemCard = ({ item, itemIndex, groupOriginX, onClick, vizMode = 'financeiro' }) => {
    const latest       = item.versions[item.versions.length - 1];
    const latestEtapas = latest.etapas.filter(e => e.mes && getCol(e.mes));
    if (!latestEtapas.length) return null;

    const sorted      = latestEtapas.slice().sort((a, b) => a.mes < b.mes ? -1 : 1);
    const firstCol    = getCol(sorted[0].mes);
    const lastCol     = getCol(sorted[sorted.length - 1].mes);
    const cardLeft    = firstCol.x - groupOriginX + CARD_PAD - GANTT_ITEM_TITLE_W;
    const cardWidth   = lastCol.x + lastCol.width - firstCol.x + CARD_PAD * 2 + GANTT_ITEM_TITLE_W;
    const cardTop     = GROUP_ROW_H - 3 + itemIndex * ITEM_ROW_H;
    const cardHeight  = ITEM_ROW_H - 10;
    const itemOriginX = firstCol.x - GANTT_ITEM_TITLE_W;

    return (
      <div
        onClick={onClick}
        style={{
          position: 'absolute',
          left: cardLeft, top: cardTop, width: cardWidth, height: cardHeight,
          background: 'white', borderRadius: 12,
          border: '1px solid rgba(66,140,185,0.15)',
          boxShadow: '0 1px 4px rgba(13,27,38,0.06)',
          cursor: 'pointer', transition: 'box-shadow 0.15s',
          pointerEvents: 'auto', overflow: 'hidden',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(13,27,38,0.12)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(13,27,38,0.06)'}
      >
        {/* Item title — left area (bars are aligned to month columns) */}
        <span style={{
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
          color: 'var(--color-gray-800)', whiteSpace: 'nowrap',
          userSelect: 'none', pointerEvents: 'none', zIndex: 5,
          maxWidth: GANTT_ITEM_TITLE_W - 12,
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {latest.nome || 'Item'} · v{latest.number}
        </span>

        {/* Bars aligned to their month columns */}
        {latestEtapas.map(etapa => (
          <GanttItemBar key={etapa.id || etapa.mes} etapa={etapa} itemOriginX={itemOriginX} vizMode={vizMode} />
        ))}
      </div>
    );
  };

  // ── GanttGroupCard — outer card spanning full group height ───────────
  const GanttGroupCard = ({ grupo, vizMode = 'financeiro' }) => {
    const allMonths = new Set();
    grupo.items.forEach(item => {
      const latest = item.versions[item.versions.length - 1];
      latest.etapas.forEach(e => { if (e.mes && getCol(e.mes)) allMonths.add(e.mes); });
    });
    const sortedMonths = Array.from(allMonths).sort();
    if (!sortedMonths.length) return null;

    const firstCol     = getCol(sortedMonths[0]);
    const lastCol      = getCol(sortedMonths[sortedMonths.length - 1]);
    const groupOriginX = firstCol.x;
    const cardLeft     = LEFT_COL_W + groupOriginX - CARD_PAD;
    const cardWidth    = lastCol.x + lastCol.width - groupOriginX + CARD_PAD * 2;
    const headerH      = grupo.collapsed ? GROUP_ROW_H_COLLAPSED : GROUP_ROW_H;
    const totalRows    = headerH + (grupo.collapsed ? 0 : grupo.items.length * ITEM_ROW_H + GROUP_FOOTER_ROW_H);

    return (
      <div style={{
        position: 'absolute', top: 8, left: cardLeft,
        width: cardWidth, height: totalRows - 16,
        background: VM_NEUTRAL.bg1,
        borderRadius: 16,
        border: `1px solid ${VM_NEUTRAL.bg3}`,
        boxShadow: '0 1px 6px rgba(13,27,38,0.05)',
        pointerEvents: 'none', overflow: 'visible',
      }}>
        {/* Group bars — centered in header area */}
        <div style={{ position: 'relative', height: headerH - 8 }}>
          {sortedMonths.map(mes => (
            <GanttGroupBar key={mes} grupo={grupo} mes={mes} groupOriginX={groupOriginX} vizMode={vizMode} />
          ))}
        </div>

        {/* Item cards */}
        {!grupo.collapsed && grupo.items.map((item, iIdx) => (
          <GanttItemCard
            key={item.id}
            item={item}
            itemIndex={iIdx}
            groupOriginX={groupOriginX}
            vizMode={vizMode}
            onClick={onItemClick ? () => onItemClick(item, grupo.id) : undefined}
          />
        ))}
      </div>
    );
  };

  // ── Right cell: gridlines + today + row separator + children ──
  const RowRight = ({ children, bg }) => (
    <div style={{ flex: 1, position: 'relative', background: bg || 'transparent', minWidth: 0, borderBottom: '1px solid var(--color-gray-200)' }}>
      {cols.map((col, i) => (
        <div key={i} style={{ position: 'absolute', left: col.x + col.width - 1, top: 0, bottom: 0, width: 1, background: 'var(--color-gray-200)', opacity: 0.5 }} />
      ))}
      {todayX > 0 && (
        <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 1.5, background: 'var(--color-blue)', opacity: 0.3, zIndex: 1 }} />
      )}
      {children}
    </div>
  );

  return (
    <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
      <div style={{ minWidth: LEFT_COL_W + totalWidth, display: 'flex', flexDirection: 'column' }}>

        {/* ── Sticky month header ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', height: HEADER_H, flexShrink: 0 }}>
          <div style={{
            width: LEFT_COL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 6,
            background: 'var(--color-white)',
            borderRight: '1px solid var(--color-gray-200)',
            borderBottom: '1px solid var(--color-gray-200)',
            display: 'flex', alignItems: 'center', padding: '0 16px',
          }}>
            <span style={{ fontSize: 10, color: 'var(--color-gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-display)' }}>
              Obra
            </span>
          </div>
          <div style={{ flex: 1, position: 'relative', background: 'var(--color-gray-100)', borderBottom: '1px solid var(--color-gray-200)' }}>
            {cols.map((col, i) => (
              <div key={i} style={{
                position: 'absolute', left: col.x, width: col.width, top: 0, bottom: 0,
                borderRight: '1px solid var(--color-gray-200)',
                display: 'flex', alignItems: 'center', padding: '0 6px',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  {col.label}
                </span>
              </div>
            ))}
            {todayX > 0 && (
              <div style={{ position: 'absolute', left: todayX, top: 0, width: 1.5, height: HEADER_H, background: 'var(--color-blue)', opacity: 0.5 }} />
            )}
          </div>
        </div>

        {/* ── Flat rows with drag-drop ── */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="groups-list" type="GROUP">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {grupos.map((grupo, gIdx) => (
                  <Draggable key={grupo.id} draggableId={grupo.id} index={gIdx}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{ opacity: snapshot.isDragging ? 0.9 : 1, ...provided.draggableProps.style, position: 'relative', overflow: 'visible' }}
                      >
                        {/* Group header row */}
                        <div style={{ display: 'flex', height: grupo.collapsed ? GROUP_ROW_H_COLLAPSED : GROUP_ROW_H }}>
                          <div style={{
                            width: LEFT_COL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 3,
                            background: 'var(--color-gray-100)',
                            padding: grupo.collapsed ? '8px 8px 8px 8px' : '8px 8px 0 8px',
                          }}>
                            <GrupoHeader
                              grupo={grupo}
                              dragHandleProps={provided.dragHandleProps}
                              onToggle={() => onToggleGroup(grupo.id)}
                              onRenameGroup={(name) => onRenameGroup(grupo.id, name)}
                              vizMode={vizMode}
                            />
                          </div>
                          <RowRight bg="var(--color-gray-100)" />
                        </div>

                        {/* Item rows */}
                        {!grupo.collapsed && (
                          <Droppable droppableId={grupo.id} type="ITEM">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{ background: snapshot.isDraggingOver ? 'rgba(107,163,192,0.04)' : 'transparent' }}
                              >
                                {grupo.items.map((item, iIdx) => (
                                  <Draggable key={item.id} draggableId={item.id} index={iIdx}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        style={{ opacity: snapshot.isDragging ? 0.88 : 1, ...provided.draggableProps.style }}
                                      >
                                        <div style={{ display: 'flex', height: ITEM_ROW_H }}>
                                          <div style={{
                                            width: LEFT_COL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 3,
                                            background: 'var(--color-gray-100)',
                                            padding: '0 8px',
                                          }}>
                                            <div style={{
                                              background: VM_NEUTRAL.bg2,
                                              height: '100%', boxSizing: 'border-box',
                                              padding: '9px 8px',
                                            }}>
                                            <ItemCronograma
                                              item={item}
                                              dragHandleProps={provided.dragHandleProps}
                                              onClick={() => onItemClick(item, grupo.id)}
                                              vizMode={vizMode}
                                            />
                                            </div>
                                          </div>
                                          <RowRight />
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        )}

                        {/* Group footer row — add item + delete (hidden when collapsed) */}
                        {!grupo.collapsed && (
                          <div style={{ display: 'flex', height: GROUP_FOOTER_ROW_H }}>
                            <div style={{
                              width: LEFT_COL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 3,
                              background: 'var(--color-gray-100)',
                              padding: '0 8px 8px 8px',
                            }}>
                              <div style={{ background: VM_NEUTRAL.bg2, borderRadius: '0 0 10px 10px' }}>
                                <GroupFooter
                                  grupo={grupo}
                                  onAddItemToGroup={() => onAddItemToGroup(grupo.id)}
                                  onDeleteGroup={() => onDeleteGroup(grupo.id)}
                                />
                              </div>
                            </div>
                            <RowRight bg="var(--color-gray-100)" />
                          </div>
                        )}

                        {/* GanttGroupCard rendered last so it paints above all RowRight backgrounds */}
                        <GanttGroupCard grupo={grupo} vizMode={vizMode} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add group */}
        <div style={{ padding: '12px 8px', width: LEFT_COL_W }}>
          {creatingGroup ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                autoFocus
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Nome do grupo…"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleConfirmAddGroup();
                  if (e.key === 'Escape') { setNewGroupName(''); setCreatingGroup(false); }
                }}
                style={{ flex: 1, fontSize: 13 }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleConfirmAddGroup}>Criar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setNewGroupName(''); setCreatingGroup(false); }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingGroup(true)}
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', backgroundColor: 'rgb(226,239,246)', color: 'rgb(45,78,112)', fontSize: 14 }}
            >
              + Adicionar um grupo de itens
            </button>
          )}
        </div>

        <div style={{ height: 56 }} />
      </div>
    </div>
  );
};

// ── Default data ───────────────────────────────────────────────────
const DEFAULT_ITEMS = [
  {
    id: 'default-1',
    versions: [{
      number: 1,
      date: todayISO(),
      nome: 'Aço',
      etapas: [
        {
          id: 'e-default-1',
          mes: '2026-04',
          percentual: 60,
          orcamentoMaterial: 30000,
          orcamentoMaoDeObra: 17000,
          descricao: 'Compra do material e início da instalação.',
          feito: false,
          gastoMaterial: '',
          gastoMaoDeObra: '',
          valorRecebido: '',
        },
        {
          id: 'e-default-2',
          mes: '2026-05',
          percentual: 40,
          orcamentoMaterial: 0,
          orcamentoMaoDeObra: 0,
          descricao: 'Finalização da instalação.',
          feito: false,
          gastoMaterial: '',
          gastoMaoDeObra: '',
          valorRecebido: '',
        },
      ],
    }],
  },
];

const DEFAULT_GRUPOS = [
  {
    id: 'grupo-default',
    nome: 'Fundação',
    collapsed: false,
    items: DEFAULT_ITEMS,
  },
];

// ── App ────────────────────────────────────────────────────────────
const App = () => {
  const _saved = loadTemplate();
  const [grupos, setGrupos]               = useState(_saved?.grupos      ?? DEFAULT_GRUPOS);
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingItem, setEditingItem]     = useState(null);
  const [editingContext, setEditingContext] = useState(null); // { grupoId }
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectName, setProjectName]     = useState(_saved?.projectName ?? 'Projeto');
  const [vizMode, setVizMode]             = useState('financeiro');

  const handleOpenItem = (item, grupoId) => {
    const resolvedGrupoId = grupoId || grupos.find(g => g.items.some(i => i.id === item.id))?.id;
    setEditingContext({ grupoId: resolvedGrupoId });
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleAddItemToGroup = (grupoId) => {
    setEditingContext({ grupoId });
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleAddGroup = (nome) => {
    setGrupos(prev => [...prev, {
      id: `grupo-${Date.now()}`,
      nome,
      collapsed: false,
      items: [],
    }]);
  };

  const handleToggleGroup = (grupoId) => {
    setGrupos(prev => prev.map(g => g.id === grupoId ? { ...g, collapsed: !g.collapsed } : g));
  };

  const handleRenameGroup = (grupoId, newName) => {
    setGrupos(prev => prev.map(g => g.id === grupoId ? { ...g, nome: newName } : g));
  };

  const handleDeleteGroup = (grupoId) => {
    setGrupos(prev => prev.filter(g => g.id !== grupoId));
  };

  const handleDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'GROUP') {
      setGrupos(prev => {
        const next = [...prev];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        return next;
      });
    } else {
      setGrupos(prev => {
        const next = prev.map(g => ({ ...g, items: [...g.items] }));
        const src  = next.find(g => g.id === source.droppableId);
        const dst  = next.find(g => g.id === destination.droppableId);
        if (!src || !dst) return prev;
        const [moved] = src.items.splice(source.index, 1);
        dst.items.splice(destination.index, 0, moved);
        return next;
      });
    }
  };

  const handleDeleteItem = () => {
    if (!editingItem) return;
    setGrupos(prev => prev.map(g => ({ ...g, items: g.items.filter(it => it.id !== editingItem.id) })));
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = ({ nome, etapas, needsNewVersion }) => {
    setGrupos(prev => {
      if (!editingItem) {
        const newItem = {
          id: `item-${Date.now()}`,
          versions: [{ number: 1, date: todayISO(), nome, etapas: JSON.parse(JSON.stringify(etapas)) }],
        };
        return prev.map(g =>
          g.id === editingContext?.grupoId ? { ...g, items: [...g.items, newItem] } : g
        );
      }
      return prev.map(g => ({
        ...g,
        items: g.items.map(it => {
          if (it.id !== editingItem.id) return it;
          const versions = [...it.versions];
          if (needsNewVersion) {
            versions.push({ number: versions.length + 1, date: todayISO(), nome, etapas: JSON.parse(JSON.stringify(etapas)) });
          } else {
            versions[versions.length - 1] = { ...versions[versions.length - 1], nome, etapas: JSON.parse(JSON.stringify(etapas)) };
          }
          return { ...it, versions };
        }),
      }));
    });
    setModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-gray-100)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onSaveTemplate={() => saveTemplate(projectName, grupos)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          height: 56, borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', alignItems: 'center', padding: '0 20px',
          background: 'var(--color-white)', flexShrink: 0, gap: 12,
        }}>
          <span style={{
            fontWeight: 700, fontSize: 15, flex: 1,
            color: 'var(--color-navy)', fontFamily: 'var(--font-display)',
            letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
          }}>
            Cronograma
          </span>
          {/* VM toggle */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${VM_NEUTRAL.bg3}`, flexShrink: 0 }}>
            {[
              { key: 'financeiro', label: 'Financeiro', active: VM_FINANCEIRO.complete },
              { key: 'fisico',     label: 'Físico',     active: VM_FISICO.complete },
            ].map(vm => (
              <button key={vm.key} onClick={() => setVizMode(vm.key)} style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-display)', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                background: vizMode === vm.key ? vm.active : 'var(--color-white)',
                color: vizMode === vm.key ? 'white' : VM_NEUTRAL.text2,
              }}>{vm.label}</button>
            ))}
          </div>
        </div>

        {/* Gantt */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <GanttChart
            grupos={grupos}
            onItemClick={handleOpenItem}
            onAddItemToGroup={handleAddItemToGroup}
            onToggleGroup={handleToggleGroup}
            onRenameGroup={handleRenameGroup}
            onDeleteGroup={handleDeleteGroup}
            onDragEnd={handleDragEnd}
            onAddGroup={handleAddGroup}
            vizMode={vizMode}
          />
        </div>
      </div>

      {editingItem
        ? <ItemModal item={editingItem} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} onDelete={handleDeleteItem} />
        : <NovoItemDrawer isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
      }
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
