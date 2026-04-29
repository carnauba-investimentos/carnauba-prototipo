// item-modal.jsx — Carnaúba DS applied + Eduardo's feedback
const { useState, useEffect } = React;

// ── Helpers ──────────────────────────────────────────────────────
const fmtCurrency = (v) =>
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(v) || 0);

const fmtDatePT = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${String(y).slice(-2)}`;
};

const diffDays = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000));
};

const addDaysISO = (iso, n) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const cascadeEtapas = (etapas, changedIdx) => {
  const arr = etapas.map((e) => ({ ...e }));
  for (let i = changedIdx + 1; i < arr.length; i++) {
    const prev = arr[i - 1];
    if (!prev.dataFim) continue;
    const duration = diffDays(arr[i].dataInicio, arr[i].dataFim);
    const newStart = addDaysISO(prev.dataFim, 1);
    arr[i] = { ...arr[i], dataInicio: newStart, dataFim: addDaysISO(newStart, duration) };
  }
  return arr;
};

const newEtapaObj = () => ({
  id: `e${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
  titulo: '',
  definicao: '',
  orcamento: '',
  dataInicio: '',
  dataFim: '',
  feito: false,
  investimentoRealizado: ''
});

// ── NumInput — shows PT-BR dot-thousand format ─────────────────────
const formatPTBR = (v) => {
  if (v === '' || v === null || v === undefined) return '';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
};

const NumInput = ({ value, onChange, placeholder, disabled, className, extraStyle }) => {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');

  // When gaining focus, switch to raw numeric string for easy editing
  const handleFocus = () => {
    setRaw(value === '' || value === null || value === undefined ? '' : String(value));
    setFocused(true);
  };

  const handleChange = (e) => {
    const str = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    setRaw(str);
    onChange(str === '' ? '' : Number(str));
  };

  const handleBlur = () => {
    setFocused(false);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      style={extraStyle || {}}
      value={focused ? raw : formatPTBR(value)}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur} />);


};

const IconWarn = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
    <path d="M5.5 1L10.5 10H0.5L5.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M5.5 4.5v2.5M5.5 8.5v.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

// ── Icons ─────────────────────────────────────────────────────────
const IconClose = () =>
<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>;

const IconPlus = () =>
<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>;

const IconTrash = () =>
<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M1.5 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M11 3.5l-.7 7.5a1 1 0 01-1 .9H3.7a1 1 0 01-1-.9L2 3.5"
  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;

const IconCheck = () =>
<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M1.5 5.5l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;


// ── ProgressoBar (inline, no card wrapper) ────────────────────────
const ProgressoBar = ({ etapas }) => {
  const total = etapas.length;
  const done = etapas.filter((e) => e.feito).length;
  const pct = total === 0 ? 0 : Math.round(done / total * 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        flex: 1, height: 6,
        background: 'var(--color-sage-20)', /* undone = sage-200 */
        borderRadius: 99, overflow: 'hidden'
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: pct === 100 ? 'var(--color-success)' : 'var(--color-sage)', /* done = sage-500 */
          borderRadius: 99,
          transition: 'width 0.35s var(--ease-out)'
        }} />
      </div>
      <span className="mono" style={{
        fontSize: 12, fontWeight: 700,
        color: pct === 100 ? 'var(--color-success)' : 'var(--color-sage)',
        minWidth: 34, textAlign: 'right'
      }}>
        {pct}%
      </span>
      <span style={{ fontSize: 11, color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
        {done}/{total} etapa{total !== 1 ? 's' : ''}
      </span>
    </div>);

};

// ── EtapaCard ─────────────────────────────────────────────────────
const EtapaCard = ({ etapa, index, onChange, onDelete, readOnly, prevDataFim }) => {
  const [collapsed, setCollapsed] = useState(false);
  const duration = diffDays(etapa.dataInicio, etapa.dataFim);
  const minDataInicio = prevDataFim ? addDaysISO(prevDataFim, 1) : undefined;

  return (
    <div style={{
      background: 'var(--color-white)',
      border: `1px solid ${etapa.feito ? 'rgba(58,143,106,0.35)' : 'var(--color-gray-200)'}`,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'border-color 0.2s'
    }}>
      {/* Header row */}
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', cursor: 'pointer',
          background: etapa.feito ? 'rgba(58,143,106,0.04)' : 'transparent',
          userSelect: 'none'
        }}>
        
        {/* Step number / check */}
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: etapa.feito ? 'rgba(58,143,106,0.12)' : 'rgba(115,169,199,0.15)',
          color: etapa.feito ? 'var(--color-success)' : 'var(--color-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700
        }}>
          {etapa.feito ? <IconCheck /> : index + 1}
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: etapa.feito ? 'var(--color-gray-600)' : 'var(--color-navy)',
            textDecoration: etapa.feito ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {etapa.titulo || `Etapa ${index + 1}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-gray-400)', display: 'flex', gap: 8, marginTop: 1 }}>
            {etapa.dataInicio && etapa.dataFim &&
            <span className="mono">{fmtDatePT(etapa.dataInicio)} → {fmtDatePT(etapa.dataFim)} · {duration}d</span>
            }
            {etapa.orcamento !== '' && etapa.orcamento !== 0 &&
            <span className="mono" style={{ color: "rgb(78, 110, 138)" }}>{fmtCurrency(etapa.orcamento)}</span>
            }
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: readOnly ? 'default' : 'pointer' }}
          onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={etapa.feito}
            onChange={(e) => !readOnly && onChange('feito', e.target.checked)}
            disabled={readOnly} />
            <span style={{ fontSize: 11, fontWeight: 600, color: etapa.feito ? 'var(--color-success)' : 'rgb(78, 110, 138)' }}>
              Feito
            </span>
          </label>
          {!readOnly &&
          <button
            onClick={(e) => {e.stopPropagation();onDelete();}}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-gray-400)',
              cursor: 'pointer', padding: 4, borderRadius: 4,
              display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-gray-400)'}
            title="Remover etapa">
            
              <IconTrash />
            </button>
          }
          <span style={{
            color: 'var(--color-gray-400)', fontSize: 10,
            display: 'inline-block',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s'
          }}>▾</span>
        </div>
      </div>

      {/* Body */}
      {!collapsed &&
      <div style={{
        padding: '12px 14px 14px',
        borderTop: '1px solid var(--color-gray-200)',
        display: 'flex', flexDirection: 'column', gap: 10
      }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field-group">
              <label>Título</label>
              <input type="text" placeholder="Nome da etapa" value={etapa.titulo}
            onChange={(e) => onChange('titulo', e.target.value)} disabled={readOnly} />
            </div>
            <div className="field-group">
              <label>Orçamento (R$)</label>
              <NumInput placeholder="0" className="mono"
            value={etapa.orcamento}
            onChange={(v) => onChange('orcamento', v)}
            disabled={readOnly} />
            </div>
          </div>

          <div className="field-group">
            <label>Definição</label>
            <textarea placeholder="Descreva o escopo desta etapa…"
          value={etapa.definicao}
          onChange={(e) => onChange('definicao', e.target.value)}
          disabled={readOnly} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="field-group">
              <label>Data de Início</label>
              <input type="date" className="mono"
            value={etapa.dataInicio || ''}
            min={minDataInicio}
            onChange={(e) => onChange('dataInicio', e.target.value)}
            disabled={readOnly} />
            </div>
            <div className="field-group">
              <label>Data de Término</label>
              <input type="date" className="mono"
            value={etapa.dataFim || ''}
            min={etapa.dataInicio || minDataInicio}
            onChange={(e) => onChange('dataFim', e.target.value)}
            disabled={readOnly} />
            </div>
            <div className="field-group">
              {(() => {
                const isOver = Number(etapa.investimentoRealizado) > Number(etapa.orcamento)
                             && etapa.orcamento !== '' && etapa.investimentoRealizado !== '';
                return (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: isOver ? 'var(--color-warning)' : undefined }}>
                      {isOver && <span style={{ color: 'var(--color-warning)' }}><IconWarn /></span>}
                      Realizado (R$)
                    </label>
                    <NumInput placeholder="0" className="mono"
                      value={etapa.investimentoRealizado}
                      onChange={v => onChange('investimentoRealizado', v)}
                      disabled={readOnly}
                      extraStyle={isOver ? { borderColor: 'var(--color-warning)', color: 'var(--color-warning)' } : {}}
                    />
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      }
    </div>);

};

// ── ConfirmDialog ─────────────────────────────────────────────────
const ConfirmDialog = ({ show, nextVersionNumber, onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <>
      <div onClick={onCancel} style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: 'rgba(13,27,38,0.4)', backdropFilter: 'blur(2px)',
        animation: 'fadeInBg 0.15s ease'
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 380, background: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)', padding: '28px 28px 22px',
        boxShadow: 'var(--shadow-xl)', zIndex: 11,
        animation: 'popIn 0.2s var(--ease-out)'
      }}>
        <div style={{ marginBottom: 6, fontSize: 15, fontWeight: 700, color: 'var(--color-navy)' }}>
          Salvar como versão {nextVersionNumber}?
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-gray-600)', lineHeight: 1.55, marginBottom: 20 }}>
          As alterações em datas ou orçamento serão registradas como uma nova versão
          {' '}(v{nextVersionNumber}), preservando o histórico anterior.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn btn-ghost">Cancelar</button>
          <button onClick={onConfirm} className="btn btn-primary">Confirmar v{nextVersionNumber}</button>
        </div>
      </div>
    </>);

};

// ── ItemModal ─────────────────────────────────────────────────────
const ItemModal = ({ item, isOpen, onClose, onSave }) => {
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [editNome, setEditNome] = useState('');
  const [editEtapas, setEditEtapas] = useState([]);
  const [pendingSave, setPendingSave] = useState(null); // { nome, etapas, isNewVersion }

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
        setEditEtapas([]);
      }
      setPendingSave(null);
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
    setEditEtapas((prev) => {
      const updated = prev.map((e, i) => i === idx ? { ...e, [field]: value } : e);
      if (field === 'dataFim' || field === 'dataInicio') return cascadeEtapas(updated, idx);
      return updated;
    });
  };

  const handleDeleteEtapa = (idx) => {
    if (!isEditing) return;
    setEditEtapas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddEtapa = () => {
    if (!isEditing) return;
    setEditEtapas((prev) => [...prev, newEtapaObj()]);
  };

  const checkNeedsNewVersion = () => {
    if (isNewItem) return false; // first save is always v1, no confirmation needed
    const saved = item.versions[item.versions.length - 1].etapas;
    if (editEtapas.length !== saved.length) return true;
    for (let i = 0; i < editEtapas.length; i++) {
      const s = saved[i] || {};
      const e = editEtapas[i];
      if (
      String(e.orcamento) !== String(s.orcamento) ||
      (e.dataInicio || '') !== (s.dataInicio || '') ||
      (e.dataFim || '') !== (s.dataFim || ''))
      return true;
    }
    return false;
  };

  const handleSaveClick = () => {
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

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(13,27,38,0.35)',
        zIndex: 100, backdropFilter: 'blur(3px)',
        animation: 'fadeInBg 0.2s ease'
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 620, background: 'var(--color-gray-100)',
        zIndex: 101, display: 'flex', flexDirection: 'column',
        boxShadow: '-16px 0 64px rgba(13,27,38,0.18)',
        animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)'
      }}>

        {/* Confirm dialog — absolutely positioned inside drawer */}
        {pendingSave &&
        <ConfirmDialog
          show={!!pendingSave}
          nextVersionNumber={nextVersionNumber}
          onConfirm={handleConfirmSave}
          onCancel={() => setPendingSave(null)} />

        }

        {/* Version tabs bar — only if item has versions */}
        {item &&
        <div style={{
          height: 44, background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 4, flexShrink: 0, overflowX: 'auto'
        }}>
            <span style={{
            fontSize: 10, color: 'var(--color-gray-400)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontFamily: 'var(--font-display)', marginRight: 6, whiteSpace: 'nowrap'
          }}>
              Versões
            </span>
            {item.versions.map((v, idx) =>
          <button key={v.number} onClick={() => switchVersion(idx)} style={{
            padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: 'none',
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
            {!isEditing &&
          <span style={{ fontSize: 11, color: 'var(--color-gray-400)', fontStyle: 'italic', marginRight: 8 }}>
                somente leitura
              </span>
          }
            <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--color-gray-400)', padding: 4, borderRadius: 4,
            display: 'flex', transition: 'color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-navy)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-gray-400)'}>
            
              <IconClose />
            </button>
          </div>
        }

        {/* Drawer header (when new item — no version bar) */}
        {!item &&
        <div style={{
          height: 44, background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', justifyContent: 'space-between', flexShrink: 0
        }}>
            <span style={{ fontSize: 11, color: 'var(--color-gray-400)', fontWeight: 500 }}>
              Novo Item de Cronograma
            </span>
            <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--color-gray-400)', padding: 4, borderRadius: 4, display: 'flex'
          }}>
              <IconClose />
            </button>
          </div>
        }

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
              onBlur={(e) => {e.target.style.borderBottomColor = isEditing ? 'var(--color-gray-200)' : 'transparent';}} />
            
          </div>

          {/* Progress bar — under title, above steps */}
          {displayedEtapas.length > 0 &&
          <div style={{ marginBottom: 24, marginTop: 14 }}>
              <ProgressoBar etapas={displayedEtapas} />
            </div>
          }

          {/* Divider */}
          <div className="divider" style={{ marginBottom: 18 }} />

          {/* Etapas section */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--color-gray-600)',
                fontFamily: 'var(--font-display)'
              }}>
                Etapas · {displayedEtapas.length}
              </span>
            </div>

            {/* Empty state */}
            {displayedEtapas.length === 0 &&
            <div style={{
              border: '2px dashed var(--color-gray-200)', borderRadius: 'var(--radius-md)',
              padding: '28px 20px', textAlign: 'center', color: 'var(--color-gray-400)',
              fontSize: 13, marginBottom: 12
            }}>
                Nenhuma etapa definida
              </div>
            }

            {/* Cards */}
            {displayedEtapas.length > 0 &&
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
                {displayedEtapas.map((etapa, idx) =>
              <EtapaCard
                key={etapa.id}
                etapa={etapa}
                index={idx}
                onChange={(field, value) => handleEtapaChange(idx, field, value)}
                onDelete={() => handleDeleteEtapa(idx)}
                readOnly={!isEditing}
                prevDataFim={idx > 0 ? displayedEtapas[idx - 1].dataFim : null} />

              )}
              </div>
            }

            {/* Add button — always visible below last step when editing */}
            {isEditing &&
            <button onClick={handleAddEtapa} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 2, backgroundColor: "rgb(226, 239, 246)", color: "rgb(45, 78, 112)", borderColor: "rgb(141, 158, 175)" }}>
                <IconPlus /> Adicionar Etapa
              </button>
            }
          </div>
        </div>

        {/* Footer */}
        {isEditing &&
        <div style={{
          padding: '12px 24px', borderTop: '1px solid var(--color-gray-200)',
          background: 'var(--color-white)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          alignItems: 'center', flexShrink: 0
        }}>
            <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button onClick={handleSaveClick} className="btn btn-primary">Salvar</button>
          </div>
        }
      </div>
    </>);

};

Object.assign(window, { ItemModal });