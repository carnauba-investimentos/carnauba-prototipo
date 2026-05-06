// novo-item-drawer.jsx — Typeform-style new item creation drawer
const { useState: useStateNI, useEffect: useEffectNI, useRef: useRefNI } = React;

// ── Month helpers ─────────────────────────────────────────────────────
const NI_MONTHS_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const NI_MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const niFmtFull  = (mes) => { if (!mes) return '—'; const [y,m]=mes.split('-'); return `${NI_MONTHS_FULL[+m-1]} / ${y}`; };
const niFmtShort = (mes) => { if (!mes) return '—'; const [y,m]=mes.split('-'); return `${NI_MONTHS_SHORT[+m-1]} ${y}`; };

// ── Generate one etapa per month; merges existing data for preserved months ──
const niGenEtapas = (start, end, existing = []) => {
  if (!start || !end || end < start) return [];
  const byMes = {};
  existing.forEach(e => { byMes[e.mes] = e; });
  const result = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    const mes = `${y}-${String(m).padStart(2,'0')}`;
    result.push(byMes[mes] || {
      id: `e${Date.now()}${Math.random().toString(36).slice(2,5)}`,
      mes, percentual: '', orcamentoMaterial: '', orcamentoMaoDeObra: '',
      descricao: '', feito: false, gastoMaterial: '', gastoMaoDeObra: '',
      valorRecebido: '',
    });
    if (++m > 12) { m = 1; y++; }
  }
  return result;
};

// ── Icons ─────────────────────────────────────────────────────────────
const NiIconArrow = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5h10M9 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const NiIconCheck = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6l3.5 3.5 5.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const NiIconClose = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const NiIconEdit  = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M7.5 1.5l2 2L3 10H1V8L7.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;

// ── Shared underline-input wrapper — handles blur/enter commit ─────────
// onCommit is called when: Enter is pressed OR the wrapper loses focus (blur)
// and the condition check (shouldCommit) passes.
const NiFieldRow = ({ children, onCommit, shouldCommit, style: extraStyle, ...rest }) => (
  <div
    style={{ ...extraStyle }}
    onKeyDown={e => { if (e.key === 'Enter' && shouldCommit()) onCommit(); }}
    onBlur={e => {
      if (!e.currentTarget.contains(e.relatedTarget) && shouldCommit()) onCommit();
    }}
    {...rest}
  >
    {children}
  </div>
);

// ── NiMonthBox ────────────────────────────────────────────────────────
const NiMonthBox = ({ etapa, nome, index, isOpen, isDone, isLocked, onChange, onAdvance, onEdit }) => {
  // Committed = user has explicitly left the field after filling it.
  // Separate from "filled" so questions don't reveal while still typing.
  const [q1Committed, setQ1Committed] = useStateNI(false);
  const [q2Committed, setQ2Committed] = useStateNI(false);
  const [q3Committed, setQ3Committed] = useStateNI(false);

  const q1Done = etapa.orcamentoMaterial !== '' && etapa.orcamentoMaoDeObra !== '';
  const q2Done = etapa.descricao.trim().length > 0;
  const q3Done = etapa.percentual !== '';

  // When this card opens, pre-commit any questions already answered
  useEffectNI(() => {
    if (isOpen) {
      if (q1Done) setQ1Committed(true);
      if (q2Done) setQ2Committed(true);
      if (q3Done) setQ3Committed(true);
    }
  }, [isOpen]); // eslint-disable-line

  const showQ2 = q1Committed && q1Done;
  const showQ3 = q2Committed && q2Done;
  const showAdvance = q3Committed && q3Done;

  const borderColor = isOpen   ? 'var(--color-blue)'
                    : isDone   ? 'var(--color-gray-200)'
                    :            'var(--color-gray-200)';

  const ulStyle = (focused) => ({
    display: 'flex', alignItems: 'center', gap: 4,
    borderBottom: `2px solid ${focused ? 'var(--color-blue)' : 'var(--color-navy-20)'}`,
    paddingBottom: 3, transition: 'border-color 0.15s',
  });

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      border: `1.5px solid ${borderColor}`,
      background: isDone && !isOpen ? 'var(--color-gray-100)' : 'var(--color-white)',
      padding: '14px 18px 16px',
      opacity: isLocked ? 0.38 : 1,
      pointerEvents: isLocked ? 'none' : 'auto',
      transition: 'opacity 0.3s, box-shadow 0.2s, border-color 0.2s',
      boxShadow: isOpen ? 'var(--shadow-md)' : 'none',
      marginBottom: 10,
      cursor: isDone && !isOpen ? 'pointer' : 'default',
    }}
      onClick={isDone && !isOpen ? onEdit : undefined}
    >
      {/* Month title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isOpen ? 16 : 0 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: isDone ? 'var(--color-success)' : isOpen ? 'var(--color-blue)' : 'var(--color-gray-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDone || isOpen ? 'white' : 'var(--color-gray-400)',
          transition: 'background 0.2s',
        }}>
          {isDone ? <NiIconCheck /> : <span style={{ fontSize: 9, fontWeight: 700 }}>{index + 1}</span>}
        </div>

        <span style={{
          fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 14,
          color: isDone && !isOpen ? 'var(--color-navy-70)' : 'var(--color-navy)',
          flex: 1,
        }}>
          {niFmtFull(etapa.mes)}
        </span>

        {/* Done summary + edit hint */}
        {isDone && !isOpen && (
          <span style={{ fontSize: 11, color: 'var(--color-navy-50)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {fmtBRL((Number(etapa.orcamentoMaterial)||0)+(Number(etapa.orcamentoMaoDeObra)||0))} · {etapa.percentual}%
            <span style={{ color: 'var(--color-navy-50)', opacity: 0.5, display: 'flex' }}><NiIconEdit /></span>
          </span>
        )}
      </div>

      {/* Open body — questions */}
      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Q1 — Budget */}
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-navy)', fontFamily: 'var(--font-body)', lineHeight: 1.55, marginBottom: 12 }}>
              Quanto será gasto nesse mês?{' '}<br/>
              <span style={{ color: 'var(--color-navy-50)', fontSize: 12 }}>O valor será recebido em torno do dia 30 do mês anterior.</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['orcamentoMaterial','Material'],['orcamentoMaoDeObra','Mão de Obra']].map(([field, label]) => {
                const [focused, setFocused] = [false, () => {}]; // placeholder — focus handled via CSS
                return (
                  <div key={field}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-display)', color: 'var(--color-navy-50)', marginBottom: 5 }}>{label}</div>
                    <NiFieldRow
                      shouldCommit={() => q1Done}
                      onCommit={() => setQ1Committed(true)}
                      style={ulStyle(false)}
                      onFocusCapture={e => { e.currentTarget.style.borderBottomColor = 'var(--color-blue)'; }}
                      onBlurCapture={e => {
                        if (!e.currentTarget.contains(e.relatedTarget))
                          e.currentTarget.style.borderBottomColor = 'var(--color-navy-20)';
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--color-navy-50)', fontFamily: 'var(--font-mono)', userSelect: 'none' }}>R$</span>
                      <NumInput
                        value={etapa[field]}
                        onChange={v => onChange(field, v)}
                        placeholder="0"
                        style={{ border: 'none', outline: 'none', fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--color-navy)', background: 'transparent', flex: 1, padding: 0 }}
                      />
                    </NiFieldRow>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Q2 — Description (after Q1 committed) */}
          {showQ2 && (
            <div style={{ animation: 'niReveal 0.22s ease-out both' }}>
              <p style={{ fontSize: 13, color: 'var(--color-navy)', fontFamily: 'var(--font-body)', lineHeight: 1.55, marginBottom: 10 }}>
                Resumidamente, que atividades serão feitas nesse mês?
              </p>
              <NiFieldRow
                shouldCommit={() => q2Done}
                onCommit={() => setQ2Committed(true)}
                style={{ borderBottom: '2px solid var(--color-navy-20)', transition: 'border-color 0.15s' }}
                onFocusCapture={e => { e.currentTarget.style.borderBottomColor = 'var(--color-blue)'; }}
                onBlurCapture={e => {
                  if (!e.currentTarget.contains(e.relatedTarget))
                    e.currentTarget.style.borderBottomColor = 'var(--color-navy-20)';
                }}
              >
                <textarea
                  value={etapa.descricao}
                  onChange={e => onChange('descricao', e.target.value)}
                  rows={3}
                  placeholder="Descreva as atividades previstas…"
                  style={{
                    width: '100%', border: 'none', outline: 'none', resize: 'none',
                    fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-navy)',
                    background: 'transparent', padding: '4px 0', boxSizing: 'border-box', lineHeight: 1.55,
                  }}
                />
              </NiFieldRow>
            </div>
          )}

          {/* Q3 — % (after Q2 committed) */}
          {showQ3 && (
            <div style={{ animation: 'niReveal 0.22s ease-out both' }}>
              <p style={{ fontSize: 13, color: 'var(--color-navy)', fontFamily: 'var(--font-body)', lineHeight: 1.55, marginBottom: 10 }}>
                Quanto a execução desse mês representa da execução total do item <strong>"{nome}"</strong>?
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <NiFieldRow
                  shouldCommit={() => q3Done}
                  onCommit={() => setQ3Committed(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '2px solid var(--color-navy-20)', paddingBottom: 3, transition: 'border-color 0.15s' }}
                  onFocusCapture={e => { e.currentTarget.style.borderBottomColor = 'var(--color-blue)'; }}
                  onBlurCapture={e => {
                    if (!e.currentTarget.contains(e.relatedTarget))
                      e.currentTarget.style.borderBottomColor = 'var(--color-navy-20)';
                  }}
                >
                  <NumInput
                    value={etapa.percentual}
                    onChange={v => onChange('percentual', v)}
                    placeholder="0"
                    style={{ border: 'none', outline: 'none', fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-navy)', background: 'transparent', width: 60, padding: 0 }}
                  />
                  <span style={{ fontSize: 18, color: 'var(--color-navy-50)', fontFamily: 'var(--font-mono)', userSelect: 'none' }}>%</span>
                </NiFieldRow>

                {showAdvance && (
                  <button
                    onClick={onAdvance}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'var(--color-navy)', color: 'white',
                      border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      padding: '7px 14px', fontSize: 12, fontWeight: 600,
                      fontFamily: 'var(--font-display)', animation: 'niReveal 0.18s ease-out both',
                    }}
                  >
                    Próximo <NiIconArrow />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── NovoItemDrawer ────────────────────────────────────────────────────
const NovoItemDrawer = ({ isOpen, onClose, onSave, initialData }) => {
  const [phase,      setPhase]      = useStateNI('nome');
  const [nome,       setNome]       = useStateNI('');
  const [startMonth, setStartMonth] = useStateNI('');
  const [endMonth,   setEndMonth]   = useStateNI('');
  const [etapas,     setEtapas]     = useStateNI([]);
  const [activeIdx,  setActiveIdx]  = useStateNI(0);
  const nomeRef    = useRefNI(null);
  const etapasRef  = useRefNI([]);

  // Keep ref in sync for use inside effects without dependency loops
  useEffectNI(() => { etapasRef.current = etapas; }, [etapas]);

  // Reset on open (or initialize from initialData for edit mode)
  useEffectNI(() => {
    if (isOpen) {
      if (initialData && initialData.etapas && initialData.etapas.length > 0) {
        const copied = JSON.parse(JSON.stringify(initialData.etapas));
        const start  = initialData.etapas[0].mes || '';
        const end    = initialData.etapas[initialData.etapas.length - 1].mes || '';
        etapasRef.current = copied;
        setNome(initialData.nome || '');
        setStartMonth(start);
        setEndMonth(end);
        setEtapas(copied);
        setActiveIdx(0);
        setPhase('etapas');
      } else {
        setPhase('nome'); setNome(''); setStartMonth(''); setEndMonth('');
        setEtapas([]); setActiveIdx(0);
        etapasRef.current = [];
      }
    }
  }, [isOpen]);

  // Autofocus nome field
  useEffectNI(() => {
    if (isOpen && phase === 'nome') {
      const t = setTimeout(() => nomeRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [isOpen, phase]);

  // Regenerate etapas when range changes; preserve data for months still in range
  useEffectNI(() => {
    if (startMonth && endMonth && endMonth >= startMonth) {
      const next = niGenEtapas(startMonth, endMonth, etapasRef.current);
      setEtapas(next);
      // Open the first incomplete month
      const firstIncomplete = next.findIndex(e =>
        e.orcamentoMaterial === '' || e.orcamentoMaoDeObra === '' || !e.descricao.trim() || e.percentual === ''
      );
      setActiveIdx(firstIncomplete === -1 ? next.length - 1 : firstIncomplete);
    }
  }, [startMonth, endMonth]);

  const updateEtapa = (idx, field, value) => {
    setEtapas(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  // A card is "done" when all its fields are filled
  const cardIsDone = (e) =>
    e.orcamentoMaterial !== '' && e.orcamentoMaoDeObra !== '' &&
    e.descricao.trim() !== '' && e.percentual !== '';

  // A card can be opened if the card before it is done (or it's the first)
  const cardIsAccessible = (idx) => idx === 0 || cardIsDone(etapas[idx - 1]);

  const canGoToEtapas = startMonth && endMonth && endMonth >= startMonth;

  const allDone = etapas.length > 0 && etapas.every(cardIsDone);
  const pctSum  = etapas.reduce((s, e) => s + (Number(e.percentual) || 0), 0);
  const pctOk   = Math.round(pctSum) === 100;
  const canSave = allDone && pctOk;

  const handleSave = () => { if (canSave) onSave({ nome, etapas }); };

  const phaseOrder = ['nome', 'cronograma', 'etapas'];
  const phaseIdx   = phaseOrder.indexOf(phase);

  if (!isOpen) return null;

  // Small inline edit button used in header
  const EditBtn = ({ onClick }) => (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--color-navy-50)', padding: '2px 4px', display: 'inline-flex',
        borderRadius: 'var(--radius-sm)', transition: 'color 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--color-blue)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--color-navy-50)'}
      title="Editar"
    >
      <NiIconEdit />
    </button>
  );

  return (
    <>
      <style>{`
        @keyframes niReveal  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes niSlideIn { from { transform:translateX(-32px); opacity:0; } to { transform:translateX(0); opacity:1; } }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(13,27,38,0.52)', backdropFilter:'blur(3px)' }} />

      {/* Drawer */}
      <div style={{
        position:'fixed', left:0, top:0, bottom:0, width:560,
        background:'var(--color-white)', zIndex:201,
        display:'flex', flexDirection:'column',
        boxShadow:'8px 0 40px rgba(13,27,38,0.18)',
        animation:'niSlideIn 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:'13px 20px', borderBottom:'1px solid var(--color-gray-200)',
          display:'flex', alignItems:'center', gap:10, flexShrink:0,
        }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:6, minWidth:0, overflow:'hidden' }}>
            {nome ? (
              <>
                <span style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:14, color:'var(--color-navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {nome}
                </span>
                {phase !== 'nome' && <EditBtn onClick={() => setPhase('nome')} />}
              </>
            ) : (
              <span style={{ fontFamily:'var(--font-display)', fontSize:14, color:'var(--color-gray-400)' }}>Novo item</span>
            )}

            {nome && startMonth && endMonth && phase === 'etapas' && (
              <>
                <span style={{ color:'var(--color-gray-400)', flexShrink:0, fontSize:12 }}>·</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:12, color:'var(--color-navy-70)', whiteSpace:'nowrap', flexShrink:0 }}>
                  {niFmtShort(startMonth)} → {niFmtShort(endMonth)}
                </span>
                <EditBtn onClick={() => setPhase('cronograma')} />
              </>
            )}
          </div>

          {/* Phase dots */}
          <div style={{ display:'flex', gap:5, flexShrink:0 }}>
            {phaseOrder.map((p, i) => (
              <div key={p} style={{
                width:6, height:6, borderRadius:'50%',
                background: i < phaseIdx ? 'var(--color-success)' : i === phaseIdx ? 'var(--color-navy)' : 'var(--color-gray-200)',
                transition:'background 0.25s',
              }} />
            ))}
          </div>

          <button
            onClick={onClose}
            style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--color-navy-50)', padding:4, display:'flex', borderRadius:'var(--radius-sm)', flexShrink:0, transition:'color 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-navy)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-navy-50)'}
          >
            <NiIconClose />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'36px 36px 28px' }}>

          {/* ── Phase 1: Nome ── */}
          {phase === 'nome' && (
            <div style={{ display:'flex', flexDirection:'column', gap:32, animation:'niReveal 0.2s ease-out' }}>
              <div>
                <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--color-navy-50)', fontFamily:'var(--font-display)', marginBottom:20 }}>
                  Passo 1 de 3
                </p>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--color-navy)', lineHeight:1.3, marginBottom:28 }}>
                  Qual é o nome desse item?
                </h2>
                <input
                  ref={nomeRef}
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && nome.trim()) setPhase('cronograma'); }}
                  placeholder="Ex: Estrutura metálica…"
                  style={{
                    width:'100%', border:'none', borderBottom:'2px solid var(--color-navy-20)',
                    outline:'none', fontSize:20, fontWeight:600, fontFamily:'var(--font-display)',
                    color:'var(--color-navy)', background:'transparent', padding:'4px 0',
                    boxSizing:'border-box', transition:'border-bottom-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderBottomColor = 'var(--color-blue)'}
                  onBlur={e => e.target.style.borderBottomColor = 'var(--color-navy-20)'}
                />
                <p style={{ marginTop:8, fontSize:11, color:'var(--color-gray-400)', fontFamily:'var(--font-body)' }}>
                  Pressione Enter ou clique em Próximo →
                </p>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button
                  onClick={() => nome.trim() && setPhase('cronograma')}
                  disabled={!nome.trim()}
                  style={{
                    display:'flex', alignItems:'center', gap:7,
                    background: nome.trim() ? 'var(--color-navy)' : 'var(--color-gray-200)',
                    color: nome.trim() ? 'white' : 'var(--color-gray-400)',
                    border:'none', borderRadius:'var(--radius-md)',
                    cursor: nome.trim() ? 'pointer' : 'default',
                    padding:'10px 22px', fontSize:13, fontWeight:600,
                    fontFamily:'var(--font-display)', transition:'background 0.15s, color 0.15s',
                  }}
                >
                  Próximo <NiIconArrow />
                </button>
              </div>
            </div>
          )}

          {/* ── Phase 2: Cronograma ── */}
          {phase === 'cronograma' && (
            <div style={{ display:'flex', flexDirection:'column', gap:32, animation:'niReveal 0.2s ease-out' }}>
              <div>
                <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--color-navy-50)', fontFamily:'var(--font-display)', marginBottom:20 }}>
                  Passo 2 de 3
                </p>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--color-navy)', lineHeight:1.3, marginBottom:8 }}>
                  Qual é o cronograma previsto?
                </h2>
                <p style={{ fontFamily:'var(--font-body)', fontSize:14, color:'var(--color-navy-70)', lineHeight:1.55, marginBottom:28 }}>
                  Selecione o mês inicial e final para a execução do item <strong>"{nome}"</strong>.
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {[['Mês inicial', startMonth, setStartMonth],['Mês final', endMonth, setEndMonth]].map(([label, val, setter]) => (
                    <div key={label}>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'var(--font-display)', color:'var(--color-navy-50)', marginBottom:7 }}>{label}</div>
                      <MonthPicker value={val} onChange={setter} />
                    </div>
                  ))}
                </div>
                {startMonth && endMonth && endMonth < startMonth && (
                  <p style={{ marginTop:10, fontSize:12, color:'var(--color-error)', fontFamily:'var(--font-body)' }}>
                    O mês final deve ser igual ou posterior ao mês inicial.
                  </p>
                )}
                {canGoToEtapas && (
                  <p style={{ marginTop:12, fontSize:12, color:'var(--color-navy-50)', fontFamily:'var(--font-body)' }}>
                    {niGenEtapas(startMonth, endMonth).length} {niGenEtapas(startMonth, endMonth).length === 1 ? 'mês selecionado' : 'meses selecionados'}
                  </p>
                )}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <button onClick={() => setPhase('nome')} style={{ background:'transparent', border:'1px solid var(--color-gray-200)', borderRadius:'var(--radius-md)', cursor:'pointer', padding:'9px 18px', fontSize:13, fontWeight:600, fontFamily:'var(--font-display)', color:'var(--color-navy-70)' }}>
                  ← Voltar
                </button>
                <button
                  onClick={() => canGoToEtapas && setPhase('etapas')}
                  disabled={!canGoToEtapas}
                  style={{
                    display:'flex', alignItems:'center', gap:7,
                    background: canGoToEtapas ? 'var(--color-navy)' : 'var(--color-gray-200)',
                    color: canGoToEtapas ? 'white' : 'var(--color-gray-400)',
                    border:'none', borderRadius:'var(--radius-md)',
                    cursor: canGoToEtapas ? 'pointer' : 'default',
                    padding:'10px 22px', fontSize:13, fontWeight:600,
                    fontFamily:'var(--font-display)', transition:'background 0.15s, color 0.15s',
                  }}
                >
                  Próximo <NiIconArrow />
                </button>
              </div>
            </div>
          )}

          {/* ── Phase 3: Month boxes ── */}
          {phase === 'etapas' && (
            <div style={{ animation:'niReveal 0.2s ease-out' }}>
              <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--color-navy-50)', fontFamily:'var(--font-display)', marginBottom:20 }}>
                Passo 3 de 3 · {etapas.length} {etapas.length === 1 ? 'mês' : 'meses'}
              </p>

              {etapas.map((etapa, idx) => (
                <NiMonthBox
                  key={etapa.id}
                  etapa={etapa}
                  nome={nome}
                  index={idx}
                  isOpen={idx === activeIdx}
                  isDone={cardIsDone(etapa)}
                  isLocked={!cardIsAccessible(idx) && idx !== activeIdx}
                  onChange={(field, value) => updateEtapa(idx, field, value)}
                  onAdvance={() => setActiveIdx(idx + 1)}
                  onEdit={() => setActiveIdx(idx)}
                />
              ))}
              <div style={{ height:8 }} />
            </div>
          )}
        </div>

        {/* ── Footer (etapas phase only) ── */}
        {phase === 'etapas' && (
          <div style={{ borderTop:'1px solid var(--color-gray-200)', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'var(--color-white)' }}>
            <button onClick={() => setPhase('cronograma')} style={{ background:'transparent', border:'1px solid var(--color-gray-200)', borderRadius:'var(--radius-md)', cursor:'pointer', padding:'8px 16px', fontSize:13, fontWeight:600, fontFamily:'var(--font-display)', color:'var(--color-navy-70)' }}>
              ← Voltar
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              {!allDone && (
                <span style={{ fontSize:11, color:'var(--color-navy-50)', fontFamily:'var(--font-display)' }}>
                  {etapas.filter(cardIsDone).length}/{etapas.length} meses completos
                </span>
              )}
              {allDone && !pctOk && (
                <span style={{ fontSize:11, color:'var(--color-error)', fontFamily:'var(--font-body)', lineHeight:1.4, maxWidth:200 }}>
                  Soma dos percentuais de todos os meses deve ser 100%. Atual: {Math.round(pctSum)}%
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  display:'flex', alignItems:'center', gap:7,
                  background: canSave ? 'var(--color-navy)' : 'var(--color-gray-200)',
                  color: canSave ? 'white' : 'var(--color-gray-400)',
                  border:'none', borderRadius:'var(--radius-md)',
                  cursor: canSave ? 'pointer' : 'default',
                  padding:'10px 24px', fontSize:13, fontWeight:700,
                  fontFamily:'var(--font-display)',
                  transition:'background 0.2s, color 0.2s',
                  boxShadow: canSave ? 'var(--shadow-sm)' : 'none',
                }}
              >
                Salvar <NiIconArrow />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

Object.assign(window, { NovoItemDrawer });
