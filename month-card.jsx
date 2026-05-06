// month-card.jsx — BudgetBar + MonthCard components

// ── BudgetBar ─────────────────────────────────────────────────────
const BudgetBar = ({ label, value, total, fillColor, trackColor = 'rgba(0,0,0,0.08)', editable = false, onEdit }) => {
  const pct        = total > 0 ? Math.round((Number(value) || 0) / total * 100) : 0;
  const barPct     = Math.min(100, pct);
  const valueColor = fillColor === 'var(--color-gray-400)' ? 'var(--color-navy-70)' : fillColor;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Monetary value */}
      <div style={{
        fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700,
        color: valueColor, minWidth: 92, flexShrink: 0,
      }}>
        {fmtBRLModal(value)}
      </div>

      {/* Label + bar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: valueColor, fontFamily: 'var(--font-display)',
          opacity: 0.85,
        }}>
          {label}
        </div>
        <div style={{ height: 9, background: trackColor, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${barPct}%`, background: fillColor,
            borderRadius: 99, transition: 'width 0.4s ease-out',
          }} />
        </div>
      </div>

      {/* Percentage */}
      <div style={{
        fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600,
        color: valueColor, minWidth: 38, textAlign: 'right', flexShrink: 0,
      }}>
        {pct} %
      </div>

      {/* Pencil icon slot — keeps alignment consistent */}
      {editable ? (
        <button
          onClick={onEdit}
          title="Editar valor recebido"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--color-navy-50)', padding: '2px 3px', display: 'flex',
            borderRadius: 'var(--radius-sm)', transition: 'color 0.12s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-blue)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-navy-50)'}
        >
          <IconPencil />
        </button>
      ) : (
        <div style={{ width: 17, flexShrink: 0 }} />
      )}
    </div>
  );
};

// ── MonthCard ─────────────────────────────────────────────────────
const MonthCard = ({ etapa, index, onChange, isReadOnly }) => {
  const [editingRecebido, setEditingRecebido] = useState(false);
  const [recebidoDraft,   setRecebidoDraft]   = useState('');

  const solicitado   = (Number(etapa.orcamentoMaterial) || 0) + (Number(etapa.orcamentoMaoDeObra) || 0);
  const recebido     = Number(etapa.valorRecebido) || 0;
  const gasto        = (Number(etapa.gastoMaterial) || 0) + (Number(etapa.gastoMaoDeObra) || 0);
  const gastoOverrun = solicitado > 0 && gasto > solicitado;
  const gastoColor   = gastoOverrun ? 'var(--color-warning)' : 'var(--color-success)';

  const today = new Date();
  const isCurrentMonth = (() => {
    if (!etapa.mes) return false;
    const [y, m] = etapa.mes.split('-').map(Number);
    return today.getFullYear() === y && today.getMonth() + 1 === m;
  })();

  const handleRecebidoConfirm = () => {
    onChange('valorRecebido', recebidoDraft === '' ? '' : Number(recebidoDraft));
    setEditingRecebido(false);
  };

  // Circle appearance
  const circleBg     = etapa.feito ? 'var(--color-success)' : 'var(--color-blue)';
  const circleOpacity = (!etapa.feito && !isCurrentMonth) ? 0.55 : 1;

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      border: `1.5px solid ${etapa.feito ? 'rgba(58,143,106,0.4)' : 'rgba(66,140,185,0.3)'}`,
      background: '#EEF3F8',
      overflow: 'hidden',
      marginBottom: 12,
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
        {/* Circle */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: circleBg, opacity: circleOpacity,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'white',
          transition: 'opacity 0.2s, background 0.2s',
        }}>
          {etapa.feito ? <IconCheck /> : index + 1}
        </div>

        {/* Month name */}
        <span style={{
          flex: 1, fontSize: 16, fontWeight: 700,
          color: 'var(--color-navy)', fontFamily: 'var(--font-display)',
        }}>
          {fmtMes(etapa.mes)}
        </span>

        {/* % of total execution */}
        {etapa.percentual !== '' && etapa.percentual !== 0 && (
          <span style={{
            fontSize: 14, fontWeight: 600, flexShrink: 0,
            color: 'var(--color-navy-50)', fontFamily: 'var(--font-mono)',
          }}>
            {etapa.percentual}%
          </span>
        )}

        {/* Checkbox */}
        <label style={{ cursor: isReadOnly ? 'default' : 'pointer', display: 'flex', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={etapa.feito}
            disabled={isReadOnly}
            onChange={e => onChange('feito', e.target.checked)}
            style={{ width: 20, height: 20, cursor: isReadOnly ? 'default' : 'pointer', accentColor: 'var(--color-success)' }}
          />
        </label>
      </div>

      {/* Description */}
      {etapa.descricao && (
        <div style={{ padding: '0 18px 10px', fontSize: 13, color: 'var(--color-navy-50)', fontStyle: 'italic', lineHeight: 1.5 }}>
          {etapa.descricao}
        </div>
      )}

      {/* ── Budget bars ── */}
      <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <BudgetBar
          label="Solicitado" value={solicitado} total={solicitado}
          fillColor="var(--color-gray-400)" trackColor="rgba(0,0,0,0.08)"
        />
        <BudgetBar
          label="Recebido" value={recebido} total={solicitado}
          fillColor="var(--color-blue)" trackColor="rgba(66,140,185,0.15)"
          editable={!isReadOnly && !editingRecebido}
          onEdit={() => { setRecebidoDraft(String(etapa.valorRecebido || '')); setEditingRecebido(true); }}
        />

        {/* Inline recebido editor */}
        {editingRecebido && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 104, animation: 'idFadeIn 0.15s ease-out' }}>
            <span style={{ fontSize: 11, color: 'var(--color-navy-50)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>R$</span>
            <NumInput
              value={recebidoDraft}
              onChange={v => setRecebidoDraft(String(v === '' ? '' : v))}
              placeholder="0"
              style={{
                flex: 1, border: 'none', borderBottom: '2px solid var(--color-blue)',
                outline: 'none', fontSize: 14, fontFamily: 'var(--font-mono)',
                background: 'transparent', padding: '2px 0',
                color: 'var(--color-blue)', fontWeight: 600,
              }}
            />
            <button
              onClick={handleRecebidoConfirm}
              style={{ background: 'var(--color-blue)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
            >✓</button>
            <button
              onClick={() => setEditingRecebido(false)}
              style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--color-navy-50)' }}
            >✗</button>
          </div>
        )}

        <BudgetBar
          label="Gasto" value={gasto} total={solicitado}
          fillColor={gastoColor} trackColor="rgba(0,0,0,0.08)"
        />
      </div>

      {/* ── Gasto inputs ── */}
      {!isReadOnly && (
        <div style={{ borderTop: '1px solid rgba(66,140,185,0.2)', padding: '14px 18px 16px', background: 'var(--color-white)' }}>
          <div style={{ fontSize: 13, color: 'var(--color-navy-70)', marginBottom: 14, lineHeight: 1.5 }}>
            Quanto já foi gasto do valor recebido nesse mês?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['gastoMaterial', 'orcamentoMaterial', 'Material'], ['gastoMaoDeObra', 'orcamentoMaoDeObra', 'Mão de Obra']].map(([field, orcField, label]) => {
              const fieldOverrun = (Number(etapa[orcField]) > 0) && (Number(etapa[field]) > Number(etapa[orcField]));
              const fieldColor   = fieldOverrun ? 'var(--color-warning)' : 'var(--color-success)';
              return (
              <div key={field}>
                <div style={{
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--color-navy-50)',
                  fontFamily: 'var(--font-display)', marginBottom: 6,
                }}>
                  {label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, borderBottom: `1.5px solid ${fieldOverrun ? 'rgba(192,138,42,0.4)' : 'var(--color-gray-200)'}`, paddingBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-navy-50)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>R$</span>
                  <NumInput
                    value={etapa[field]}
                    onChange={v => onChange(field, v)}
                    placeholder="0"
                    style={{
                      flex: 1, border: 'none', outline: 'none',
                      fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: fieldColor, background: 'transparent', padding: 0,
                    }}
                  />
                  {etapa[orcField] !== '' && etapa[orcField] !== 0 && (
                    <span style={{ fontSize: 11, color: 'var(--color-navy-50)', fontFamily: 'var(--font-mono)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      de {fmtBRLModal(etapa[orcField])}
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { BudgetBar, MonthCard });
