// item-modal.jsx — Carnaúba DS · Item Tracking Drawer
const { useState, useEffect, useRef } = React;

// ── Helpers ───────────────────────────────────────────────────────
const fmtBRLModal = (v) =>
  'R$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(v) || 0);

const fmtDatePT = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${String(y).slice(-2)}`;
};

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const fmtMes = (mesISO) => {
  if (!mesISO) return '—';
  const [y, m] = mesISO.split('-');
  return `${MONTHS_FULL_PT[parseInt(m, 10) - 1]} / ${y}`;
};

const fmtMesShort = (mesISO) => {
  if (!mesISO) return '—';
  const [y, m] = mesISO.split('-');
  return `${MONTHS_PT[parseInt(m, 10) - 1]} / ${y}`;
};

const newEtapaObj = () => ({
  id: `e${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
  mes: '', percentual: '', orcamentoMaterial: '', orcamentoMaoDeObra: '',
  descricao: '', feito: false, gastoMaterial: '', gastoMaoDeObra: '',
  valorRecebido: '', recebidoMaterial: '', recebidoMaoDeObra: '',
  percentualRealizado: 0,
});

// ── NumInput ──────────────────────────────────────────────────────
const formatPTBR = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
};

const NumInput = ({ value, onChange, placeholder, disabled, style: extraStyle, className }) => {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');
  return (
    <input
      type="text" inputMode="numeric"
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      style={extraStyle || {}}
      value={focused ? raw : formatPTBR(value)}
      onFocus={() => { setRaw(value === '' || value == null ? '' : String(value)); setFocused(true); }}
      onChange={(e) => { const s = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, ''); setRaw(s); onChange(s === '' ? '' : Number(s)); }}
      onBlur={() => setFocused(false)}
    />
  );
};

// ── MonthPicker ───────────────────────────────────────────────────
const MonthPicker = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const today = new Date();
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.split('-')[0], 10) : today.getFullYear());

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selYear = value ? parseInt(value.split('-')[0], 10) : null;
  const selMonth = value ? parseInt(value.split('-')[1], 10) - 1 : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', padding: '7px 10px',
          background: disabled ? 'var(--color-gray-100)' : 'var(--color-white)',
          border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-sm)',
          fontSize: 13, fontFamily: 'var(--font-body)',
          color: value ? 'var(--color-navy)' : 'var(--color-gray-400)',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}
      >
        <span>{value ? fmtMes(value) : 'Selecionar mês'}</span>
        {!disabled && <span style={{ color: 'var(--color-gray-400)', display: 'flex' }}><IconCalendar /></span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--color-white)', border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          zIndex: 999, padding: '12px', minWidth: 240
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => setViewYear((y) => y - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-navy)', padding: '2px 6px' }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-navy)', fontFamily: 'var(--font-display)' }}>{viewYear}</span>
            <button type="button" onClick={() => setViewYear((y) => y + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-navy)', padding: '2px 6px' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {MONTHS_PT.map((m, i) => {
              const isSel = selYear === viewYear && selMonth === i;
              return (
                <button
                  key={i} type="button"
                  onClick={() => { onChange(`${viewYear}-${String(i + 1).padStart(2, '0')}`); setOpen(false); }}
                  style={{
                    padding: '6px 4px', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: isSel ? 'var(--color-navy)' : 'transparent',
                    color: isSel ? 'white' : 'var(--color-navy)',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--color-gray-100)'; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Icons ─────────────────────────────────────────────────────────
const IconCalendar = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2.5" width="11" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 1v3M9 1v3M1 6h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IconCheck  = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconWarn   = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}><path d="M5.5 1L10.5 10H0.5L5.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5.5 4.5v2.5M5.5 8.5v.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const IconPencil = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M7.5 1.5l2 2L3 10H1V8L7.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
const IconEditSm = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 9.5h9M7 1.5l2 2L3.5 9H1.5V7L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// ── ConfirmDialog ─────────────────────────────────────────────────
const ConfirmDialog = ({ show, nextVersionNumber, onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(13,27,38,0.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 380, background: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)', padding: '28px 28px 22px',
        boxShadow: 'var(--shadow-xl)', zIndex: 11,
      }}>
        <div style={{ marginBottom: 6, fontSize: 15, fontWeight: 700, color: 'var(--color-navy)' }}>
          Salvar como versão {nextVersionNumber}?
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-gray-600)', lineHeight: 1.55, marginBottom: 20 }}>
          As alterações no planejamento das etapas serão registradas como uma nova versão (v{nextVersionNumber}), preservando o histórico anterior.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn btn-ghost">Cancelar</button>
          <button onClick={onConfirm} className="btn btn-primary">Confirmar v{nextVersionNumber}</button>
        </div>
      </div>
    </>
  );
};

// ── ItemDrawer ────────────────────────────────────────────────────
const ItemDrawer = ({ item, isOpen, onClose, onSave, onDelete, vizMode = 'financeiro' }) => {
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [editEtapas, setEditEtapas] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const latestIdx = item ? item.versions.length - 1 : -1;
  const isLatest  = activeVersionIdx === latestIdx;

  useEffect(() => {
    if (isOpen && item) {
      const idx = item.versions.length - 1;
      setActiveVersionIdx(idx);
      setEditEtapas(JSON.parse(JSON.stringify(item.versions[idx].etapas)));
      setShowEdit(false);
      setPendingSave(null);
    }
  }, [isOpen, item]);

  const switchVersion = (idx) => {
    setActiveVersionIdx(idx);
    if (idx === item.versions.length - 1) {
      setEditEtapas(JSON.parse(JSON.stringify(item.versions[idx].etapas)));
    }
  };

  const handleEtapaChange = (idx, field, value) => {
    if (!isLatest) return;
    setEditEtapas(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const checkNeedsNewVersion = (newEtapas) => {
    const saved = item.versions[item.versions.length - 1].etapas;
    if (newEtapas.length !== saved.length) return true;
    for (let i = 0; i < newEtapas.length; i++) {
      const s = saved[i] || {};
      const e = newEtapas[i];
      if (
        String(e.percentual)         !== String(s.percentual) ||
        (e.mes || '')                !== (s.mes || '') ||
        String(e.orcamentoMaterial)  !== String(s.orcamentoMaterial) ||
        String(e.orcamentoMaoDeObra) !== String(s.orcamentoMaoDeObra)
      ) return true;
    }
    return false;
  };

  const handleEditSave = ({ nome, etapas }) => {
    setShowEdit(false);
    if (checkNeedsNewVersion(etapas)) {
      setPendingSave({ nome, etapas });
    } else {
      setEditEtapas(JSON.parse(JSON.stringify(etapas)));
      onSave({ nome, etapas, needsNewVersion: false });
    }
  };

  const handleConfirmSave = () => {
    if (!pendingSave) return;
    onSave({ nome: pendingSave.nome, etapas: pendingSave.etapas, needsNewVersion: true });
    setPendingSave(null);
  };

  const handleFooterSave = () => {
    const activeVersion = item.versions[activeVersionIdx];
    onSave({ nome: activeVersion.nome, etapas: editEtapas, needsNewVersion: false });
  };

  if (!isOpen || !item) return null;

  const activeVersion   = item.versions[activeVersionIdx];
  const displayedEtapas = isLatest ? editEtapas : activeVersion.etapas;
  const nome            = activeVersion.nome;
  const nextVersionNum  = item.versions.length + 1;

  const etapasWithMes = displayedEtapas.filter(e => e.mes);
  const startMes = etapasWithMes[0]?.mes;
  const endMes   = etapasWithMes[etapasWithMes.length - 1]?.mes;

  const totalSolicitado = editEtapas.reduce((s, e) => s + (Number(e.orcamentoMaterial) || 0) + (Number(e.orcamentoMaoDeObra) || 0), 0);
  const totalRecebido   = editEtapas.reduce((s, e) =>
    s + ((Number(e.recebidoMaterial)||0) + (Number(e.recebidoMaoDeObra)||0) || (Number(e.valorRecebido)||0)), 0);
  const totalGasto      = editEtapas.reduce((s, e) => s + (Number(e.gastoMaterial) || 0) + (Number(e.gastoMaoDeObra) || 0), 0);
  const totalGastoOverrun = editEtapas.some(e => {
    const rec = (Number(e.recebidoMaterial)||0) + (Number(e.recebidoMaoDeObra)||0) || (Number(e.valorRecebido)||0);
    const gas = (Number(e.gastoMaterial)||0) + (Number(e.gastoMaoDeObra)||0);
    return gas > rec;
  });

  const editInitialData = {
    nome: item.versions[latestIdx].nome,
    etapas: JSON.parse(JSON.stringify(editEtapas)),
  };

  // ── FINANCEIRO header StatusDiv: 3 aggregate ValueTags ───────────
  const headerFinanceiroStatusDiv = (
    <div style={{ display: 'flex', gap: 6 }}>
      <ValueTag
        label="GASTO"
        value={fmtBRLModal(totalGasto)}
        bg={totalGastoOverrun ? VM_WARNING.active : VM_FINANCEIRO.complete}
        color={totalGastoOverrun ? VM_WARNING.text1 : 'white'}
      />
      <ValueTag
        label="RECEBIDO"
        value={fmtBRLModal(totalRecebido)}
        bg={VM_FINANCEIRO.active}
        color={VM_FINANCEIRO.text1}
      />
      <ValueTag
        label="SOLICITADO"
        value={fmtBRLModal(totalSolicitado)}
        bg={VM_NEUTRAL.bg3}
        color={VM_NEUTRAL.text2}
      />
    </div>
  );

  // ── FISICO header StatusDiv: aggregate progress bar ──────────────
  const fisicoRealizadoPct = editEtapas.reduce((sum, e) => {
    const perc = Number(e.percentual) || 0;
    const real = Number(e.percentualRealizado) || 0;
    return sum + (perc * real / 100);
  }, 0);
  const fisicoOverduePct = Math.min(100, displayedEtapas
    .filter(e => etapaShowsWarning(e))
    .reduce((s, e) => s + (Number(e.percentual) || 0), 0));
  const _today = new Date(); _today.setHours(0, 0, 0, 0);
  const fisicoAtivoPct  = Math.min(100, displayedEtapas
    .filter(e => e.mes && new Date(e.mes + '-01T00:00:00') <= _today)
    .reduce((s, e) => s + (Number(e.percentual) || 0), 0));
  const fisicoActivePct = Math.min(100, fisicoAtivoPct + fisicoOverduePct);

  const headerFisicoStatusDiv = (
    <div style={{ minWidth: 220 }}>
      <SegBar
        segments={[
          { pct: 100,              bg: VM_NEUTRAL.bg3,    label: null,                                                   labelColor: VM_NEUTRAL.text1 },
          { pct: fisicoActivePct,  bg: fisicoOverduePct > 0 ? VM_WARNING.active   : VM_FISICO.active,   label: fisicoActivePct  > 0 ? `${Math.round(fisicoActivePct)}%`  : null, labelColor: fisicoOverduePct > 0 ? VM_WARNING.text2 : VM_FISICO.text2 },
          { pct: fisicoRealizadoPct, bg: fisicoOverduePct > 0 ? VM_WARNING.complete : VM_FISICO.complete, label: fisicoRealizadoPct > 0 ? `${Math.round(fisicoRealizadoPct)}%` : null, labelColor: fisicoOverduePct > 0 ? VM_WARNING.text1 : VM_FISICO.text1 },
        ]}
        height={28}
        borderRadius={8}
        label="% DO ITEM EM RELAÇÃO AO CRONOGRAMA"
      />
    </div>
  );

  // Version tags for DrawerHeader Row 2
  const versionTags = item.versions.map((v, idx) => ({
    label: `v${v.number}${v.date ? ` · ${fmtDatePT(v.date)}` : ''}`,
    fill: activeVersionIdx === idx ? 'var(--color-navy)' : 'transparent',
    strokeColor: activeVersionIdx === idx ? 'var(--color-navy)' : 'var(--color-gray-200)',
    textStyle: {
      color: activeVersionIdx === idx ? 'white' : 'var(--color-gray-500)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: activeVersionIdx === idx ? 700 : 400,
      cursor: 'pointer',
    },
    _idx: idx,
  }));

  return (
    <>
      <style>{`
        @keyframes idSlideIn { from { transform: translateX(-32px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes idFadeIn  { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(13,27,38,0.35)', backdropFilter: 'blur(3px)' }} />

      {/* Drawer — LEFT side */}
      <div style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 560,
        background: 'var(--color-white)',
        zIndex: 101, display: 'flex', flexDirection: 'column',
        boxShadow: '16px 0 64px rgba(13,27,38,0.18)',
        animation: 'idSlideIn 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {pendingSave && (
          <ConfirmDialog
            show={!!pendingSave}
            nextVersionNumber={nextVersionNum}
            onConfirm={handleConfirmSave}
            onCancel={() => setPendingSave(null)}
          />
        )}

        {confirmDelete && (
          <>
            <div onClick={() => setConfirmDelete(false)} style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(13,27,38,0.4)', backdropFilter: 'blur(2px)' }} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 360, background: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)', padding: '28px 28px 22px',
              boxShadow: 'var(--shadow-xl)', zIndex: 11,
            }}>
              <div style={{ marginBottom: 6, fontSize: 15, fontWeight: 700, color: 'var(--color-navy)' }}>
                Apagar "{nome}"?
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-gray-600)', lineHeight: 1.55, marginBottom: 20 }}>
                Essa ação é permanente e não pode ser desfeita. Todo o histórico de versões será removido.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost">Cancelar</button>
                <button
                  onClick={onDelete}
                  style={{ background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', padding: '8px 18px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)' }}
                >
                  Apagar
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Header ── */}
        <div style={{
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-gray-200)',
          flexShrink: 0,
        }}>
          {/* Version tags row is passed as tags to DrawerHeader */}
          {/* We render DrawerHeader then handle version tag clicks via a wrapper */}
          <DrawerHeader
            circle={null}
            title={nome}
            subtitle={startMes && endMes ? `${fmtMesShort(startMes)} a ${fmtMesShort(endMes)}` : null}
            titleStyle={{
              fontSize: 15, fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-navy)',
            }}
            subtitleStyle={{
              fontSize: 12,
              color: 'var(--color-navy)',
              opacity: 0.55,
            }}
            statusDiv={vizMode === 'fisico' ? headerFisicoStatusDiv : headerFinanceiroStatusDiv}
            padding="14px 20px"
            gap={10}
            tags={[]}
          />

          {/* Version tags row (separate — needs click handlers per tag) */}
          {item.versions.length > 0 && (
            <div style={{ display: 'flex', gap: 4, padding: '0 20px 12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {item.versions.map((v, idx) => (
                <button
                  key={v.number}
                  onClick={() => switchVersion(idx)}
                  style={{
                    padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                    background: activeVersionIdx === idx ? 'var(--color-navy)' : 'transparent',
                    color: activeVersionIdx === idx ? 'white' : 'var(--color-gray-500)',
                    border: activeVersionIdx === idx ? '1px solid var(--color-navy)' : '1px solid var(--color-gray-200)',
                    fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                    fontWeight: activeVersionIdx === idx ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (activeVersionIdx !== idx) e.currentTarget.style.background = 'var(--color-gray-100)'; }}
                  onMouseLeave={e => { if (activeVersionIdx !== idx) e.currentTarget.style.background = 'transparent'; }}
                >
                  v{v.number}{v.date ? ` · ${fmtDatePT(v.date)}` : ''}
                </button>
              ))}
              {!isLatest && (
                <span style={{ fontSize: 10, color: 'var(--color-gray-400)', fontStyle: 'italic', display: 'flex', alignItems: 'center', marginLeft: 4 }}>
                  somente leitura
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 16px' }}>
          {(() => {
            let cumPct = 0;
            return displayedEtapas.map((etapa, idx) => {
              const startPct = cumPct;
              cumPct += Number(etapa.percentual) || 0;
              return (
                <MonthCard
                  key={etapa.id || idx}
                  etapa={etapa}
                  index={idx}
                  onChange={(field, value) => handleEtapaChange(idx, field, value)}
                  isReadOnly={!isLatest}
                  vizMode={vizMode}
                  startPct={startPct}
                />
              );
            });
          })()}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--color-gray-200)',
          background: 'var(--color-white)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          {/* Left: Deletar + Editar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                background: 'transparent', border: '1px solid rgba(192,57,43,0.3)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', padding: '8px 16px',
                fontSize: 13, fontWeight: 600, color: 'var(--color-error)',
                fontFamily: 'var(--font-display)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.07)'; e.currentTarget.style.borderColor = 'var(--color-error)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)'; }}
            >
              Deletar
            </button>

            {isLatest && (
              <button
                onClick={() => setShowEdit(true)}
                style={{
                  background: 'transparent', border: '1px solid var(--color-gray-200)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  color: 'var(--color-navy-70)', fontFamily: 'var(--font-display)',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-navy)'; e.currentTarget.style.color = 'var(--color-navy)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.color = 'var(--color-navy-70)'; }}
              >
                <IconEditSm /> Editar
              </button>
            )}
          </div>

          {/* Right: Cancelar + Salvar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', padding: '8px 16px',
                fontSize: 13, fontWeight: 600, color: 'var(--color-navy-70)',
                fontFamily: 'var(--font-display)',
              }}
            >
              Cancelar
            </button>
            {isLatest && (
              <button
                onClick={handleFooterSave}
                style={{
                  background: 'var(--color-navy)', color: 'white', border: 'none',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  padding: '8px 22px', fontSize: 13, fontWeight: 700,
                  fontFamily: 'var(--font-display)', boxShadow: 'var(--shadow-sm)',
                }}
              >
                Salvar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit mode — NovoItemDrawer layered on top */}
      {showEdit && (
        <NovoItemDrawer
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          onSave={handleEditSave}
          initialData={editInitialData}
        />
      )}
    </>
  );
};

Object.assign(window, { ItemModal: ItemDrawer });
