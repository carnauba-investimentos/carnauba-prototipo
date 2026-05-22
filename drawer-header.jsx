// drawer-header.jsx — Parametric DrawerHeader shared by ItemDrawer and MonthCard
const { React: _dh_React } = window;
const { useState: useStateDH } = React;

const fmtBRLFull = (v) =>
  'R$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(v) || 0);

// ── ValueTag ──────────────────────────────────────────────────────────────────
// A compact labeled value badge.
// Props: label, value, bg, color, style
const ValueTag = ({ label, value, bg, color, style: extraStyle }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    background: bg || VM_NEUTRAL.bg2,
    borderRadius: 'var(--radius-sm)',
    padding: '4px 10px',
    minWidth: 80,
    ...extraStyle,
  }}>
    <span style={{
      fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.1em', fontFamily: 'var(--font-mono)',
      color: color || VM_NEUTRAL.text1, opacity: 0.75,
      marginBottom: 2,
    }}>
      {label}
    </span>
    <span style={{
      fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
      color: color || VM_NEUTRAL.text2, lineHeight: 1,
    }}>
      {value}
    </span>
  </div>
);

// ── SegBar ────────────────────────────────────────────────────────────────────
// A compact progress bar. segments[0] is the background (full-width, pct=100).
// segments[1] and [2] are colored fills that can start at an arbitrary `left` offset.
// Props: segments [{ pct, left?, bg, label?, labelColor? }], height, borderRadius, label
const SegBar = ({ segments = [], height = 22, borderRadius = 6, label }) => {
  const bgSeg   = segments[0] || { bg: VM_NEUTRAL.bg3 };
  const fills   = segments.slice(1);
  const allSegs = segments; // used for labels only

  return (
    <div>
      {label && (
        <div style={{
          fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', fontFamily: 'var(--font-mono)',
          color: VM_NEUTRAL.text1, marginBottom: 4, textAlign: 'right',
        }}>
          {label}
        </div>
      )}
      {/* Container IS the background — overflow:hidden clips children to rounded rect */}
      <div style={{
        position: 'relative', height, borderRadius, overflow: 'hidden',
        background: bgSeg.bg,
        minWidth: 160,
      }}>
        {/* Colored fill divs — no borderRadius so they fill flush against each other */}
        {fills.map((seg, i) => {
          const left  = Math.min(100, Math.max(0, seg.left || 0));
          const width = Math.min(100 - left, Math.max(0, seg.pct || 0));
          if (width <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: `${left}%`, top: 0, bottom: 0,
                width: `${width}%`,
                background: seg.bg,
                transition: 'width 0.35s ease-out, left 0.35s ease-out',
              }}
            />
          );
        })}
        {/* Labels — at the right edge of each segment (bg + fills) */}
        {allSegs.map((seg, i) => {
          if (!seg.label) return null;
          const rightEdgePct = Math.min(100, (seg.left || 0) + (seg.pct || 0));
          return (
            <div
              key={`lbl-${i}`}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${rightEdgePct}%`,
                transform: 'translateX(-100%)',
                display: 'flex', alignItems: 'center',
                paddingRight: 6,
                fontSize: seg.labelSize || 9,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: seg.labelColor || VM_NEUTRAL.text1,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: i + 2,
              }}
            >
              {seg.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── DrawerHeader ──────────────────────────────────────────────────────────────
//
// Parametric two-row header for ItemDrawer and MonthCard.
//
// Props:
//   circle       — { content, fill, stroke, size, textStyle, opacity } | null
//   title        — string
//   subtitle     — string | null
//   titleStyle   — object (css overrides for title span)
//   subtitleStyle — object (css overrides for subtitle span)
//   statusDiv    — ReactNode (right-aligned in Row 1)
//   tags         — array of { label, fill, strokeColor, textStyle }
//   tagStyle     — { padding, fontSize } (applied to all tags)
//   padding      — padding string for Row 1 (default '14px 18px')
//   gap          — gap for Row 1 flex (default 12)
const DrawerHeader = ({
  circle = null,
  title,
  subtitle = null,
  titleStyle = {},
  subtitleStyle = {},
  statusDiv = null,
  tags = [],
  tagStyle = {},
  padding = '14px 18px',
  gap = 12,
  rowDivider = false,
}) => {
  const defaultTitleStyle = {
    fontSize: 16, fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-navy)',
    lineHeight: 1.2,
  };
  const defaultSubtitleStyle = {
    fontSize: 12, fontFamily: 'var(--font-display)',
    color: 'var(--color-navy)', opacity: 0.55,
    marginTop: 2,
  };
  const defaultTagStyle = {
    padding: '3px 9px',
    fontSize: 11,
  };
  const mergedTag = { ...defaultTagStyle, ...tagStyle };

  return (
    <div>
      {/* Row 1: Circle + Titles + StatusDiv */}
      <div style={{ display: 'flex', alignItems: 'center', gap, padding }}>
        {/* Circle */}
        {circle && (
          <div style={{
            width: circle.size || 32, height: circle.size || 32,
            borderRadius: '50%', flexShrink: 0,
            background: circle.fill || VM_NEUTRAL.bg3,
            border: circle.stroke ? `2px solid ${circle.stroke}` : 'none',
            opacity: circle.opacity != null ? circle.opacity : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white',
            transition: 'opacity 0.2s, background 0.2s',
            ...(circle.textStyle || {}),
          }}>
            {circle.content}
          </div>
        )}

        {/* Titles */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {title != null && (
            <div style={{ ...defaultTitleStyle, ...titleStyle }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ ...defaultSubtitleStyle, ...subtitleStyle }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* StatusDiv */}
        {statusDiv && (
          <div style={{ flexShrink: 0 }}>
            {statusDiv}
          </div>
        )}
      </div>

      {/* Divider between Row 1 and Row 2 */}
      {rowDivider && tags.length > 0 && (
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginLeft: padding.split(' ')[1] || '18px', marginRight: padding.split(' ')[1] || '18px' }} />
      )}

      {/* Row 2: Tags */}
      {tags.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 5,
          paddingLeft: padding.split(' ')[1] || '18px',
          paddingRight: padding.split(' ')[1] || '18px',
          paddingTop: rowDivider ? 10 : 0,
          paddingBottom: 12,
        }}>
          {tags.map((tag, i) => (
            <span key={i} style={{
              display: 'inline-block',
              padding: mergedTag.padding,
              fontSize: mergedTag.fontSize,
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              color: tag.textStyle?.color || VM_NEUTRAL.text2,
              background: tag.fill || VM_NEUTRAL.bg2,
              border: `1px solid ${tag.strokeColor || VM_NEUTRAL.bg3}`,
              borderRadius: 'var(--radius-sm)',
              ...(tag.textStyle || {}),
            }}>
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
// Hover tooltip for FINANCEIRO progress bars showing exact BRL values.
// Uses ReactDOM.createPortal to document.body so it escapes transforms, stacking
// contexts, and overflow:hidden from DnD draggables and scroll containers.
// Props: solicitado, recebido, gasto (numbers), warn (bool), disabled (bool), children
// Global drag-suppression flag. Set by DragDropContext callbacks in app.jsx.
// window.__tooltipDragBlocked = true while dragging or within 1s after drop.
window.__tooltipDragBlocked = false;

const Tooltip = ({ children, solicitado = 0, recebido = 0, gasto = 0, warn = false, disabled = false, wrapperStyle = {} }) => {
  const [rect, setRect] = useStateDH(null);
  const timerRef = React.useRef(null);
  const palette = warn ? VM_WARNING : VM_FINANCEIRO;

  React.useEffect(() => {
    const dismiss = () => { clearTimeout(timerRef.current); setRect(null); };
    window.addEventListener('tooltip-drag-start', dismiss);
    return () => window.removeEventListener('tooltip-drag-start', dismiss);
  }, []);

  if (disabled) return children;

  const scheduleShow = (el) => {
    if (window.__tooltipDragBlocked) return;
    clearTimeout(timerRef.current);
    const captured = el.getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      if (!window.__tooltipDragBlocked) setRect(captured);
    }, 1000);
  };
  const show  = (e) => scheduleShow(e.currentTarget);
  const move  = (e) => { if (!rect) scheduleShow(e.currentTarget); };
  const hide  = () => { clearTimeout(timerRef.current); setRect(null); };

  const panel = rect && ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: rect.top + rect.height / 2,
      left: rect.right - 20,
      transform: 'translateY(-50%)',
      zIndex: 99999,
      pointerEvents: 'none',
    }}>
      {/* Box with overflow:visible so the arrow pseudo-element bleeds out */}
      <div style={{
        position: 'relative',
        background: 'white',
        border: `1px solid ${VM_NEUTRAL.bg3}`,
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(13,27,38,0.14)',
        padding: '8px 12px',
        minWidth: 140,
        whiteSpace: 'nowrap',
      }}>
        {/* Arrow: rotated square, same bg+border, left side border clipped by box */}
        <div style={{
          position: 'absolute',
          left: -5, top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: 9, height: 9,
          background: 'white',
          borderLeft: `1px solid ${VM_NEUTRAL.bg3}`,
          borderBottom: `1px solid ${VM_NEUTRAL.bg3}`,
          borderTop: 'none',
          borderRight: 'none',
        }} />
      {[
        { label: 'SOLICITADO', value: fmtBRLFull(solicitado), color: 'rgb(143,153,162)' },
        { label: 'RECEBIDO',   value: fmtBRLFull(recebido),   color: palette.active },
        { label: 'GASTO',      value: fmtBRLFull(gasto),      color: palette.complete },
      ].map((row, i, arr) => (
        <div key={row.label} style={{
          borderTop: i > 0 ? `1px solid ${VM_NEUTRAL.bg2}` : 'none',
          paddingTop: i > 0 ? 6 : 0,
          paddingBottom: i < arr.length - 1 ? 6 : 0,
        }}>
          <div style={{
            fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', fontFamily: 'var(--font-mono)',
            color: VM_NEUTRAL.text1, opacity: 0.6, marginBottom: 2,
          }}>
            {row.label}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: row.color }}>
            {row.value}
          </div>
        </div>
      ))}
      </div>
    </div>,
    document.body
  );

  return (
    <div style={{ height: '100%', ...wrapperStyle }} onMouseEnter={show} onMouseMove={move} onMouseLeave={hide}>
      {children}
      {panel}
    </div>
  );
};

// ── FisicoTooltip — hover tooltip for FÍSICO progress bars ──────────────────
const FisicoTooltip = ({ children, futuro = 0, planejado = 0, realizado = 0, atraso = 0, disabled = false, wrapperStyle = {} }) => {
  const [rect, setRect] = useStateDH(null);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    const dismiss = () => { clearTimeout(timerRef.current); setRect(null); };
    window.addEventListener('tooltip-drag-start', dismiss);
    return () => window.removeEventListener('tooltip-drag-start', dismiss);
  }, []);

  if (disabled) return children;

  const scheduleShow = (el) => {
    if (window.__tooltipDragBlocked) return;
    clearTimeout(timerRef.current);
    const captured = el.getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      if (!window.__tooltipDragBlocked) setRect(captured);
    }, 1000);
  };
  const show = (e) => scheduleShow(e.currentTarget);
  const move = (e) => { if (!rect) scheduleShow(e.currentTarget); };
  const hide = () => { clearTimeout(timerRef.current); setRect(null); };

  const rows = [
    { label: 'Planejamento futuro',  value: `${Math.round(futuro)}%`,    color: VM_NEUTRAL.text1 },
    { label: 'Pendente no mês', value: `${Math.round(planejado)}%`, color: VM_FISICO.active },
    { label: 'Progresso realizado',  value: `${Math.round(realizado)}%`, color: VM_FISICO.complete },
    { label: 'Atividades em atraso', value: `${Math.round(atraso)}%`,    color: VM_WARNING.active },
  ];

  const panel = rect && ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: rect.top + rect.height / 2,
      left: rect.right - 20,
      transform: 'translateY(-50%)',
      zIndex: 99999,
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'relative',
        background: 'white',
        border: `1px solid ${VM_NEUTRAL.bg3}`,
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(13,27,38,0.14)',
        padding: '8px 12px',
        minWidth: 160,
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          position: 'absolute',
          left: -5, top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: 9, height: 9,
          background: 'white',
          borderLeft: `1px solid ${VM_NEUTRAL.bg3}`,
          borderBottom: `1px solid ${VM_NEUTRAL.bg3}`,
        }} />
        {rows.map((row, i, arr) => (
          <div key={row.label} style={{
            borderTop: i > 0 ? `1px solid ${VM_NEUTRAL.bg2}` : 'none',
            paddingTop: i > 0 ? 6 : 0,
            paddingBottom: i < arr.length - 1 ? 6 : 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-display)',
              color: VM_NEUTRAL.text2,
            }}>
              {row.label}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: row.color }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );

  return (
    <div style={{ height: '100%', ...wrapperStyle }} onMouseEnter={show} onMouseMove={move} onMouseLeave={hide}>
      {children}
      {panel}
    </div>
  );
};

Object.assign(window, { DrawerHeader, ValueTag, SegBar, Tooltip, FisicoTooltip, fmtBRLFull });
