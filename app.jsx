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

const addMonths = (mesISO, offset) => {
  const [y, m] = mesISO.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + offset;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
};

const shiftTemplateMonths = (grupos, newStartMesISO) => {
  let earliest = null;
  for (const g of grupos) for (const it of g.items) for (const v of it.versions) for (const e of v.etapas)
    if (e.mes && (!earliest || e.mes < earliest)) earliest = e.mes;
  if (!earliest) return grupos;
  const [ey, em] = earliest.split('-').map(Number);
  const [ny, nm] = newStartMesISO.split('-').map(Number);
  const offset = (ny * 12 + nm - 1) - (ey * 12 + em - 1);
  return grupos.map(g => ({
    ...g,
    items: g.items.map(it => ({
      ...it,
      versions: it.versions.map(v => ({
        ...v,
        etapas: v.etapas.map(e => ({ ...e, mes: e.mes ? addMonths(e.mes, offset) : null })),
      })),
    })),
  }));
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

const IconDownload = () =>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 10v1.5A1.5 1.5 0 0 0 2.5 13h9A1.5 1.5 0 0 0 13 11.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;

const IconUpload = () =>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 9V1M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 10v1.5A1.5 1.5 0 0 0 2.5 13h9A1.5 1.5 0 0 0 13 11.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;

const IconX = () =>
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>;

// ── Template API ───────────────────────────────────────────────────
const API_BASE = 'https://carnauba-api.cronemberger.workers.dev';

const apiFetchTemplates = () =>
  fetch(`${API_BASE}/templates`).then(r => r.json());

const apiSaveTemplate = (tpl) =>
  fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tpl),
  });

const apiDeleteTemplate = (id) =>
  fetch(`${API_BASE}/templates/${encodeURIComponent(id)}`, { method: 'DELETE' });

const normalizeToTemplate = (grupos) =>
  grupos.map((g, gi) => ({
    id: `grupo-tpl-${Date.now()}-${gi}`,
    nome: g.nome,
    collapsed: false,
    items: g.items.map((item, ii) => {
      const latest = item.versions[item.versions.length - 1];
      const cleanEtapas = (latest.etapas || []).map(e => ({
        ...e,
        gastoMaterial: 0, gastoMaoDeObra: 0,
        recebidoMaterial: 0, recebidoMaoDeObra: 0,
        valorRecebido: 0,
        feito: false,
        percentualRealizado: 0,
      }));
      return {
        id: `item-tpl-${Date.now()}-${gi}-${ii}`,
        versions: [{ number: 1, date: todayISO(), nome: latest.nome, etapas: cleanEtapas }],
      };
    }),
  }));


// ── Sidebar ────────────────────────────────────────────────────────
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
  const GANTT_BAR_H        = 24;

  const GanttItemBar = ({ etapa, itemOriginX, vizMode = 'financeiro' }) => {
    const col = getCol(etapa.mes);
    if (!col) return null;
    const barLeft  = col.x - itemOriginX + 8;
    const barWidth = col.width - 16;

    let segments;
    if (vizMode === 'fisico') {
      const etapaStart   = new Date(mesToStartISO(etapa.mes) + 'T00:00:00');
      const isStarted    = etapaStart <= today;
      const warn         = etapaShowsWarning(etapa);
      const pct          = Number(etapa.percentual) || 0;
      const percReal     = Number(etapa.percentualRealizado) || 0;
      const realizedAbs  = pct * percReal / 100;
      const unrealizedAbs = Math.max(0, pct - realizedAbs);
      const unrealizedBg    = warn ? VM_WARNING.active : VM_FISICO.active;
      const unrealizedColor = warn ? VM_WARNING.text2 : VM_FISICO.text2;
      segments = [
        { pct: 100,                              left: 0,           bg: VM_NEUTRAL.bg3,    label: null,                                                                   labelColor: VM_NEUTRAL.text1 },
        { pct: realizedAbs,                      left: 0,           bg: VM_FISICO.complete, label: realizedAbs > 0 ? `${Math.round(realizedAbs)}%` : null,               labelColor: VM_FISICO.text1 },
        { pct: isStarted ? unrealizedAbs : 0,   left: realizedAbs, bg: unrealizedBg,       label: (isStarted && unrealizedAbs > 0) ? `${Math.round(unrealizedAbs)}%` : null, labelColor: unrealizedColor },
      ];
      const futuro    = isStarted ? 0 : pct;
      const planejado = isStarted ? (warn ? 0 : unrealizedAbs) : 0;
      const realizado = realizedAbs;
      const atraso    = warn ? unrealizedAbs : 0;
      return (
        <div style={{ position: 'absolute', left: barLeft, width: barWidth, height: GANTT_BAR_H, top: '50%', transform: 'translateY(-50%)' }}>
          <FisicoTooltip futuro={futuro} planejado={planejado} realizado={realizado} atraso={atraso} wrapperStyle={{ height: GANTT_BAR_H }}>
            <div style={{ height: GANTT_BAR_H, borderRadius: 8, overflow: 'hidden' }}>
              <ProgressCard segments={segments} minHeight={GANTT_BAR_H} borderRadius={8} />
            </div>
          </FisicoTooltip>
        </div>
      );
    } else {
      const budget   = (Number(etapa.orcamentoMaterial) || 0) + (Number(etapa.orcamentoMaoDeObra) || 0);
      const gasto    = (Number(etapa.gastoMaterial) || 0) + (Number(etapa.gastoMaoDeObra) || 0);
      const recebido = etapaRecebido(etapa);
      segments = buildFinancialSegments(budget, recebido, gasto);
      const _b = budget, _g = gasto, _r = recebido;
      return (
        <div style={{ position: 'absolute', left: barLeft, width: barWidth, height: GANTT_BAR_H, top: '50%', transform: 'translateY(-50%)' }}>
          <Tooltip solicitado={_b} recebido={_r} gasto={_g} warn={_g > _r} wrapperStyle={{ height: GANTT_BAR_H }}>
            <div style={{ height: GANTT_BAR_H, borderRadius: 8, overflow: 'hidden' }}>
              <ProgressCard segments={segments} minHeight={GANTT_BAR_H} borderRadius={8} />
            </div>
          </Tooltip>
        </div>
      );
    }
  };

  // ── GanttGroupBar — aggregate bar for one month in a group ───────────
  const GanttGroupBar = ({ grupo, mes, groupOriginX, vizMode = 'financeiro' }) => {
    const col = getCol(mes);
    if (!col) return null;
    let hasEtapas = false;
    let segments;

    if (vizMode === 'fisico') {
      let totalPct = 0, realizadoPct = 0, ativoPct = 0, overduePct = 0, overdueRealizedPct = 0;
      const numItems = grupo.items.length || 1;
      const mesStart = new Date(mesToStartISO(mes) + 'T00:00:00');
      grupo.items.forEach(item => {
        const latest = item.versions[item.versions.length - 1];
        const etapasInMonth = latest.etapas.filter(e => e.mes === mes);
        etapasInMonth.forEach(e => {
          hasEtapas = true;
          const pct = Number(e.percentual) || 0;
          totalPct += pct;
          realizadoPct += pct * (Number(e.percentualRealizado) || 0) / 100;
          if (mesStart <= today) {
            ativoPct += pct;
            if (etapaShowsWarning(e)) {
              overduePct += pct;
              overdueRealizedPct += pct * (Number(e.percentualRealizado) || 0) / 100;
            }
          }
        });
      });
      if (!hasEtapas) return null;
      const norm = totalPct > 0 ? 100 / totalPct : 0;
      const rp   = Math.min(100, realizadoPct * norm);
      const ap   = Math.min(100, ativoPct * norm);
      const op   = Math.min(100, overduePct * norm);
      const orp  = Math.min(op, overdueRealizedPct * norm);

      const overdueUnrealized    = Math.max(0, op - orp);
      const nonOverdueUnrealized = Math.max(0, (ap - op) - (rp - orp));
      const futuroPct = Math.max(0, 100 - ap);
      const atrasoPct = overdueUnrealized;

      // Average labels: divide accumulated sums by item count so months sum to 100%
      const avgRealizado = Math.round(realizadoPct / numItems);
      const avgOverdueUnrealized    = Math.max(0, Math.round((overduePct - overdueRealizedPct) / numItems));
      const avgNonOverdueUnrealized = Math.max(0, Math.round((ativoPct - overduePct - (realizadoPct - overdueRealizedPct)) / numItems));

      segments = [
        { pct: 100,                  left: 0,                        bg: VM_NEUTRAL.bg3,    label: null,                                                              labelColor: VM_NEUTRAL.text1 },
        { pct: rp,                   left: 0,                        bg: VM_FISICO.complete, label: rp > 0 ? `${avgRealizado}%` : null,                                labelColor: VM_FISICO.text1 },
        { pct: overdueUnrealized,    left: rp,                       bg: VM_WARNING.active, label: overdueUnrealized > 0 ? `${avgOverdueUnrealized}%` : null,          labelColor: VM_WARNING.text2 },
        { pct: nonOverdueUnrealized, left: rp + overdueUnrealized,   bg: VM_FISICO.active,  label: nonOverdueUnrealized > 0 ? `${avgNonOverdueUnrealized}%` : null,   labelColor: VM_FISICO.text2 },
      ];
      const barLeft = col.x - groupOriginX + CARD_PAD + 8;
      const barWidth = col.width - 16;
      return (
        <div style={{ position: 'absolute', left: barLeft, width: barWidth, height: GANTT_BAR_H, top: '50%', transform: 'translateY(-50%)' }}>
          <FisicoTooltip futuro={futuroPct} planejado={nonOverdueUnrealized} realizado={rp} atraso={atrasoPct} wrapperStyle={{ height: GANTT_BAR_H }}>
            <div style={{ height: GANTT_BAR_H, borderRadius: 8, overflow: 'hidden' }}>
              <ProgressCard segments={segments} minHeight={GANTT_BAR_H} borderRadius={8} />
            </div>
          </FisicoTooltip>
        </div>
      );
    } else {
      let budget = 0, recebidoSum = 0, gasto = 0, hasMonthOverrun = false;
      grupo.items.forEach(item => {
        const latest = item.versions[item.versions.length - 1];
        latest.etapas.filter(e => e.mes === mes).forEach(e => {
          hasEtapas   = true;
          budget      += (Number(e.orcamentoMaterial) || 0) + (Number(e.orcamentoMaoDeObra) || 0);
          gasto       += (Number(e.gastoMaterial) || 0) + (Number(e.gastoMaoDeObra) || 0);
          recebidoSum += etapaRecebido(e);
          const eRec = etapaRecebido(e);
          const eGas = (Number(e.gastoMaterial)||0) + (Number(e.gastoMaoDeObra)||0);
          if (eGas > eRec) hasMonthOverrun = true;
        });
      });
      if (!hasEtapas) return null;
      segments = buildFinancialSegments(budget, recebidoSum, gasto, hasMonthOverrun);
      const barLeft  = col.x - groupOriginX + CARD_PAD + 8;
      const barWidth = col.width - 16;
      return (
        <div style={{ position: 'absolute', left: barLeft, width: barWidth, height: GANTT_BAR_H, top: '50%', transform: 'translateY(-50%)' }}>
          <Tooltip solicitado={budget} recebido={recebidoSum} gasto={gasto} warn={hasMonthOverrun || gasto > recebidoSum} wrapperStyle={{ height: GANTT_BAR_H }}>
            <div style={{ height: GANTT_BAR_H, borderRadius: 8, overflow: 'hidden' }}>
              <ProgressCard segments={segments} minHeight={GANTT_BAR_H} borderRadius={8} />
            </div>
          </Tooltip>
        </div>
      );
    }

  };

  // ── GanttItemCard — white card (bars only) + title to its left ───────
  const GanttItemCard = ({ item, itemIndex, groupOriginX, onClick, vizMode = 'financeiro' }) => {
    const latest       = item.versions[item.versions.length - 1];
    const latestEtapas = latest.etapas.filter(e => e.mes && getCol(e.mes));
    if (!latestEtapas.length) return null;

    const sorted      = latestEtapas.slice().sort((a, b) => a.mes < b.mes ? -1 : 1);
    const firstCol    = getCol(sorted[0].mes);
    const lastCol     = getCol(sorted[sorted.length - 1].mes);
    const cardLeft    = firstCol.x - groupOriginX + CARD_PAD;
    const cardWidth   = lastCol.x + lastCol.width - firstCol.x;
    const barCardH    = ITEM_ROW_H - 18;  // matches ItemCronograma height (row - top pad - bottom pad)
    const rowStartY   = GROUP_ROW_H - 8 + itemIndex * ITEM_ROW_H;
    const cardTop     = rowStartY + Math.round((ITEM_ROW_H - barCardH) / 2);
    const itemOriginX = firstCol.x;

    return (
      <React.Fragment>
        {/* Title — left of the bar card, right-aligned; sticky left col visually clips overflow */}
        <div style={{
          position: 'absolute',
          left: -(groupOriginX - CARD_PAD), top: cardTop,
          width: groupOriginX - CARD_PAD + cardLeft - 8,
          height: barCardH,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: 6,
          fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
          color: VM_NEUTRAL.text2, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          {latest.nome || 'Item'}
        </div>

        {/* Bars card — width = bars only */}
        <div
          onClick={onClick}
          style={{
            position: 'absolute',
            left: cardLeft, top: cardTop, width: cardWidth, height: barCardH,
            background: 'white', borderRadius: 10,
            border: '1px solid rgba(66,140,185,0.15)',
            boxShadow: '0 1px 4px rgba(13,27,38,0.06)',
            cursor: 'pointer', transition: 'box-shadow 0.15s',
            pointerEvents: 'auto', overflow: 'hidden',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(13,27,38,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(13,27,38,0.06)'}
        >
          {latestEtapas.map(etapa => (
            <GanttItemBar key={etapa.id || etapa.mes} etapa={etapa} itemOriginX={itemOriginX} vizMode={vizMode} />
          ))}
        </div>
      </React.Fragment>
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
    const titleAreaH   = headerH - 8;

    return (
      <React.Fragment>
        {/* Group title — spans from left column right edge to just before the group card */}
        <div style={{
          position: 'absolute', top: 0,
          left: LEFT_COL_W,
          width: Math.max(0, groupOriginX - 8),
          height: headerH,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: 6,
          fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
          color: VM_NEUTRAL.text3, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          {grupo.nome}
        </div>

        <div style={{
          position: 'absolute', top: 8, left: cardLeft,
          width: cardWidth, height: totalRows - 16,
          background: VM_NEUTRAL.bg1,
          borderRadius: 12,
          border: `1px solid ${VM_NEUTRAL.bg3}`,
          boxShadow: '0 1px 6px rgba(13,27,38,0.05)',
          pointerEvents: 'none', overflow: 'visible',
        }}>
          {/* Group bars — centered in header area */}
          <div style={{ position: 'relative', height: headerH - 16, pointerEvents: 'auto' }}>
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
      </React.Fragment>
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
        <DragDropContext
          onDragStart={() => { window.__tooltipDragBlocked = true; window.dispatchEvent(new Event('tooltip-drag-start')); }}
          onDragEnd={(result) => {
            onDragEnd(result);
            setTimeout(() => { window.__tooltipDragBlocked = false; }, 50);
          }}
        >
          <Droppable
            droppableId="groups-list"
            type="GROUP"
            renderClone={(provided, snapshot, rubric) => {
              const grupo = grupos[rubric.source.index];
              const h = grupo.collapsed ? GROUP_ROW_H_COLLAPSED : GROUP_ROW_H;
              return (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{ ...provided.draggableProps.style, width: LEFT_COL_W, height: h, padding: '8px', boxSizing: 'border-box' }}
                >
                  <GrupoHeader
                    grupo={grupo}
                    dragHandleProps={null}
                    onToggle={() => {}}
                    onRenameGroup={null}
                    vizMode={vizMode}
                    isDragging={true}
                  />
                </div>
              );
            }}
          >
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
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                          <RowRight bg="var(--color-gray-100)" />
                        </div>

                        {/* Item rows */}
                        {!grupo.collapsed && (
                          <Droppable
                            droppableId={grupo.id}
                            type="ITEM"
                            renderClone={(provided, snapshot, rubric) => {
                              const item = grupo.items[rubric.source.index];
                              return (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{ ...provided.draggableProps.style, width: LEFT_COL_W, height: ITEM_ROW_H, padding: '0 8px', display: 'flex', alignItems: 'stretch', boxSizing: 'border-box' }}
                                >
                                  <div style={{ flex: 1, padding: '9px 8px' }}>
                                    <ItemCronograma
                                      item={item}
                                      dragHandleProps={null}
                                      onClick={() => {}}
                                      vizMode={vizMode}
                                      isDragging={true}
                                    />
                                  </div>
                                </div>
                              );
                            }}
                          >
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
          valorRecebido: '', recebidoMaterial: '', recebidoMaoDeObra: '',
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
          valorRecebido: '', recebidoMaterial: '', recebidoMaoDeObra: '',
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
  const [grupos, setGrupos]               = useState([]);
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingItem, setEditingItem]     = useState(null);
  const [editingContext, setEditingContext] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectName, setProjectName]     = useState('Projeto');
  const [vizMode, setVizMode]             = useState('financeiro');

  // ── Template state ──────────────────────────────────────────────
  const [templates, setTemplates]               = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateNameDialog, setTemplateNameDialog] = useState(false);
  const [pendingTemplateName, setPendingTemplateName] = useState('');
  const [loadMonthTpl, setLoadMonthTpl]         = useState(null);
  const [pendingLoadMonth, setPendingLoadMonth] = useState('');
  const [loadMonthError, setLoadMonthError]     = useState('');
  const [deleteConfirmTplId, setDeleteConfirmTplId] = useState(null);
  const importFileRef = useRef(null);

  useEffect(() => {
    apiFetchTemplates()
      .then(data => { setTemplates(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, []);

  const refreshTemplates = () =>
    apiFetchTemplates().then(data => setTemplates(Array.isArray(data) ? data : [])).catch(() => {});

  const handleOpenSaveTemplateDialog = () => {
    setPendingTemplateName('');
    setTemplateNameDialog(true);
  };

  const handleConfirmSaveTemplate = async () => {
    const name = pendingTemplateName.trim();
    if (!name) return;
    const tpl = {
      id: `tpl-${Date.now()}`,
      name,
      savedAt: new Date().toISOString(),
      grupos: normalizeToTemplate(grupos),
    };
    setTemplateNameDialog(false);
    setPendingTemplateName('');
    // Optimistic update — KV list() is eventually consistent, so show immediately
    setTemplates(prev => [tpl, ...prev]);
    await apiSaveTemplate(tpl).catch(() => {});
    setTimeout(refreshTemplates, 3000);
  };

  const handleConfirmLoadWithMonth = () => {
    if (!loadMonthTpl) return;
    const match = pendingLoadMonth.match(/^(\d{2})\/(\d{4})$/);
    if (!match) { setLoadMonthError('Formato inválido. Use MM/AAAA.'); return; }
    const [, mm, yyyy] = match;
    const mesISO = `${yyyy}-${mm}`;
    const shifted = shiftTemplateMonths(loadMonthTpl.grupos.map(g => ({ ...g, collapsed: true })), mesISO);
    setGrupos(shifted);
    setLoadMonthTpl(null);
    setPendingLoadMonth('');
    setLoadMonthError('');
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!deleteConfirmTplId) return;
    const id = deleteConfirmTplId;
    setDeleteConfirmTplId(null);
    // Optimistic update — remove immediately, sync after KV propagates
    setTemplates(prev => prev.filter(t => t.id !== id));
    await apiDeleteTemplate(id).catch(() => {});
    setTimeout(refreshTemplates, 3000);
  };

  const handleExportTemplates = () => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'carnauba-templates.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        const arr = Array.isArray(imported) ? imported : [imported];
        const existingIds = new Set(templates.map(t => t.id));
        const newOnes = arr.filter(t => t?.id && t?.name && !existingIds.has(t.id));
        await Promise.all(newOnes.map(t => apiSaveTemplate(t))).catch(() => {});
        refreshTemplates();
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          height: 56, borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', alignItems: 'center', padding: '0 20px',
          background: 'var(--color-white)', flexShrink: 0, gap: 36,
        }}>
          <span style={{
            fontWeight: 700, fontSize: 15,
            color: 'var(--color-navy)', fontFamily: 'var(--font-display)',
            letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
            flexShrink: 0,
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
                padding: '5px 14px', fontSize: 10, fontWeight: 600,
                fontFamily: 'var(--font-display)', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                background: vizMode === vm.key ? vm.active : 'var(--color-white)',
                color: vizMode === vm.key ? 'white' : VM_NEUTRAL.text2,
              }}>{vm.label}</button>
            ))}
          </div>

          {/* Color legend — centered */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {(vizMode === 'financeiro' ? [
                { color: VM_NEUTRAL.bg3,          label: 'Não recebido' },
                { color: VM_FINANCEIRO.active,    label: 'Recebido' },
                { color: VM_FINANCEIRO.complete,  label: 'Gasto' },
                { color: VM_WARNING.active,       label: 'Ultrapassado' },
              ] : [
                { color: VM_NEUTRAL.bg3,          label: 'Planejamento futuro' },
                { color: VM_FISICO.active,        label: 'Planejado para o mês' },
                { color: VM_FISICO.complete,      label: 'Progresso realizado' },
                { color: VM_WARNING.active,       label: 'Atividades em atraso' },
              ]).map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: VM_NEUTRAL.text2, whiteSpace: 'nowrap', fontFamily: 'var(--font-display)' }}>{label}</span>
                </div>
              ))}
            </div>
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

        {/* Cronograma footer */}
        <div style={{
          height: 52, flexShrink: 0,
          borderTop: '1px solid rgba(0,0,0,0.07)',
          background: 'var(--color-white)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 10,
        }}>
          {/* Template pills */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, overflowX: 'auto', minWidth: 0 }}>
            {templatesLoading && (
              <span style={{ fontSize: 11, color: 'var(--color-gray-400)', whiteSpace: 'nowrap' }}>Carregando templates…</span>
            )}
            {!templatesLoading && templates.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--color-gray-400)', whiteSpace: 'nowrap' }}>Nenhum template salvo</span>
            )}
            {templates.map(tpl => (
              <div key={tpl.id} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(115,169,199,0.13)', borderRadius: 100,
                padding: '3px 6px 3px 10px', flexShrink: 0,
              }}>
                <button
                  onClick={() => { setLoadMonthTpl(tpl); setPendingLoadMonth(''); setLoadMonthError(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 500, color: 'var(--color-navy)',
                    padding: 0, whiteSpace: 'nowrap',
                  }}
                >{tpl.name}</button>
                <button
                  onClick={() => setDeleteConfirmTplId(tpl.id)}
                  title="Deletar template"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-gray-400)', padding: '1px 2px',
                    display: 'flex', alignItems: 'center',
                    borderRadius: 3, transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-red, #e05)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-gray-400)'}
                ><IconX /></button>
              </div>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={handleOpenSaveTemplateDialog}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--color-navy)', color: 'white',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-display)', whiteSpace: 'nowrap',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <IconSave /><span>Salvar como Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* Template name dialog */}
      {templateNameDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => setTemplateNameDialog(false)}>
          <div style={{
            background: 'var(--color-white)', borderRadius: 10, padding: '24px 28px',
            minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-navy)', marginBottom: 14, fontFamily: 'var(--font-display)' }}>
              Salvar como Template
            </div>
            <input
              autoFocus
              value={pendingTemplateName}
              onChange={e => setPendingTemplateName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmSaveTemplate(); if (e.key === 'Escape') setTemplateNameDialog(false); }}
              placeholder="Nome do template…"
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid var(--color-gray-200)', borderRadius: 6,
                padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
                outline: 'none', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setTemplateNameDialog(false)} style={{
                background: 'none', border: '1px solid var(--color-gray-200)',
                borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                color: 'var(--color-gray-500)',
              }}>Cancelar</button>
              <button onClick={handleConfirmSaveTemplate} disabled={!pendingTemplateName.trim()} style={{
                background: 'var(--color-navy)', color: 'white', border: 'none',
                borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600,
                cursor: pendingTemplateName.trim() ? 'pointer' : 'not-allowed',
                opacity: pendingTemplateName.trim() ? 1 : 0.5,
                fontFamily: 'var(--font-display)',
              }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Load template — month picker */}
      {loadMonthTpl && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => setLoadMonthTpl(null)}>
          <div style={{
            background: 'var(--color-white)', borderRadius: 10, padding: '24px 28px',
            minWidth: 340, maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-navy)', marginBottom: 6, fontFamily: 'var(--font-display)' }}>
              Carregar Template
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-gray-600)', marginBottom: 16, lineHeight: 1.5, margin: '0 0 16px' }}>
              Carregar <strong>«{loadMonthTpl.name}»</strong>. Isso substituirá o cronograma atual.
            </p>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Mês de início das obras (MM/AAAA)
            </label>
            <input
              autoFocus
              value={pendingLoadMonth}
              onChange={e => { setPendingLoadMonth(e.target.value); setLoadMonthError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmLoadWithMonth(); if (e.key === 'Escape') setLoadMonthTpl(null); }}
              placeholder="ex: 11/2025"
              maxLength={7}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: `1px solid ${loadMonthError ? '#dc2626' : 'var(--color-gray-200)'}`,
                borderRadius: 6, padding: '8px 10px', fontSize: 14,
                fontFamily: 'inherit', outline: 'none', marginBottom: 4,
              }}
            />
            {loadMonthError && (
              <p style={{ fontSize: 11, color: '#dc2626', margin: '0 0 12px' }}>{loadMonthError}</p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setLoadMonthTpl(null)} style={{
                background: 'none', border: '1px solid var(--color-gray-200)',
                borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                color: 'var(--color-gray-500)',
              }}>Cancelar</button>
              <button onClick={handleConfirmLoadWithMonth} disabled={!pendingLoadMonth.trim()} style={{
                background: 'var(--color-navy)', color: 'white', border: 'none',
                borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600,
                cursor: pendingLoadMonth.trim() ? 'pointer' : 'not-allowed',
                opacity: pendingLoadMonth.trim() ? 1 : 0.5,
                fontFamily: 'var(--font-display)',
              }}>Carregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete template confirmation */}
      {deleteConfirmTplId && (() => {
        const tpl = templates.find(t => t.id === deleteConfirmTplId);
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }} onClick={() => setDeleteConfirmTplId(null)}>
            <div style={{
              background: 'var(--color-white)', borderRadius: 10, padding: '24px 28px',
              minWidth: 320, maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-navy)', marginBottom: 10, fontFamily: 'var(--font-display)' }}>
                Deletar Template
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-gray-600)', marginBottom: 20, lineHeight: 1.5 }}>
                Deletar o template <strong>«{tpl?.name}»</strong>? Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteConfirmTplId(null)} style={{
                  background: 'none', border: '1px solid var(--color-gray-200)',
                  borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                  color: 'var(--color-gray-500)',
                }}>Cancelar</button>
                <button onClick={handleConfirmDeleteTemplate} style={{
                  background: '#dc2626', color: 'white', border: 'none',
                  borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-display)',
                }}>Deletar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {editingItem
        ? <ItemModal item={editingItem} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} onDelete={handleDeleteItem} vizMode={vizMode} />
        : <NovoItemDrawer isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
      }
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
