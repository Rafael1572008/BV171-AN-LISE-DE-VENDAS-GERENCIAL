// ============================================================
// formatacao.js — formatação de moeda/percentual e escala de cor
// (depende do D3 estar carregado globalmente)
// ============================================================

const fmtBRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

const fmtPct = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

// formata valor em "R$ x.xxx,x mil" (usado nos KPIs do cabeçalho)
const fmtMil = v => 'R$ ' + (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mil';

// escala verde-corporativo por percentual (usada no mapa e no ranking)
function greenForPct(pct) {
  const t = Math.min(pct / 50, 1);
  const scale = d3.interpolateRgb("#1c4736", "#4fc499");
  return scale(Math.pow(t, 0.55));
}