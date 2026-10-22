/**
 * utils.js
 * Responsabilidade única: formatação de números/moeda em pt-BR.
 * Funções puras, sem acesso a DOM.
 */

function fmt(v, d = 1) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', {
        minimumFractionDigits: d,
        maximumFractionDigits: d
    });
}

function pct(v) {
    const n = Number(v);
    return (n >= 0 ? '+' : '') + n.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) + '%';
}

function pctArrow(v) {
    const n = Number(v);
    const arrow = n >= 0 ? '▲' : '▼';
    return arrow + ' ' + Math.abs(n).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) + '%';
}