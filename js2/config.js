// ============================================================
// CONFIGURAÇÕES E DADOS
// ============================================================

Chart.register(ChartDataLabels);

// ------------------------------------------------------------
// Formatação
// ------------------------------------------------------------

const fmtBRL = (v) =>
    'R$ ' +
    v.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });

const fmtPct = (v, signed = true) =>
    (signed && v > 0 ? '+' : '') +
    v.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) +
    '%';

const fmtPctArrow = (v) =>
    (v >= 0 ? String.fromCharCode(9650) + ' ' : String.fromCharCode(9660) + ' ') +
    Math.abs(v).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) +
    '%';

// ------------------------------------------------------------
// Região
// ------------------------------------------------------------


const regiaoLabels = [];

const regiaoValores = [];

const regiaoReferenciais = [];

const regiaoDeltas = [];

const regiaoTotal = {
    nome: 'Total',
    sub: 'Faturamento total',
    valor: 0,
    ref: 0,
    delta: 0
};

// ------------------------------------------------------------
// Canal
// ------------------------------------------------------------

const canalLabels = [];

const canalValores = [];

const canalReferenciais = [];

const canalDeltas = [];

const canalTotal = {
    nome: 'Total',
    sub: 'Faturamento total por canal',
    valor: 0,
    ref: 0,
    delta: 0
};

// ------------------------------------------------------------
// Parceiros
// ------------------------------------------------------------

// ------------------------------------------------------------
// Parceiros
// ------------------------------------------------------------

const parceiros = [];

const totalParceiros = {
    nome: 'Total',
    valor: 0,
    ref: 0,
    delta: 0
};