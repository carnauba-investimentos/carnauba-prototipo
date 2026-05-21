// month-card.jsx — MonthCard component (FINANCEIRO + FISICO modes)
const { useState: useStateMC } = React;

// ── Icons (local copies — also available from item-modal but loaded after) ─────
const _MC_IconCheck = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const _MC_IconPencil = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M7.5 1.5l2 2L3 10H1V8L7.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;

// ── fmtBRLMC (local, since item-modal helpers aren't available yet) ─────────────
const fmtBRLMC = (v) =>
  'R$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(v) || 0);

const fmtBRLMCShort = (v) => {
  const n = Number(v) || 0;
  if (n >= 1000) return 'R$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(n / 1000)) + 'k';
  return fmtBRLMC(v);
};

const MONTHS_FULL_MC = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmtMesMC = (mesISO) => {
  if (!mesISO) return '—';
  const [y, m] = mesISO.split('-');
  return `${MONTHS_FULL_MC[parseInt(m, 10) - 1]} / ${y}`;
};

// ── NumInputMC (local copy, item-modal loads later) ───────────────────────────
const formatPTBRMC = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
};

const NumInputMC = ({ value, onChange, placeholder, disabled, style: extraStyle, className }) => {
  const [focused, setFocused] = useStateMC(false);
  const [raw, setRaw] = useStateMC('');
  return (
    <input
      type="text" inputMode="numeric"
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      style={extraStyle || {}}
      value={focused ? raw : formatPTBRMC(value)}
      onFocus={() => { setRaw(value === '' || value == null ? '' : String(value)); setFocused(true); }}
      onChange={(e) => { const s = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, ''); setRaw(s); onChange(s === '' ? '' : Number(s)); }}
      onBlur={() => setFocused(false)}
    />
  );
};

// ── SolicitadoTooltip ─────────────────────────────────────────────────────────
const SolicitadoTooltip = ({ mat, mo, anchorRef }) => {
  const [pos, setPos] = useStateMC(null);
  React.useEffect(() => {
    if (anchorRef && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.top - 8, left: r.left + r.width / 2 });
    }
  }, []);
  if (!pos) return null;
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left,
      transform: 'translate(-50%, -100%)',
      background: '#1B3C5F', color: 'white', borderRadius: 6,
      padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)', zIndex: 9999,
      pointerEvents: 'none',
    }}>
      <div>Material: {fmtBRLMC(mat)}</div>
      <div>Mão de obra: {fmtBRLMC(mo)}</div>
    </div>,
    document.body
  );
};

const useSolicitadoTip = () => {
  const [show, setShow] = useStateMC(false);
  const timerRef = React.useRef(null);
  const enter = () => {
    timerRef.current = setTimeout(() => setShow(true), 500);
  };
  const leave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };
  React.useEffect(() => () => clearTimeout(timerRef.current), []);
  return { show, enter, leave };
};

// ── MonthCard ─────────────────────────────────────────────────────────────────
//
// Props:
//   etapa        — etapa object (includes percentualRealizado for FISICO mode)
//   index        — position in list (used for circle number)
//   onChange     — (field, value) callback
//   isReadOnly   — boolean
//   vizMode      — 'financeiro' | 'fisico' (default 'financeiro')
const MonthCard = ({ etapa, index, onChange, isReadOnly, vizMode = 'financeiro', startPct = 0 }) => {
  const [showRecebidoModal, setShowRecebidoModal] = useStateMC(false);
  const [draftMat, setDraftMat] = useStateMC(0);
  const [draftMO, setDraftMO]   = useStateMC(0);
  const tip = useSolicitadoTip();
  const solicitadoRef = React.useRef(null);

  const solicitado = (Number(etapa.orcamentoMaterial) || 0) + (Number(etapa.orcamentoMaoDeObra) || 0);
  const recebido   = (Number(etapa.recebidoMaterial) || 0) + (Number(etapa.recebidoMaoDeObra) || 0)
                   || (Number(etapa.valorRecebido) || 0);
  const gasto      = (Number(etapa.gastoMaterial) || 0) + (Number(etapa.gastoMaoDeObra) || 0);
  const gastoOverrun = gasto > recebido;

  const today = new Date();
  const isCurrentMonth = (() => {
    if (!etapa.mes) return false;
    const [y, m] = etapa.mes.split('-').map(Number);
    return today.getFullYear() === y && today.getMonth() + 1 === m;
  })();
  const isOverdue = (() => {
    if (!etapa.mes) return false;
    const [y, m] = etapa.mes.split('-').map(Number);
    const end = new Date(y, m, 0);
    return end < today;
  })();
  const isFuture = (() => {
    if (!etapa.mes) return false;
    const [y, m] = etapa.mes.split('-').map(Number);
    return new Date(y, m - 1, 1) > today;
  })();

  const percReal      = Number(etapa.percentualRealizado) || 0;
  const fisicoComplete = vizMode === 'fisico' && percReal >= 100;
  // In FISICO mode, only percentualRealizado >= 100 = done; feito is ignored
  const isDone        = vizMode === 'fisico' ? fisicoComplete : etapa.feito;

  // Warning: FISICO only, past month, not 100% realized
  const showWarning = vizMode === 'fisico' && isOverdue && !isDone;

  // FINANCEIRO disabled: recebido = 0 → muted grayscale header, inputs still work
  const financeiroDisabled = vizMode === 'financeiro' && recebido === 0;

  // Circle appearance
  const circleFill = isDone
    ? (vizMode === 'fisico' ? VM_FISICO.complete : 'var(--color-success)')
    : showWarning ? 'var(--color-warning)' : VM_FISICO.complete;
  const circleOpacity = (!isDone && !isCurrentMonth && !isOverdue) ? 0.55 : 1;

  // Card border
  const cardBorderColor = financeiroDisabled
    ? VM_NEUTRAL.bg3
    : fisicoComplete
    ? 'rgba(50,137,192,0.5)'
    : showWarning
    ? 'rgba(192,138,42,0.5)'
    : vizMode !== 'fisico' && etapa.feito
    ? 'rgba(58,143,106,0.4)'
    : 'rgba(66,140,185,0.3)';

  // Title color
  const titleColor = showWarning ? 'var(--color-warning)' : 'var(--color-navy)';

  const tagSource = vizMode === 'fisico'
    ? (etapa.fisico_items || [])
    : (etapa.financeiro_items || []);

  const descTags = tagSource.map(label => ({
    label,
    fill: VM_NEUTRAL.bg2,
    strokeColor: VM_NEUTRAL.bg3,
  }));

  const openRecebidoModal = () => {
    setDraftMat(Number(etapa.recebidoMaterial) || Number(etapa.orcamentoMaterial) || 0);
    setDraftMO(Number(etapa.recebidoMaoDeObra) || Number(etapa.orcamentoMaoDeObra) || 0);
    setShowRecebidoModal(true);
  };

  // ── FINANCEIRO StatusDiv: 3 ValueTag badges ────────────────────────────────
  const financeiroStatusDiv = financeiroDisabled ? (
    <div style={{ display: 'flex', gap: 6 }}>
      <ValueTag label="GASTO"      value={fmtBRLMCShort(gasto)}      bg="#8A98AC" color="white" />
      <div onClick={openRecebidoModal} style={{ cursor: 'pointer' }} title="Editar valores recebidos">
        <ValueTag label="RECEBIDO" value={fmtBRLMCShort(recebido)} bg="#8A98AC" color="white" />
      </div>
      <div ref={solicitadoRef} style={{ position: 'relative' }} onMouseEnter={tip.enter} onMouseLeave={tip.leave}>
        <ValueTag label="SOLICITADO" value={fmtBRLMCShort(solicitado)} bg={VM_NEUTRAL.bg3} color={VM_NEUTRAL.text2} />
        {tip.show && <SolicitadoTooltip mat={etapa.orcamentoMaterial} mo={etapa.orcamentoMaoDeObra} anchorRef={solicitadoRef} />}
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', gap: 6 }}>
      <ValueTag
        label="GASTO"
        value={fmtBRLMCShort(gasto)}
        bg={gastoOverrun ? VM_WARNING.active : VM_FINANCEIRO.complete}
        color={gastoOverrun ? VM_WARNING.text1 : 'white'}
      />
      <div onClick={openRecebidoModal} style={{ cursor: 'pointer' }} title="Editar valores recebidos">
        <ValueTag
          label="RECEBIDO"
          value={fmtBRLMCShort(recebido)}
          bg={VM_FINANCEIRO.active}
          color={VM_FINANCEIRO.text1}
        />
      </div>
      <div ref={solicitadoRef} style={{ position: 'relative' }} onMouseEnter={tip.enter} onMouseLeave={tip.leave}>
        <ValueTag
          label="SOLICITADO"
          value={fmtBRLMCShort(solicitado)}
          bg={VM_NEUTRAL.bg3}
          color={VM_NEUTRAL.text2}
        />
        {tip.show && <SolicitadoTooltip mat={etapa.orcamentoMaterial} mo={etapa.orcamentoMaoDeObra} anchorRef={solicitadoRef} />}
      </div>
    </div>
  );

  // ── FISICO StatusDiv: compact 3-segment progress bar ──────────────────────
  const perc    = Number(etapa.percentual) || 0;
  const seg2Pct = perc;
  const seg3Pct = perc * percReal / 100;

  // Segment colors: active/complete months → VM_FISICO; incomplete past → warning; future → neutral
  let seg2Bg, seg2LabelColor, seg3Bg, seg3LabelColor;
  if (fisicoComplete || isCurrentMonth) {
    seg2Bg = VM_FISICO.active;    seg2LabelColor = VM_FISICO.text2;
    seg3Bg = VM_FISICO.complete;  seg3LabelColor = VM_FISICO.text1;
  } else if (showWarning) {
    // past month, not 100% realized
    seg2Bg = VM_WARNING.active;   seg2LabelColor = VM_WARNING.text1;
    seg3Bg = VM_WARNING.complete; seg3LabelColor = VM_WARNING.text1;
  } else {
    // future months: neutral planned, blue realized
    seg2Bg = VM_NEUTRAL.text1;   seg2LabelColor = VM_NEUTRAL.text2;
    seg3Bg = VM_FISICO.complete; seg3LabelColor = VM_FISICO.text1;
  }

  const fisicoSegments = [
    { pct: 100,     left: 0,        bg: VM_NEUTRAL.bg3, label: null,                                           labelColor: VM_NEUTRAL.text1 },
    { pct: seg2Pct, left: startPct, bg: seg2Bg,         label: seg2Pct > 0 ? `${Math.round(seg2Pct)}%` : null, labelColor: seg2LabelColor },
    { pct: seg3Pct, left: startPct, bg: seg3Bg,         label: seg3Pct > 0 ? `${Math.round(seg3Pct)}%` : null, labelColor: seg3LabelColor },
  ];

  const fisicoStatusDiv = (
    <div style={{ minWidth: 180 }}>
      <SegBar
        segments={fisicoSegments}
        height={24}
        borderRadius={6}
        label="PROGRESSO NO MÊS E RELAÇÃO COM EXECUÇÃO TOTAL DO ITEM"
      />
    </div>
  );

  const recebidoModal = showRecebidoModal ? (
    <>
      <div
        onClick={() => setShowRecebidoModal(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(13,27,38,0.4)', backdropFilter: 'blur(2px)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 201, width: 360, background: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)', padding: '24px 24px 20px',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-navy)', marginBottom: 4 }}>
          Valores recebidos
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-navy-50)', marginBottom: 18 }}>
          {fmtMesMC(etapa.mes)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            ['Material',    draftMat, setDraftMat],
            ['Mão de Obra', draftMO,  setDraftMO],
          ].map(([label, val, setVal]) => (
            <div key={label}>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--color-navy-50)', fontFamily: 'var(--font-display)', marginBottom: 6, textAlign: 'center',
              }}>
                {label}
              </div>
              <div style={{
                border: `1.5px solid ${VM_FINANCEIRO.active}`, borderRadius: 'var(--radius-md)',
                padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}>
                <span style={{ fontSize: 12, color: VM_FINANCEIRO.complete, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>R$</span>
                <NumInputMC
                  value={val}
                  onChange={setVal}
                  placeholder="0"
                  style={{
                    border: 'none', outline: 'none', width: '100%', fontSize: 16,
                    fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: VM_FINANCEIRO.complete, background: 'transparent', padding: 0, textAlign: 'center',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{
          fontSize: 10, color: 'var(--color-navy-50)', lineHeight: 1.5,
          background: 'var(--color-gray-50)', borderRadius: 'var(--radius-sm)',
          padding: '8px 10px', marginBottom: 18, fontStyle: 'italic',
        }}>
          Solução temporária para testes — será substituído quando existir usuários diferentes para a construtora, investidores e Carnaúba.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setShowRecebidoModal(false)} className="btn btn-secondary">Cancelar</button>
          <button onClick={() => {
            onChange('recebidoMaterial',  draftMat);
            onChange('recebidoMaoDeObra', draftMO);
            setShowRecebidoModal(false);
          }} className="btn btn-primary">Enviar</button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      border: `1.5px solid ${cardBorderColor}`,
      background: financeiroDisabled ? VM_NEUTRAL.bg1 : '#EEF3F8',
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* ── Header (via DrawerHeader) ── */}
      <div style={financeiroDisabled ? { filter: 'grayscale(1)', opacity: 0.8 } : {}}>
      <DrawerHeader
        circle={{
          content: isDone ? <_MC_IconCheck /> : index + 1,
          fill: circleFill,
          opacity: circleOpacity,
          size: 32,
        }}
        title={fmtMesMC(etapa.mes)}
        titleStyle={{
          fontSize: 16, fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: titleColor,
          display: 'flex', alignItems: 'baseline', gap: 8,
        }}
        statusDiv={vizMode === 'fisico' ? fisicoStatusDiv : financeiroStatusDiv}
        tags={descTags}
        rowDivider={descTags.length > 0}
        padding="14px 18px"
        gap={12}
      />
      </div>

      {/* ── Body: mode-specific inputs (edit only) ── */}
      {!isReadOnly && (
        <div style={{
          borderTop: `1px solid ${financeiroDisabled ? VM_NEUTRAL.bg3 : 'rgba(66,140,185,0.2)'}`,
          padding: '14px 18px 16px',
          background: 'var(--color-white)',
        }}>

          {vizMode === 'financeiro' ? (
            /* FINANCEIRO body: question + 2 outlined input boxes */
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Question */}
              <div style={{
                fontSize: 13, color: 'var(--color-navy-70)', lineHeight: 1.5,
                flexBasis: '46%', flexShrink: 0,
              }}>
                Do valor recebido nesse mês, <br/> <span style={{ fontWeight: 700 }}>quanto já foi gasto?</span>
              </div>

              {/* Answer: 2 outlined input boxes */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['gastoMaterial',  'recebidoMaterial',  'Material'],
                  ['gastoMaoDeObra', 'recebidoMaoDeObra', 'Mão de Obra'],
                ].map(([field, recField, label]) => {
                  const fieldOverrun = Number(etapa[field]) > Number(etapa[recField]);
                  const fieldColor   = fieldOverrun ? 'var(--color-warning)' : VM_FINANCEIRO.complete;
                  const borderColor  = fieldOverrun ? 'rgba(192,138,42,0.5)' : VM_FINANCEIRO.active;
                  return (
                    <div key={field}>
                      {/* Title */}
                      <div style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.08em', color: 'var(--color-navy-50)',
                        fontFamily: 'var(--font-display)', marginBottom: 6, textAlign: 'center',
                      }}>
                        {label}
                      </div>
                      {/* Input box */}
                      <div style={{
                        border: `1.5px solid ${borderColor}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                      }}>
                        <span style={{ fontSize: 12, color: fieldColor, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>R$</span>
                        <NumInputMC
                          value={etapa[field]}
                          onChange={v => onChange(field, v)}
                          placeholder="0"
                          style={{
                            border: 'none', outline: 'none', width: '100%',
                            fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 700,
                            color: fieldColor, background: 'transparent', padding: 0,
                            textAlign: 'center',
                          }}
                        />
                      </div>
                      {/* Subtitle */}
                      <div style={{
                        fontSize: 9, color: 'var(--color-navy-50)',
                        fontFamily: 'var(--font-mono)', marginTop: 5, textAlign: 'center',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {fmtBRLMC(etapa[recField])} recebidos
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* FISICO body: percentualRealizado input */
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--color-navy-70)', lineHeight: 1.5 }}>
                Qual percentual das atividades do mês já foi realizado?
              </div>
              <div style={{
                flex: 1,
                border: `1.5px solid ${VM_FISICO.active}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px 12px',
              }}>
                <NumInputMC
                  value={etapa.percentualRealizado != null ? etapa.percentualRealizado : ''}
                  onChange={v => onChange('percentualRealizado', v === '' ? 0 : Math.min(100, Number(v)))}
                  placeholder="0"
                  style={{
                    border: 'none', outline: 'none', width: '100%',
                    fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: VM_FISICO.complete, background: 'transparent',
                    padding: 0, textAlign: 'center',
                  }}
                />
                <span style={{
                  fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: VM_FISICO.complete, marginLeft: 2,
                }}>%</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Overdue indicator for read-only months (FISICO only) ── */}
      {showWarning && isReadOnly && (
        <div style={{
          padding: '6px 18px 10px',
          fontSize: 11, fontWeight: 600,
          color: 'var(--color-warning)',
          fontFamily: 'var(--font-display)',
        }}>
          Etapa atrasada.
        </div>
      )}

      {recebidoModal}
    </div>
  );
};

// BudgetBar is kept for backward compatibility (used in item-modal.jsx currently)
const BudgetBar = ({ label, value, total, fillColor, trackColor = 'rgba(0,0,0,0.08)', editable = false, onEdit }) => {
  const pct        = total > 0 ? Math.round((Number(value) || 0) / total * 100) : 0;
  const barPct     = Math.min(100, pct);
  const valueColor = fillColor === 'var(--color-gray-400)' ? 'var(--color-navy-70)' : fillColor;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: valueColor, minWidth: 92, flexShrink: 0 }}>
        {fmtBRLMC(value)}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: valueColor, fontFamily: 'var(--font-display)', opacity: 0.85 }}>
          {label}
        </div>
        <div style={{ height: 9, background: trackColor, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${barPct}%`, background: fillColor, borderRadius: 99, transition: 'width 0.4s ease-out' }} />
        </div>
      </div>
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: valueColor, minWidth: 38, textAlign: 'right', flexShrink: 0 }}>
        {pct} %
      </div>
      {editable ? (
        <button onClick={onEdit} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-navy-50)', padding: '2px 3px', display: 'flex', borderRadius: 'var(--radius-sm)', transition: 'color 0.12s', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-blue)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-navy-50)'}
        ><_MC_IconPencil /></button>
      ) : (
        <div style={{ width: 17, flexShrink: 0 }} />
      )}
    </div>
  );
};

Object.assign(window, { BudgetBar, MonthCard });
