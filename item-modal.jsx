// item-modal.jsx — Carnaúba DS · restructured etapa edit/track modes
const { useState, useEffect, useRef } = React;

// ── Helpers ──────────────────────────────────────────────────────
const fmtBRLModal = (v) =>
  'R$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(v) || 0);

const fmtDatePT = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${String(y).slice(-2)}`;
};

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const fmtMes = (mesISO) => {
  if (!mesISO) return '—';
  const [y, m] = mesISO.split('-');
  return `${MONTHS_FULL_PT[parseInt(m, 10) - 1]} / ${y}`;
};

const newEtapaObj = () => ({
  id: `e${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
  mes: '',
  percentual: '',
  orcamentoMaterial: '',
  orcamentoMaoDeObra: '',
  descricao: '',
  feito: false,
  gastoMaterial: '',
  gastoMaoDeObra: '',
});

// ── NumInput ──────────────────────────────────────────────────────
const formatPTBR = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
};

const NumInput = ({ value, onChange, placeholder, disabled, style: extraStyle }) => {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');
  return (
    <input
      type="text" inputMode="numeric"
      placeholder={placeholder}
      disabled={disabled}
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
        {!disabled && <span style={{ fontSize: 10, color: 'var(--color-gray-400)' }}>▾</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--color-white)', border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          zIndex: 999, padding: '12px', minWidth: 240
        }}>
          {/* Year nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => setViewYear((y) => y - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-navy)', padding: '2px 6px' }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-navy)', fontFamily: 'var(--font-display)' }}>{viewYear}</span>
            <button type="button" onClick={() => setViewYear((y) => y + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-navy)', padding: '2px 6px' }}>›</button>
          </div>
          {/* Month grid */}
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
const IconClose = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
const IconPlus = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
const IconTrash = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M11 3.5l-.7 7.5a1 1 0 01-1 .9H3.7a1 1 0 01-1-.9L2 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IconCheck = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IconGear = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 1v1.2M6.5 10.8V12M1 6.5h1.2M10.8 6.5H12M2.4 2.4l.85.85M9.75 9.75l.85.85M9.75 3.25l-.85.85M3.25 9.75l-.85.85" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IconWarn = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}><path d="M5.5 1L10.5 10H0.5L5.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5.5 4.5v2.5M5.5 8.5v.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;

// ── ProgressoBar ──────────────────────────────────────────────────
const ProgressoBar = ({ etapas }) => {
  const pct = etapas.reduce((sum, e) => sum + (e.feito ? (Number(e.percentual) || 0) : 0), 0);
  const clamped = Math.min(100, pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--color-sage-20)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${clamped}%`, background: clamped >= 100 ? 'var(--color-success)' : 'var(--color-sage)', borderRadius: 99, transition: 'width 0.35s var(--ease-out)' }} />
      </div>
      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: clamped >= 100 ? 'var(--color-success)' : 'var(--color-sage)', minWidth: 34, textAlign: 'right' }}>{clamped}%</span>
    </div>
  );
};

// ── EtapaCard ─────────────────────────────────────────────────────
const EtapaCard = ({ etapa, index, onChange, onDelete, onSave, pctWarning }) => {
  const [mode, setMode] = useState(etapa._editando ? 'edit' : 'track');

  // sync if parent flips _editando (e.g. on first render of a fresh etapa)
  useEffect(() => {
    if (etapa._editando) setMode('edit');
  }, [etapa._editando]);

  const totalOrc = (Number(etapa.orcamentoMaterial) || 0) + (Number(etapa.orcamentoMaoDeObra) || 0);
  const totalGasto = (Number(etapa.gastoMaterial) || 0) + (Number(etapa.gastoMaoDeObra) || 0);
  const gastoOverrun = totalGasto > totalOrc && totalOrc > 0;

  const fieldStyle = (warn) => ({
    ...(warn ? { borderColor: 'var(--color-warning)', color: 'var(--color-warning)' } : {})
  });

  // ── Edit mode ─────────────────────────────────────────────────
  if (mode === 'edit') {
    return (
      <div style={{
        background: 'var(--color-white)',
        border: '1px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--color-gray-200)', background: 'var(--color-gray-100)' }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(115,169,199,0.15)', color: 'var(--color-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700
          }}>{index + 1}</div>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--color-gray-600)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Etapa {index + 1} — edição
          </span>
          <button
            onClick={onDelete}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-gray-400)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-gray-400)'}
            title="Remover etapa"
          ><IconTrash /></button>
        </div>

        {/* Fields */}
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Row: month + percentual */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field-group">
              <label>Mês</label>
              <MonthPicker value={etapa.mes} onChange={(v) => onChange('mes', v)} />
            </div>
            <div className="field-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: pctWarning ? 'var(--color-warning)' : undefined }}>
                {pctWarning && <IconWarn />} % de Execução
              </label>
              <div style={{ position: 'relative' }}>
                <NumInput
                  value={etapa.percentual}
                  onChange={(v) => onChange('percentual', v)}
                  placeholder="0"
                  style={pctWarning ? { borderColor: 'var(--color-warning)', paddingRight: 24 } : { paddingRight: 24 }}
                />
                <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-gray-400)', pointerEvents: 'none' }}>%</span>
              </div>
            </div>
          </div>

          {/* Row: orçamento material + mão de obra */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field-group">
              <label style={{ fontSize: 10 }}>Orçamento · Material (R$)</label>
              <NumInput value={etapa.orcamentoMaterial} onChange={(v) => onChange('orcamentoMaterial', v)} placeholder="0" />
            </div>
            <div className="field-group">
              <label style={{ fontSize: 10 }}>Orçamento · Mão de Obra (R$)</label>
              <NumInput value={etapa.orcamentoMaoDeObra} onChange={(v) => onChange('orcamentoMaoDeObra', v)} placeholder="0" />
            </div>
          </div>

          {/* Descrição */}
          <div className="field-group">
            <label>Descrição</label>
            <textarea
              placeholder="Descreva o escopo desta etapa…"
              value={etapa.descricao}
              onChange={(e) => onChange('descricao', e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
            <button
              onClick={() => { onChange('_editando', false); setMode('track'); }}
              className="btn btn-ghost"
              style={{ fontSize: 12 }}
            >Cancelar</button>
            <button
              onClick={() => { onSave(); setMode('track'); }}
              className="btn btn-primary"
              style={{ fontSize: 12 }}
            >Salvar etapa</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Track mode ────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--color-white)',
      border: `1px solid ${etapa.feito ? 'rgba(58,143,106,0.35)' : 'var(--color-gray-200)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      transition: 'border-color 0.2s'
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: etapa.feito ? 'rgba(58,143,106,0.04)' : 'transparent',
        borderBottom: '1px solid var(--color-gray-200)'
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: etapa.feito ? 'rgba(58,143,106,0.12)' : 'rgba(115,169,199,0.15)',
          color: etapa.feito ? 'var(--color-success)' : 'var(--color-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700
        }}>
          {etapa.feito ? <IconCheck /> : index + 1}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: etapa.feito ? 'var(--color-gray-600)' : 'var(--color-navy)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ textDecoration: etapa.feito ? 'line-through' : 'none' }}>{fmtMes(etapa.mes)}</span>
            {etapa.percentual !== '' && etapa.percentual !== 0 &&
              <span className="mono" style={{ fontSize: 11, color: 'var(--color-gray-400)', fontWeight: 500 }}>{etapa.percentual}%</span>
            }
          </div>
        </div>

        {/* Checkbox feito */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={etapa.feito} onChange={(e) => onChange('feito', e.target.checked)} />
          <span style={{ fontSize: 11, fontWeight: 600, color: etapa.feito ? 'var(--color-success)' : 'rgb(78, 110, 138)' }}>Feito</span>
        </label>

        {/* Gear → edit */}
        <button
          onClick={() => { onChange('_editando', true); setMode('edit'); }}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-gray-400)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', transition: 'color 0.15s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-navy)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-gray-400)'}
          title="Editar etapa"
        ><IconGear /></button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Gastos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field-group">
            <label style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>Gastos Realizados · Material</span>
              {etapa.orcamentoMaterial !== '' && etapa.orcamentoMaterial !== 0 &&
                <span className="mono" style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>{fmtBRLModal(etapa.orcamentoMaterial)}</span>
              }
            </label>
            <NumInput
              value={etapa.gastoMaterial}
              onChange={(v) => onChange('gastoMaterial', v)}
              placeholder="0"
              style={Number(etapa.gastoMaterial) > Number(etapa.orcamentoMaterial) && etapa.orcamentoMaterial ? { borderColor: 'var(--color-warning)', color: 'var(--color-warning)' } : {}}
            />
          </div>
          <div className="field-group">
            <label style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>Gastos Realizados · Mão de Obra</span>
              {etapa.orcamentoMaoDeObra !== '' && etapa.orcamentoMaoDeObra !== 0 &&
                <span className="mono" style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>{fmtBRLModal(etapa.orcamentoMaoDeObra)}</span>
              }
            </label>
            <NumInput
              value={etapa.gastoMaoDeObra}
              onChange={(v) => onChange('gastoMaoDeObra', v)}
              placeholder="0"
              style={Number(etapa.gastoMaoDeObra) > Number(etapa.orcamentoMaoDeObra) && etapa.orcamentoMaoDeObra ? { borderColor: 'var(--color-warning)', color: 'var(--color-warning)' } : {}}
            />
          </div>
        </div>

        {/* Descrição read-only */}
        {etapa.descricao &&
          <div style={{ fontSize: 12, color: 'var(--color-gray-600)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {etapa.descricao}
          </div>
        }
      </div>
    </div>
  );
};

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
        boxShadow: 'var(--shadow-xl)', zIndex: 11
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

// ── ItemModal ─────────────────────────────────────────────────────
const ItemModal = ({ item, isOpen, onClose, onSave }) => {
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [editNome, setEditNome] = useState('');
  const [editEtapas, setEditEtapas] = useState([]);
  const [pendingSave, setPendingSave] = useState(null);
  const [pctError, setPctError] = useState(false);

  const isNewItem = !item;
  const latestIdx = item ? item.versions.length - 1 : -1;
  const isEditing = isNewItem || activeVersionIdx === latestIdx;

  useEffect(() => {
    if (isOpen) {
      if (item) {
        const latest = item.versions[item.versions.length - 1];
        setActiveVersionIdx(item.versions.length - 1);
        setEditNome(latest.nome);
        setEditEtapas(JSON.parse(JSON.stringify(latest.etapas)));
      } else {
        setEditNome('');
        // Start with one empty etapa in edit mode
        setEditEtapas([{ ...newEtapaObj(), _editando: true }]);
      }
      setPendingSave(null);
      setPctError(false);
    }
  }, [isOpen, item]);

  const switchVersion = (idx) => {
    setActiveVersionIdx(idx);
    const v = item.versions[idx];
    setEditNome(v.nome);
    setEditEtapas(JSON.parse(JSON.stringify(v.etapas)));
  };

  const handleEtapaChange = (idx, field, value) => {
    if (!isEditing) return;
    setEditEtapas((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    if (field === 'percentual') setPctError(false);
  };

  const handleDeleteEtapa = (idx) => {
    if (!isEditing) return;
    setEditEtapas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddEtapa = () => {
    if (!isEditing) return;
    setEditEtapas((prev) => [...prev, { ...newEtapaObj(), _editando: true }]);
  };

  const checkNeedsNewVersion = () => {
    if (isNewItem) return false;
    const saved = item.versions[item.versions.length - 1].etapas;
    if (editEtapas.length !== saved.length) return true;
    for (let i = 0; i < editEtapas.length; i++) {
      const s = saved[i] || {};
      const e = editEtapas[i];
      if (
        String(e.percentual) !== String(s.percentual) ||
        (e.mes || '') !== (s.mes || '') ||
        String(e.orcamentoMaterial) !== String(s.orcamentoMaterial) ||
        String(e.orcamentoMaoDeObra) !== String(s.orcamentoMaoDeObra)
      ) return true;
    }
    return false;
  };

  const handleSaveClick = () => {
    // Validate % sum
    const totalPct = editEtapas.reduce((sum, e) => sum + (Number(e.percentual) || 0), 0);
    if (editEtapas.length > 0 && totalPct !== 100) {
      setPctError(true);
      return;
    }
    setPctError(false);

    const needsNewVersion = checkNeedsNewVersion();
    if (needsNewVersion) {
      setPendingSave({ nome: editNome, etapas: editEtapas, isNewVersion: true });
    } else {
      onSave({ nome: editNome, etapas: editEtapas, needsNewVersion: false });
    }
  };

  const handleConfirmSave = () => {
    if (!pendingSave) return;
    onSave({ nome: pendingSave.nome, etapas: pendingSave.etapas, needsNewVersion: true });
    setPendingSave(null);
  };

  if (!isOpen) return null;

  const displayedEtapas = isEditing ? editEtapas : item.versions[activeVersionIdx].etapas;
  const displayedNome = isEditing ? editNome : item.versions[activeVersionIdx].nome;
  const nextVersionNumber = item ? item.versions.length + 1 : 1;

  const totalPct = editEtapas.reduce((sum, e) => sum + (Number(e.percentual) || 0), 0);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,38,0.35)', zIndex: 100, backdropFilter: 'blur(3px)', animation: 'fadeInBg 0.2s ease' }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 620, background: 'var(--color-gray-100)',
        zIndex: 101, display: 'flex', flexDirection: 'column',
        boxShadow: '-16px 0 64px rgba(13,27,38,0.18)',
        animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)'
      }}>

        {pendingSave &&
          <ConfirmDialog
            show={!!pendingSave}
            nextVersionNumber={nextVersionNumber}
            onConfirm={handleConfirmSave}
            onCancel={() => setPendingSave(null)}
          />
        }

        {/* Version tabs / header */}
        <div style={{
          height: 44, background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 4, flexShrink: 0, overflowX: 'auto'
        }}>
          {item ? (
            <>
              <span style={{ fontSize: 10, color: 'var(--color-gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-display)', marginRight: 6, whiteSpace: 'nowrap' }}>Versões</span>
              {item.versions.map((v, idx) =>
                <button key={v.number} onClick={() => switchVersion(idx)} style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                  background: activeVersionIdx === idx ? 'rgba(27,60,95,0.08)' : 'transparent',
                  color: activeVersionIdx === idx ? 'var(--color-navy)' : 'var(--color-gray-600)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
                  fontWeight: activeVersionIdx === idx ? 700 : 400,
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                  border: activeVersionIdx === idx ? '1px solid var(--color-navy-20)' : '1px solid transparent'
                }}>
                  v{v.number} · {v.date ? fmtDatePT(v.date) : '—'}
                </button>
              )}
              <div style={{ flex: 1 }} />
              {!isEditing && <span style={{ fontSize: 11, color: 'var(--color-gray-400)', fontStyle: 'italic', marginRight: 8 }}>somente leitura</span>}
            </>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--color-gray-400)', fontWeight: 500 }}>Novo Item de Cronograma</span>
          )}
          <div style={{ flex: item ? 0 : 1 }} />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: 4, borderRadius: 4, display: 'flex', transition: 'color 0.15s', flexShrink: 0 }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-navy)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-gray-400)'}>
            <IconClose />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* Nome */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-gray-400)', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
              Item de Cronograma
            </div>
            <input
              type="text"
              placeholder="Nome do item (ex.: Fundação, Estrutura de Aço…)"
              value={displayedNome}
              onChange={(e) => isEditing && setEditNome(e.target.value)}
              disabled={!isEditing}
              style={{
                fontSize: 20, fontWeight: 700, padding: '6px 0',
                border: 'none', borderBottom: isEditing ? '2px solid var(--color-gray-200)' : '2px solid transparent',
                borderRadius: 0, background: 'transparent',
                color: 'var(--color-navy)', transition: 'border-color 0.15s',
                fontFamily: 'var(--font-display)'
              }}
              onFocus={(e) => isEditing && (e.target.style.borderBottomColor = 'var(--color-blue)')}
              onBlur={(e) => { e.target.style.borderBottomColor = isEditing ? 'var(--color-gray-200)' : 'transparent'; }}
            />
          </div>

          {/* Progress bar */}
          {displayedEtapas.length > 0 &&
            <div style={{ marginBottom: 24, marginTop: 14 }}>
              <ProgressoBar etapas={displayedEtapas} />
            </div>
          }

          {/* % error banner */}
          {pctError &&
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              background: 'rgba(192,138,42,0.1)', border: '1px solid rgba(192,138,42,0.35)',
              borderRadius: 'var(--radius-sm)', padding: '9px 12px',
              color: 'var(--color-warning)', fontSize: 12, fontWeight: 500
            }}>
              <IconWarn />
              A soma dos % de execução deve ser exatamente 100%. Atual: {totalPct}%.
            </div>
          }

          <div className="divider" style={{ marginBottom: 18 }} />

          {/* Etapas section */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-gray-600)', fontFamily: 'var(--font-display)' }}>
                Etapas · {displayedEtapas.length}
                {isEditing && displayedEtapas.length > 0 &&
                  <span className="mono" style={{ marginLeft: 8, fontWeight: 500, color: totalPct === 100 ? 'var(--color-success)' : pctError ? 'var(--color-warning)' : 'var(--color-gray-400)', textTransform: 'none', letterSpacing: 0 }}>
                    {totalPct}% alocado
                  </span>
                }
              </span>
            </div>

            {displayedEtapas.length > 0 &&
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
                {displayedEtapas.map((etapa, idx) =>
                  <EtapaCard
                    key={etapa.id}
                    etapa={etapa}
                    index={idx}
                    onChange={(field, value) => handleEtapaChange(idx, field, value)}
                    onDelete={() => handleDeleteEtapa(idx)}
                    onSave={() => handleEtapaChange(idx, '_editando', false)}
                    pctWarning={pctError}
                  />
                )}
              </div>
            }

            {isEditing &&
              <button onClick={handleAddEtapa} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 2, backgroundColor: 'rgb(226, 239, 246)', color: 'rgb(45, 78, 112)', borderColor: 'rgb(141, 158, 175)' }}>
                <IconPlus /> Adicionar Etapa
              </button>
            }
          </div>
        </div>

        {/* Footer */}
        {isEditing &&
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-gray-200)', background: 'var(--color-white)', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button onClick={handleSaveClick} className="btn btn-primary">Salvar</button>
          </div>
        }
      </div>
    </>
  );
};

Object.assign(window, { ItemModal });
