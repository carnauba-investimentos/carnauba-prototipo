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

// mes is "YYYY-MM"; first day of month as ISO date
const mesToStartISO = (mes) => mes ? `${mes}-01` : null;
// last day of month
const mesToEndISO = (mes) => {
  if (!mes) return null;
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m, 0).toISOString().split('T')[0];
};

const getVersionRange = (version) => {
  if (!version) return null;
  const starts = version.etapas.filter((e) => e.mes).map((e) => mesToStartISO(e.mes));
  const ends = version.etapas.filter((e) => e.mes).map((e) => mesToEndISO(e.mes));
  if (!starts.length || !ends.length) return null;
  return {
    start: starts.reduce((a, b) => a < b ? a : b),
    end: ends.reduce((a, b) => a > b ? a : b)
  };
};

// Progress = sum of percentual of completed steps
const getProgress = (v) => {
  if (!v || !v.etapas.length) return 0;
  return Math.min(100, v.etapas.reduce((sum, e) => sum + (e.feito ? (Number(e.percentual) || 0) : 0), 0));
};
const getTotalBudget = (v) => (v?.etapas || []).reduce((s, e) => s + (Number(e.orcamentoMaterial) || 0) + (Number(e.orcamentoMaoDeObra) || 0), 0);
const getTotalSpent = (v) => (v?.etapas || []).reduce((s, e) => s + (Number(e.gastoMaterial) || 0) + (Number(e.gastoMaoDeObra) || 0), 0);

// ── Gantt layout constants ─────────────────────────────────────────
const MAIN_BAR_H = 25;
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

  const budgetMat = Number(etapa.orcamentoMaterial) || 0;
  const budgetMob = Number(etapa.orcamentoMaoDeObra) || 0;
  const gastoMat = Number(etapa.gastoMaterial) || 0;
  const gastoMob = Number(etapa.gastoMaoDeObra) || 0;
  const totalBudget = budgetMat + budgetMob;
  const totalGasto = gastoMat + gastoMob;

  const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const fmtMesShort = (mes) => {
    if (!mes) return '—';
    const [y, m] = mes.split('-');
    return `${MONTHS_FULL[parseInt(m,10)-1]} ${y}`;
  };

  const spentOverBudget = totalBudget > 0 && totalGasto > totalBudget;
  const monthOver = (() => {
    if (!etapa.mes || etapa.feito) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const end = new Date(mesToEndISO(etapa.mes) + 'T00:00:00');
    return today > end;
  })();

  const tooltip = (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 5 }}>
        Etapa {eIdx + 1}{etapa.mes ? ` · ${fmtMesShort(etapa.mes)}` : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontFamily: 'var(--font-mono)' }}>
        {etapa.percentual !== '' && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ opacity: 0.6 }}>Execução</span>
          <span>{etapa.percentual}%</span>
        </div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ opacity: 0.6 }}>Material</span>
          <span>{budgetMat > 0 ? `${fmtBRL(gastoMat)} / ${fmtBRL(budgetMat)}` : gastoMat > 0 ? fmtBRL(gastoMat) : '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ opacity: 0.6 }}>Mão de Obra</span>
          <span>{budgetMob > 0 ? `${fmtBRL(gastoMob)} / ${fmtBRL(budgetMob)}` : gastoMob > 0 ? fmtBRL(gastoMob) : '—'}</span>
        </div>
      </div>
    </div>
  );

  const LABEL_H = 16;

  // Progress fill: % of budget spent, capped at 100
  const spentPct = totalBudget > 0 ? Math.min(100, (totalGasto / totalBudget) * 100) : 0;

  // ── Bar appearance per use case ────────────────────────────────────
  // done + over budget  → warning yellow fill (solid), success border, white text
  // done + within budget → success-70 bg + success fill, success border, white text
  // not done + over budget → warning yellow fill (solid), warning border, white text
  // overdue + not done  → sage-50 bg + sage fill, warning border, navy text
  // normal              → sage-50 bg + sage fill, sage border, navy text

  let barBg, barBorderColor, barBorderWidth, fillBg, showProgressFill, textColor, barLabel;

  if (etapa.feito && spentOverBudget) {
    barBg = 'var(--color-warning)';
    barBorderColor = 'var(--color-success)'; barBorderWidth = '2px';
    fillBg = null; showProgressFill = false;
    textColor = 'rgba(255,255,255,0.9)';
    barLabel = totalGasto > 0 ? fmtBRL(totalGasto) : null;
  } else if (etapa.feito) {
    barBg = '#6CA48C';
    barBorderColor = 'var(--color-success)'; barBorderWidth = '2px';
    fillBg = 'var(--color-success)'; showProgressFill = true;
    textColor = 'rgba(255,255,255,0.9)';
    barLabel = fmtBRL(totalBudget);
  } else if (spentOverBudget) {
    barBg = 'var(--color-warning)';
    barBorderColor = 'var(--color-warning)'; barBorderWidth = '1px';
    fillBg = null; showProgressFill = false;
    textColor = 'rgba(255,255,255,0.9)';
    barLabel = fmtBRL(totalGasto);
  } else {
    barBg = 'var(--color-sage-50)';
    barBorderColor = monthOver ? 'var(--color-warning)' : 'var(--color-sage-80)';
    barBorderWidth = monthOver ? '2px' : '1px';
    fillBg = 'var(--color-sage)'; showProgressFill = true;
    textColor = 'var(--color-navy)';
    barLabel = fmtBRL(totalBudget);
  }

  return (
    <>
      {/* Label above bar */}
      <div style={{
        position: 'absolute', left: ex, top: by - LABEL_H - 2,
        width: ew, height: LABEL_H,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
        padding: '0 6px', pointerEvents: 'none', overflow: 'hidden'
      }}>
        {etapa.feito ? (
          <span className="mono" style={{ fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--color-success)', letterSpacing: '0.05em' }}>
            etapa completa
          </span>
        ) : monthOver ? (
          <span className="mono" style={{ fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--color-warning)', letterSpacing: '0.05em' }}>
            etapa atrasada
          </span>
        ) : null}
      </div>

      {/* Bar */}
      <div
        ref={ref}
        onClick={onItemClick}
        onMouseEnter={(e) => { ref.current && setAnchorRect(ref.current.getBoundingClientRect()); e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
        onMouseLeave={(e) => { setAnchorRect(null); e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        style={{
          position: 'absolute', left: ex, top: by,
          width: ew, height: bh,
          background: barBg,
          border: `${barBorderWidth} solid ${barBorderColor}`,
          borderRadius: 5, zIndex: 4,
          cursor: 'pointer',
          transition: 'opacity 0.15s, transform 0.1s, box-shadow 0.1s',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        {/* Spent progress fill */}
        {showProgressFill && spentPct > 0 && (
          <div style={{
            position: 'absolute', left: 0, top: 0,
            width: `${spentPct}%`, height: '100%',
            background: fillBg,
            borderRadius: spentPct >= 100 ? 5 : '3px 0 0 3px', pointerEvents: 'none'
          }} />
        )}

        {/* Value label */}
        {barLabel && (
          <span className="mono" style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 600, color: textColor, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            {barLabel}
          </span>
        )}

        {anchorRect && <PortalTooltip anchorRect={anchorRect}>{tooltip}</PortalTooltip>}
      </div>
    </>
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

  // ── Progresso (sum of percentual of done steps) ──
  const progPct = getProgress(latest);

  const progTooltip =
  <div>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 5 }}>
        Progresso por versão
      </div>
      {item.versions.map((v, i) => {
      const p = getProgress(v);
      const isLatest = i === item.versions.length - 1;
      return (
        <div key={v.number} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, opacity: isLatest ? 1 : 0.65, fontFamily: 'var(--font-mono)' }}>
            <span>v{v.number}{isLatest ? ' (atual)' : ''}</span>
            <span>{p}%</span>
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
        valueFmt={`${progPct}%`}
        tooltipContent={progTooltip} />

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
const GanttChart = ({ items, zoom, onItemClick, onAddItem }) => {
  const scrollRef = useRef(null);
  const today = new Date();today.setHours(0, 0, 0, 0);

  const PX_DAY = zoom === 'days' ? 44 : zoom === 'weeks' ? 16 : 3.5;

  // Date range across all items
  let minDate = null,maxDate = null;
  items.forEach((item) => {
    item.versions.forEach((v) => v.etapas.forEach((e) => {
      if (e.mes) {
        const s = new Date(mesToStartISO(e.mes) + 'T00:00:00');
        const en = new Date(mesToEndISO(e.mes) + 'T00:00:00');
        if (!minDate || s < minDate) minDate = s;
        if (!maxDate || en > maxDate) maxDate = en;
      }
    }));
  });
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
        background: 'var(--color-white)', zIndex: 3, overflowY: 'auto'
      }}>
        <div style={{
          height: HEADER_H, borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0,
          position: 'sticky', top: 0, background: 'var(--color-white)', zIndex: 1
        }}>
          <span style={{
            fontSize: 10, color: 'var(--color-gray-400)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-display)'
          }}>
            Item de Cronograma
          </span>
        </div>

        {items.map((item) => {
          const ROW_H = rowHeight(item.versions.length);
          const latest = item.versions[item.versions.length - 1];
          return (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              style={{
                minHeight: ROW_H, padding: '12px 16px',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                cursor: 'pointer', borderBottom: '1px solid var(--color-gray-200)',
                transition: 'background 0.12s', gap: 9, background: 'var(--color-white)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-gray-100)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-white)'}
            >
              <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 16 }}>
                {latest?.nome || <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>Item sem nome</span>}
              </span>
              <ThreeProgressBars item={item} />
            </div>
          );
        })}

        {/* Add button always at bottom */}
        <div style={{ padding: '14px 16px' }}>
          <button onClick={onAddItem} className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', backgroundColor: 'rgb(226, 239, 246)', color: 'rgb(45, 78, 112)', fontSize: 14 }}>
            + Adicionar Item de Cronograma
          </button>
        </div>
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

          {/* Row bodies — one per item */}
          <div style={{ flex: 1 }}>
            {items.map((item) => {
              const ROW_H = rowHeight(item.versions.length);
              const latest = item.versions[item.versions.length - 1];
              return (
                <div key={item.id} style={{ position: 'relative', height: ROW_H, borderBottom: '1px solid var(--color-gray-200)' }}>
                  {/* Grid lines */}
                  {cols.map((col, i) =>
                    <div key={i} style={{ position: 'absolute', left: col.x + col.width, top: 0, bottom: 0, width: 1, background: 'var(--color-gray-200)', opacity: 0.5 }} />
                  )}
                  {zoom === 'days' && cols.filter((c) => c.isWeekend).map((col, i) =>
                    <div key={i} style={{ position: 'absolute', left: col.x, width: col.width, top: 0, bottom: 0, background: 'rgba(27,60,95,0.025)' }} />
                  )}
                  {/* Today line */}
                  {todayX > 0 && <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 1.5, background: 'var(--color-blue)', opacity: 0.3, zIndex: 1 }} />}

                  {/* Version bars */}
                  {item.versions.map((v, vIdx) => {
                    const isLatest = vIdx === item.versions.length - 1;
                    const range = getVersionRange(v);
                    if (!range) return null;
                    const bx = getX(range.start);
                    const bw = getW(range.start, range.end) + PX_DAY - 3;
                    const by = barY(vIdx, item.versions.length, ROW_H);
                    const bh = isLatest ? MAIN_BAR_H : PREV_BAR_H;

                    return (
                      <React.Fragment key={v.number}>
                        {/* Label left of bar */}
                        <div style={{ position: 'absolute', top: by, left: bx, transform: 'translateX(calc(-100% - 10px))', height: bh, display: 'flex', alignItems: 'center', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: isLatest ? 13 : 11, fontWeight: isLatest ? 700 : 500, color: isLatest ? 'rgb(27,60,95)' : 'var(--color-gray-400)', fontFamily: 'var(--font-display)' }}>
                            {isLatest && latest?.nome ? <>{latest.nome} · <span className="mono" style={{ fontWeight: 600, fontSize: 12 }}>v{v.number}</span></> : <span className="mono">v{v.number}</span>}
                          </span>
                        </div>

                        {/* Latest: step segments + connectors */}
                        {isLatest ? (() => {
                          const dated = v.etapas.filter((e) => e.mes);
                          return dated.map((etapa, eIdx) => {
                            const s = mesToStartISO(etapa.mes);
                            const e2 = mesToEndISO(etapa.mes);
                            const ex = getX(s);
                            const ew = Math.max(4, getW(s, e2) + PX_DAY - 3);
                            const next = dated[eIdx + 1];
                            const OVERLAP = 5;
                            const connectorX = ex + ew - OVERLAP;
                            const nextEx = next ? getX(mesToStartISO(next.mes)) : 0;
                            const connectorW = next ? Math.max(0, nextEx + OVERLAP - connectorX) : 0;
                            return (
                              <React.Fragment key={eIdx}>
                                {connectorW > 0 && <div style={{ position: 'absolute', left: connectorX, top: by, width: connectorW, height: bh, background: 'rgba(212,228,224,0.5)', borderRadius: 2, zIndex: 2, pointerEvents: 'none' }} />}
                                <StepBar etapa={etapa} eIdx={eIdx} ex={ex} ew={ew} by={by} bh={bh} onItemClick={() => onItemClick(item)} />
                              </React.Fragment>
                            );
                          });
                        })() : (
                          <div
                            onClick={() => onItemClick(item)}
                            title={`v${v.number} · ${fmtDatePT(range.start)} → ${fmtDatePT(range.end)}`}
                            style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, background: '#D1D9E1', borderRadius: 3, zIndex: 2, cursor: 'pointer', transition: 'opacity 0.15s', boxShadow: 'var(--shadow-sm)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
            {/* Empty add-button row */}
            <div style={{ height: 56 }} />
          </div>
        </div>
      </div>
    </div>);

};

// ── Default item ──────────────────────────────────────────────────
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
        },
      ]
    }]
  }
];

// ── App ───────────────────────────────────────────────────────────
const App = () => {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // item being edited, or null for new
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [zoom, setZoom] = useState('weeks');
  const [projectName, setProjectName] = useState('Projeto');

  const handleOpenItem = (item) => { setEditingItem(item || null); setModalOpen(true); };
  const handleAddItem = () => { setEditingItem(null); setModalOpen(true); };

  const handleSave = ({ nome, etapas, needsNewVersion }) => {
    setItems((prev) => {
      if (!editingItem) {
        // new item
        const newId = `item-${Date.now()}`;
        return [...prev, { id: newId, versions: [{ number: 1, date: todayISO(), nome, etapas: JSON.parse(JSON.stringify(etapas)) }] }];
      }
      return prev.map((it) => {
        if (it.id !== editingItem.id) return it;
        const versions = [...it.versions];
        if (needsNewVersion) {
          versions.push({ number: versions.length + 1, date: todayISO(), nome, etapas: JSON.parse(JSON.stringify(etapas)) });
        } else {
          versions[versions.length - 1] = { ...versions[versions.length - 1], nome, etapas: JSON.parse(JSON.stringify(etapas)) };
        }
        return { ...it, versions };
      });
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
          {items.some((it) => it.versions.length > 1) &&
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginRight: 8, width: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, borderRadius: 3, background: 'var(--color-blue-50)', backgroundColor: "rgb(209, 217, 225)", height: "16px" }} />
                <span style={{ fontSize: 10, color: 'var(--color-gray-600)', fontFamily: 'var(--font-display)' }}>versões anteriores</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, height: 16, background: 'var(--color-sage)', backgroundColor: "var(--color-sage)", borderRadius: "3px" }} />
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
          <GanttChart items={items} zoom={zoom} onItemClick={handleOpenItem} onAddItem={handleAddItem} />
        </div>
      </div>

      <ItemModal item={editingItem} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
    </div>);

};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);