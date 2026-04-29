// app.jsx — Carnaúba DS · v3 with editable project name, 3-bar KPIs, portal tooltips
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

const diffDays = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000));
};

const getVersionRange = (version) => {
  if (!version) return null;
  const starts = version.etapas.filter((e) => e.dataInicio).map((e) => e.dataInicio);
  const ends = version.etapas.filter((e) => e.dataFim).map((e) => e.dataFim);
  if (!starts.length || !ends.length) return null;
  return {
    start: starts.reduce((a, b) => a < b ? a : b),
    end: ends.reduce((a, b) => a > b ? a : b)
  };
};

const getProgress = (v) => !v || !v.etapas.length ? 0 : Math.round(v.etapas.filter((e) => e.feito).length / v.etapas.length * 100);
const getTotalBudget = (v) => (v?.etapas || []).reduce((s, e) => s + (Number(e.orcamento) || 0), 0);
const getTotalSpent = (v) => (v?.etapas || []).reduce((s, e) => s + (Number(e.investimentoRealizado) || 0), 0);

const getDaysPassed = (version) => {
  const range = getVersionRange(version);
  if (!range) return 0;
  const today = new Date();today.setHours(0, 0, 0, 0);
  const start = new Date(range.start + 'T00:00:00');
  return Math.max(0, Math.floor((today - start) / 86400000));
};

// ── Gantt layout constants ─────────────────────────────────────────
const MAIN_BAR_H = 26;
const PREV_BAR_H = 10;
const BAR_GAP = 7;
const TOP_PAD = 14;
const BOTTOM_PAD = 10;
const LEFT_COL_W = 300;
const HEADER_H = 40;

const rowHeight = (numVersions) =>
Math.max(140, TOP_PAD + MAIN_BAR_H + (numVersions - 1) * (PREV_BAR_H + BAR_GAP) + BOTTOM_PAD);

const barY = (vIdx, total, rowH) => {
  const stackH = MAIN_BAR_H + Math.max(0, total - 1) * (PREV_BAR_H + BAR_GAP);
  const topOffset = Math.max(10, Math.round((rowH - stackH) / 2));
  const order = total - 1 - vIdx;
  if (order === 0) return topOffset;
  return topOffset + MAIN_BAR_H + BAR_GAP + (order - 1) * (PREV_BAR_H + BAR_GAP);
};

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


// ── Portal Tooltip ─────────────────────────────────────────────────
const PortalTooltip = ({ anchorRect, children }) => {
  if (!anchorRect) return null;
  const left = anchorRect.left;
  const top = anchorRect.top - 10;
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      left,
      top,
      transform: 'translateY(-100%)',
      zIndex: 99999,
      background: 'var(--color-gray-800)',
      color: 'white',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      fontSize: 11,
      fontFamily: 'var(--font-body)',
      lineHeight: 1.6,
      boxShadow: 'var(--shadow-xl)',
      minWidth: 220,
      pointerEvents: 'none',
      whiteSpace: 'nowrap'
    }}>
      {children}
      <div style={{
        position: 'absolute', top: '100%', left: 18,
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid var(--color-gray-800)'
      }} />
    </div>,
    document.body
  );
};

// ── StepBar (gantt step segment with portal tooltip) ──────────────
const StepBar = ({ etapa, eIdx, ex, ew, by, bh, onItemClick }) => {
  const [anchorRect, setAnchorRect] = useState(null);
  const ref = useRef(null);

  const totalDays = diffDays(etapa.dataInicio, etapa.dataFim);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = etapa.dataInicio ? new Date(etapa.dataInicio + 'T00:00:00') : null;
  const spentDays = start ? Math.min(totalDays, Math.max(0, Math.floor((today - start) / 86400000))) : 0;
  const budget = Number(etapa.orcamento) || 0;
  const spent = Number(etapa.investimentoRealizado) || 0;

  const tooltip = (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 5 }}>
        {etapa.titulo || `Etapa ${eIdx + 1}`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontFamily: 'var(--font-mono)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ opacity: 0.6 }}>Período</span>
          <span>{fmtDatePT(etapa.dataInicio)} → {fmtDatePT(etapa.dataFim)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ opacity: 0.6 }}>Duração</span>
          <span>{spentDays}/{totalDays} dias</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ opacity: 0.6 }}>Gastos</span>
          <span>{budget > 0 ? `${fmtBRL(spent)} / ${fmtBRL(budget)}` : spent > 0 ? fmtBRL(spent) : '—'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      onClick={onItemClick}
      onMouseEnter={(e) => { ref.current && setAnchorRect(ref.current.getBoundingClientRect()); e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { setAnchorRect(null); e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      style={{
        position: 'absolute', left: ex, top: by,
        width: ew, height: bh,
        background: etapa.feito ? 'var(--color-success)' : 'var(--color-sage)',
        border: etapa.feito ? '1px solid var(--color-success)' : '1px solid var(--color-sage)',
        borderRadius: 5,
        zIndex: 4,
        cursor: 'pointer', overflow: 'hidden',
        transition: 'opacity 0.15s, transform 0.1s, box-shadow 0.1s',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {anchorRect && <PortalTooltip anchorRect={anchorRect}>{tooltip}</PortalTooltip>}
    </div>
  );
};

// ── BarRow (single KPI bar with portal tooltip) ────────────────────
const BarRow = ({ label, pct, valueFmt, overrun, tooltipContent }) => {
  const [anchorRect, setAnchorRect] = useState(null);
  const rowRef = useRef(null);

  const clampedPct = Math.min(100, Math.max(0, pct || 0));
  const barColor = overrun ? 'var(--color-warning)' :
  clampedPct === 100 ? 'var(--color-success)' :
  'var(--color-sage)';

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => rowRef.current && setAnchorRect(rowRef.current.getBoundingClientRect())}
      onMouseLeave={() => setAnchorRect(null)}
      style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.07em',
          fontFamily: 'var(--font-display)', color: "rgb(78, 110, 138)"
        }}>
          {label}
        </span>
        <span className="mono" style={{
          fontSize: 10, fontWeight: 700,
          color: overrun ? 'var(--color-warning)' : clampedPct === 100 ? 'var(--color-success)' : 'var(--color-navy)'
        }}>
          {valueFmt}
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--color-sage-20)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${clampedPct}%`,
          background: barColor, borderRadius: 99,
          transition: 'width 0.35s var(--ease-out)'
        }} />
      </div>
      {anchorRect && tooltipContent &&
      <PortalTooltip anchorRect={anchorRect}>
          {tooltipContent}
        </PortalTooltip>
      }
    </div>);

};

// ── ThreeProgressBars ──────────────────────────────────────────────
const ThreeProgressBars = ({ item }) => {
  if (!item) return null;
  const latest = item.versions[item.versions.length - 1];
  const today = new Date();today.setHours(0, 0, 0, 0);

  // ── Progresso ──
  const doneSteps = latest.etapas.filter((e) => e.feito).length;
  const totalSteps = latest.etapas.length;
  const progPct = totalSteps === 0 ? 0 : Math.round(doneSteps / totalSteps * 100);

  const progTooltip =
  <div>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 5 }}>
        Progresso por versão
      </div>
      {item.versions.map((v, i) => {
      const d = v.etapas.filter((e) => e.feito).length;
      const t = v.etapas.length;
      const p = t === 0 ? 0 : Math.round(d / t * 100);
      const isLatest = i === item.versions.length - 1;
      return (
        <div key={v.number} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, opacity: isLatest ? 1 : 0.65, fontFamily: 'var(--font-mono)' }}>
            <span>v{v.number}{isLatest ? ' (atual)' : ''}</span>
            <span>{d}/{t} etapas · {p}%</span>
          </div>);

    })}
    </div>;


  // ── Duração ──
  const latestRange = getVersionRange(latest);
  const totalDays = latestRange ? diffDays(latestRange.start, latestRange.end) : 0;
  const daysPassed = latestRange ? getDaysPassed(latest) : 0;
  const durPct = totalDays === 0 ? 0 : Math.round(daysPassed / totalDays * 100);
  const durOverrun = durPct > 100;

  const durTooltip =
  <div>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 5 }}>
        Duração por versão
      </div>
      {item.versions.map((v, i) => {
      const r = getVersionRange(v);
      const d = r ? diffDays(r.start, r.end) : null;
      const isLatest = i === item.versions.length - 1;
      return (
        <div key={v.number} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, opacity: isLatest ? 1 : 0.65, fontFamily: 'var(--font-mono)' }}>
            <span>v{v.number}{isLatest ? ' (atual)' : ''}</span>
            <span>{d !== null ? `${d} dias` : '—'}</span>
          </div>);

    })}
    </div>;


  // ── Gastos ──
  const budget = getTotalBudget(latest);
  const spent = getTotalSpent(latest);
  const gastPct = budget === 0 ? 0 : Math.round(spent / budget * 100);
  const gastOverrun = spent > budget && budget > 0;

  const gastTooltip =
  <div>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 5 }}>
        Orçamento por versão
      </div>
      {item.versions.map((v, i) => {
      const b = getTotalBudget(v);
      const s = getTotalSpent(v);
      const isLatest = i === item.versions.length - 1;
      return (
        <div key={v.number} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, opacity: isLatest ? 1 : 0.65, fontFamily: 'var(--font-mono)' }}>
            <span>v{v.number}{isLatest ? ' (atual)' : ''}</span>
            <span>
              {b > 0 ? fmtBRL(b) : '—'}
            </span>
          </div>);

    })}
    </div>;


  return (
    <div style={{ display: 'flex', flexDirection: 'column', color: "rgb(141, 158, 175)", gap: "10px" }}>
      <BarRow
        label="Progresso"
        pct={progPct}
        valueFmt={`${doneSteps}/${totalSteps} etapas`}
        tooltipContent={progTooltip} />
      
      <BarRow
        label="Duração"
        pct={durPct}
        valueFmt={totalDays ? `${daysPassed}/${totalDays} dias` : '—'}
        overrun={durOverrun}
        valueColor="rgb(78, 110, 138)"
        tooltipContent={durTooltip} />
      
      <BarRow
        label="Gastos"
        pct={gastPct}
        valueFmt={budget ? `${fmtBRL(spent)} / ${fmtBRL(budget)}` : '—'}
        overrun={gastOverrun}
        tooltipContent={gastTooltip} />
      
    </div>);

};

// ── Sidebar ───────────────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle, projectName, onProjectNameChange }) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  return (
    <div style={{
      width: collapsed ? 52 : 210, flexShrink: 0,
      background: 'var(--color-navy)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s var(--ease-out)',
      overflow: 'hidden', zIndex: 10
    }}>
      {/* Project name header */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 12px' : '0 12px 0 14px',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, gap: 8
      }}>
        {/* Editable name — hidden when collapsed */}
        {!collapsed &&
        <div style={{ flex: 1, minWidth: 0 }}>
            {editing ?
          <input
            ref={inputRef}
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(115,169,199,0.4)',
              borderRadius: 'var(--radius-sm)',
              color: 'white', fontSize: 13, fontWeight: 600,
              padding: '3px 7px', width: '100%',
              fontFamily: 'var(--font-display)', outline: 'none'
            }} /> :


          <span
            onClick={() => setEditing(true)}
            style={{
              fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontFamily: 'var(--font-display)', cursor: 'text', display: 'block'
            }}>
            
                {projectName || 'Projeto'}
              </span>
          }
          </div>
        }

        {/* Collapse/expand toggle */}
        <button onClick={onToggle} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 4,
          display: 'flex', transition: 'color 0.15s', flexShrink: 0
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
          
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '10px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 'var(--radius-md)',
          background: 'rgba(115,169,199,0.15)',
          justifyContent: collapsed ? 'center' : 'flex-start', cursor: 'pointer'
        }}>
          <span style={{ color: 'var(--color-blue)', flexShrink: 0 }}><IconCalendar /></span>
          {!collapsed &&
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-blue)', whiteSpace: 'nowrap' }}>
              Cronograma
            </span>
          }
        </div>
      </div>

      {/* User */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 12px' : '0 14px', gap: 10,
        borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'flex-start'
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)'
        }}><IconUser /></div>
        {!collapsed && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, whiteSpace: 'nowrap' }}>Usuário</span>}
      </div>
    </div>);

};

// ── GanttChart ────────────────────────────────────────────────────
const GanttChart = ({ item, zoom, onItemClick }) => {
  const scrollRef = useRef(null);
  const today = new Date();today.setHours(0, 0, 0, 0);

  const PX_DAY = zoom === 'days' ? 44 : zoom === 'weeks' ? 16 : 3.5;

  // Date range
  let minDate = null,maxDate = null;
  if (item) {
    item.versions.forEach((v) => v.etapas.forEach((e) => {
      if (e.dataInicio) {const d = new Date(e.dataInicio + 'T00:00:00');if (!minDate || d < minDate) minDate = d;}
      if (e.dataFim) {const d = new Date(e.dataFim + 'T00:00:00');if (!maxDate || d > maxDate) maxDate = d;}
    }));
  }
  if (!minDate) {minDate = new Date(today);minDate.setMonth(minDate.getMonth() - 1);}
  if (!maxDate) {maxDate = new Date(today);maxDate.setMonth(maxDate.getMonth() + 4);}
  const startDate = new Date(minDate);startDate.setDate(startDate.getDate() - 14);
  const endDate = new Date(maxDate);endDate.setDate(endDate.getDate() + 28);
  const totalWidth = Math.max(Math.ceil((endDate - startDate) / 86400000) * PX_DAY, 1000);
  const todayX = Math.floor((today - startDate) / 86400000) * PX_DAY;

  const getX = (iso) => !iso ? 0 : Math.floor((new Date(iso + 'T00:00:00') - startDate) / 86400000) * PX_DAY;
  const getW = (s, e) => !s || !e ? 4 : Math.max(4, Math.ceil((new Date(e + 'T00:00:00') - new Date(s + 'T00:00:00')) / 86400000) * PX_DAY);

  // Header columns
  const cols = [];
  const cur = new Date(startDate);
  if (zoom === 'months') {
    cur.setDate(1);
    while (cur <= endDate) {
      cols.push({
        label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
        x: Math.floor((cur - startDate) / 86400000) * PX_DAY,
        width: new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate() * PX_DAY
      });
      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (zoom === 'weeks') {
    const dow = cur.getDay();
    cur.setDate(cur.getDate() - (dow === 0 ? 6 : dow - 1));
    while (cur <= endDate) {
      cols.push({
        label: `${String(cur.getDate()).padStart(2, '0')} ${cur.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`,
        x: Math.max(0, Math.floor((cur - startDate) / 86400000) * PX_DAY),
        width: 7 * PX_DAY
      });
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    while (cur <= endDate) {
      cols.push({
        label: String(cur.getDate()),
        sublabel: cur.getDate() === 1 ? cur.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : null,
        x: Math.floor((cur - startDate) / 86400000) * PX_DAY,
        width: PX_DAY,
        isWeekend: cur.getDay() === 0 || cur.getDay() === 6
      });
      cur.setDate(cur.getDate() + 1);
    }
  }

  const numVersions = item ? item.versions.length : 0;
  const ROW_H = rowHeight(numVersions);
  const latest = item?.versions[item.versions.length - 1];
  const latestRange = item ? getVersionRange(latest) : null;
  const progress = item ? getProgress(latest) : 0;

  useEffect(() => {
    if (scrollRef.current && todayX > 0) {
      setTimeout(() => {
        scrollRef.current.scrollLeft = Math.max(0, todayX - scrollRef.current.clientWidth / 3);
      }, 120);
    }
  }, [zoom]);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Left column ─────────────────────────────── */}
      <div style={{
        width: LEFT_COL_W, flexShrink: 0,
        borderRight: '1px solid var(--color-gray-200)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--color-white)', zIndex: 3
      }}>
        <div style={{
          height: HEADER_H, borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0
        }}>
          <span style={{
            fontSize: 10, color: 'var(--color-gray-400)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-display)'
          }}>
            Item de Cronograma
          </span>
        </div>

        {item ?
        <div
          onClick={onItemClick}
          style={{
            minHeight: ROW_H, padding: '12px 16px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            cursor: 'pointer', borderBottom: '1px solid var(--color-gray-200)',
            transition: 'background 0.12s', gap: "9px", background: "var(--color-white)"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-gray-100)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-white)'}>
          
            {/* Item name */}
            <span style={{
            fontWeight: 700, color: 'var(--color-navy)',
            fontFamily: 'var(--font-display)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: "16px"
          }}>
              {latest?.nome || <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>Item sem nome</span>}
            </span>

            {/* Three KPI bars */}
            <ThreeProgressBars item={item} />
          </div> :

        <div style={{ padding: '14px 16px' }}>
            <button onClick={onItemClick} className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', backgroundColor: "rgb(226, 239, 246)", color: "rgb(45, 78, 112)", fontSize: "14px" }}>
              + Adicionar Item de Cronograma
            </button>
          </div>
        }
      </div>

      {/* ── Timeline ────────────────────────────────── */}
      <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
        <div style={{ width: totalWidth, minHeight: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{
            height: HEADER_H, position: 'sticky', top: 0, zIndex: 2,
            background: 'var(--color-gray-100)', borderBottom: '1px solid var(--color-gray-200)',
            overflow: 'hidden'
          }}>
            {cols.map((col, i) =>
            <div key={i} style={{
              position: 'absolute', left: col.x, width: col.width, top: 0, bottom: 0,
              borderRight: '1px solid var(--color-gray-200)',
              background: col.isWeekend ? 'rgba(27,60,95,0.02)' : 'transparent',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              padding: '0 6px', overflow: 'hidden'
            }}>
                {col.sublabel &&
              <div style={{ fontSize: 9, color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)', lineHeight: 1, marginBottom: 1 }}>
                    {col.sublabel}
                  </div>
              }
                <div style={{
                fontSize: zoom === 'months' ? 11 : 10,
                color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap', overflow: 'hidden',
                fontWeight: zoom === 'months' ? 600 : 400
              }}>
                  {col.label}
                </div>
              </div>
            )}
            {todayX > 0 &&
            <div style={{
              position: 'absolute', left: todayX, top: 0,
              width: 1.5, height: HEADER_H,
              background: 'var(--color-blue)', opacity: 0.5
            }} />
            }
          </div>

          {/* Row body */}
          <div style={{ position: 'relative', minHeight: ROW_H, flex: 1 }}>
            {/* Grid */}
            {cols.map((col, i) =>
            <div key={i} style={{
              position: 'absolute', left: col.x + col.width, top: 0, bottom: 0,
              width: 1, background: 'var(--color-gray-200)', opacity: 0.5
            }} />
            )}
            {zoom === 'days' && cols.filter((c) => c.isWeekend).map((col, i) =>
            <div key={i} style={{
              position: 'absolute', left: col.x, width: col.width,
              top: 0, bottom: 0, background: 'rgba(27,60,95,0.025)'
            }} />
            )}

            {/* Today line */}
            {todayX > 0 &&
            <>
                <div style={{
                position: 'absolute', left: todayX, top: 0, bottom: 0,
                width: 1.5, background: 'var(--color-blue)', opacity: 0.3, zIndex: 1
              }} />
                <div className="mono" style={{
                position: 'absolute', left: todayX + 4, top: 4,
                fontSize: 9, color: 'var(--color-blue)', opacity: 0.7
              }}>
                  hoje
                </div>
              </>
            }

            {/* Version bars — always navy for current, blue-50 for older */}
            {item && item.versions.map((v, vIdx) => {
              const isLatest = vIdx === item.versions.length - 1;
              const range = getVersionRange(v);
              if (!range) return null;

              const bx = getX(range.start);
              const bw = getW(range.start, range.end) + PX_DAY - 3;
              const by = barY(vIdx, item.versions.length, ROW_H);
              const bh = isLatest ? MAIN_BAR_H : PREV_BAR_H;

              const vProg = getProgress(v);

              return (
                <React.Fragment key={v.number}>
                  {/* Label left of bar */}
                  <div style={{
                    position: 'absolute', top: by,
                    left: bx,
                    transform: 'translateX(calc(-100% - 10px))',
                    height: bh,
                    display: 'flex', alignItems: 'center',
                    pointerEvents: 'none', whiteSpace: 'nowrap'
                  }}>
                    <span style={{
                      fontSize: isLatest ? 13 : 11, fontWeight: isLatest ? 700 : 500,
                      color: isLatest ? 'rgb(27, 60, 95)' : 'var(--color-gray-400)',
                      fontFamily: 'var(--font-display)'
                    }}>
                      {isLatest && latest?.nome ? <>{latest.nome} · <span className="mono" style={{ fontWeight: 600, fontSize: 12 }}>v{v.number}</span></> : <span className="mono">v{v.number}</span>}
                    </span>
                  </div>

                  {/* For latest version: one segment per step + connectors */}
                  {isLatest ? (() => {
                    const dated = v.etapas.filter((e) => e.dataInicio && e.dataFim);
                    return dated.map((etapa, eIdx) => {
                      const ex = getX(etapa.dataInicio);
                      // +1 day so the last day is fully covered
                      const ew = Math.max(4, getW(etapa.dataInicio, etapa.dataFim) + PX_DAY - 3);
                      const next = dated[eIdx + 1];
                      const OVERLAP = 5;
                      const connectorX = ex + ew - OVERLAP;
                      const nextEx = next ? getX(next.dataInicio) : 0;
                      const connectorW = next ? Math.max(0, nextEx + OVERLAP - connectorX) : 0;
                      return (
                        <React.Fragment key={eIdx}>
                          {connectorW > 0 &&
                            <div style={{
                              position: 'absolute', left: connectorX, top: by,
                              width: connectorW, height: bh,
                              background: 'rgba(212,228,224,0.7)', borderRadius: 2,
                              zIndex: 2, pointerEvents: 'none'
                            }} />
                          }
                          <StepBar
                            etapa={etapa}
                            eIdx={eIdx}
                            ex={ex}
                            ew={ew}
                            by={by}
                            bh={bh}
                            onItemClick={onItemClick}
                          />
                        </React.Fragment>
                      );
                    });
                  })() : (
                    /* Previous versions: single bar */
                    <div
                      onClick={onItemClick}
                      title={`v${v.number} · ${fmtDatePT(range.start)} → ${fmtDatePT(range.end)} · ${diffDays(range.start, range.end)} dias`}
                      style={{
                        position: 'absolute', left: bx, top: by,
                        width: bw, height: bh,
                        background: '#D1D9E1',
                        borderRadius: 3,
                        zIndex: 2,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s', boxShadow: 'var(--shadow-sm)'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    />
                  )}
                </React.Fragment>);

            })}

            {!item &&
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-gray-400)', fontSize: 13,
              fontFamily: 'var(--font-body)', pointerEvents: 'none'
            }}>
                O cronograma aparecerá aqui
              </div>
            }
          </div>
        </div>
      </div>
    </div>);

};

// ── App ───────────────────────────────────────────────────────────
const App = () => {
  const [item, setItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [zoom, setZoom] = useState('weeks');
  const [projectName, setProjectName] = useState('Projeto');

  const handleOpenItem = () => setModalOpen(true);

  const handleSave = ({ nome, etapas, needsNewVersion }) => {
    setItem((prev) => {
      if (!prev) {
        return { id: '1', versions: [{ number: 1, date: todayISO(), nome, etapas: JSON.parse(JSON.stringify(etapas)) }] };
      }
      const versions = [...prev.versions];
      if (needsNewVersion) {
        versions.push({ number: versions.length + 1, date: todayISO(), nome, etapas: JSON.parse(JSON.stringify(etapas)) });
      } else {
        versions[versions.length - 1] = { ...versions[versions.length - 1], nome, etapas: JSON.parse(JSON.stringify(etapas)) };
      }
      return { ...prev, versions };
    });
    setModalOpen(false);
  };

  const zoomLabels = { days: 'Dias', weeks: 'Semanas', months: 'Meses' };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-gray-100)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        projectName={projectName}
        onProjectNameChange={setProjectName} />
      

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          height: 56, borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', alignItems: 'center', padding: '0 20px',
          background: 'var(--color-white)', flexShrink: 0, gap: 12
        }}>
          <span style={{
            fontWeight: 700, fontSize: 15, flex: 1,
            color: 'var(--color-navy)', fontFamily: 'var(--font-display)',
            letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase'
          }}>
            Cronograma
          </span>

          {/* Version legend */}
          {item && item.versions.length > 1 &&
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginRight: 8, width: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, borderRadius: 3, background: 'var(--color-blue-50)', backgroundColor: "rgb(209, 217, 225)", height: "16px" }} />
                <span style={{ fontSize: 10, color: 'var(--color-gray-600)', fontFamily: 'var(--font-display)' }}>versões anteriores</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, height: 16, background: 'var(--color-navy)', backgroundColor: "rgb(115, 169, 199)", borderRadius: "3px" }} />
                <span style={{ fontSize: 10, color: 'var(--color-gray-600)', fontFamily: 'var(--font-display)' }}>versão atual</span>
              </div>
            </div>
          }

          {/* Zoom controls */}
          <div style={{
            display: 'flex', gap: 2, background: 'var(--color-gray-100)',
            borderRadius: 'var(--radius-md)', padding: 3,
            border: '1px solid var(--color-gray-200)'
          }}>
            {['days', 'weeks', 'months'].map((z) =>
            <button key={z} onClick={() => setZoom(z)} style={{
              padding: '4px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
              fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer',
              background: zoom === z ? 'var(--color-white)' : 'transparent',
              color: zoom === z ? 'var(--color-navy)' : 'var(--color-gray-600)',
              fontWeight: zoom === z ? 600 : 400,
              transition: 'all 0.15s',
              boxShadow: zoom === z ? 'var(--shadow-sm)' : 'none'
            }}>
                {zoomLabels[z]}
              </button>
            )}
          </div>
        </div>

        {/* Gantt */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <GanttChart item={item} zoom={zoom} onItemClick={handleOpenItem} />
        </div>
      </div>

      <ItemModal item={item} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
    </div>);

};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);