// ============================================================
// GRÁFICOS — wrappers sobre Dashboard (lib/dashboard-components.js)
// Mantém as mesmas funções públicas usadas pelo main.js
// ============================================================

let regiaoChart = null;
let canalChart = null;

/**
 * Gráfico horizontal Valor x Referencial (meta).
 * Preferir Dashboard.renderBarWithMeta diretamente quando possível.
 */
function buildHBarChart(canvasId, labels, valores, referenciais, deltas) {
    const items = (labels || []).map(function (label, i) {
        return {
            label: label,
            value: Number(valores[i]) || 0,
            ref: Number(referenciais[i]) || 0,
            delta: deltas && deltas[i] !== undefined ? Number(deltas[i]) : undefined
        };
    });

    const chart = Dashboard.renderBarWithMeta(canvasId, {
        items: items,
        color: '#3fae87',
        animation: false
    });

    if (canvasId === 'regiao-chart') regiaoChart = chart;
    if (canvasId === 'canal-chart') canalChart = chart;

    return chart;
}

function ajustarAlturaGraficoBarras(innerId, quantidade) {
    const inner = document.getElementById(innerId);
    if (!inner) return;
    const qtd = Math.max(Number(quantidade) || 0, 1);
    const alturaPadrao = 320;
    const alturaPorBarra = 56;
    inner.style.height = Math.max(alturaPadrao, qtd * alturaPorBarra) + 'px';
}

function atualizarGraficoCanal() {
    if (canalChart) {
        try { canalChart.destroy(); } catch (e) { /* ignore */ }
        canalChart = null;
    }

    canalChart = Dashboard.renderBarWithMeta('canal-chart', {
        items: canalLabels.map(function (label, i) {
            return {
                label: label,
                value: canalValores[i],
                ref: canalReferenciais[i],
                delta: canalDeltas[i]
            };
        }),
        innerId: 'canal-inner',
        color: '#3fae87',
        onClick: function (item) {
            abrirAnaliseCanal(item.label);
        }
    });
}

function abrirAnaliseCanal(canal) {
    const canalSelecionado = String(canal || '').trim();
    if (!canalSelecionado) {
        console.warn('Canal inválido para drill-down.');
        return;
    }

    const argsAtuais = window.top.dashboardArgs || {};
    window.top.dashboardArgs = Object.assign({}, argsAtuais, {
        CANAL: canalSelecionado
    });

    console.log('Abrindo análise do canal:', canalSelecionado);

    if (typeof openLevel === 'function') {
        openLevel('06T', {
            UF: argsAtuais.UF || window.top.dashboardArgs.UF,
            CANAL: canalSelecionado
        });
    }
}

function abrirAnaliseRegiao(regiao) {
    const regiaoSelecionada = String(regiao || '').trim();
    if (!regiaoSelecionada) {
        console.warn('Região inválida para drill-down.');
        return;
    }

    const argsAtuais = window.top.dashboardArgs || {};
    window.top.dashboardArgs = Object.assign({}, argsAtuais, {
        REGIAO: regiaoSelecionada
    });

    console.log('Abrindo análise da região:', regiaoSelecionada);

    if (typeof openLevel === 'function') {
        openLevel('03B', {
            UF: argsAtuais.UF || window.top.dashboardArgs.UF,
            REGIAO: regiaoSelecionada
        });
    }
}

function atualizarGraficoRegiao() {
    if (regiaoChart) {
        try { regiaoChart.destroy(); } catch (e) { /* ignore */ }
        regiaoChart = null;
    }

    regiaoChart = Dashboard.renderBarWithMeta('regiao-chart', {
        items: regiaoLabels.map(function (label, i) {
            return {
                label: label,
                value: regiaoValores[i],
                ref: regiaoReferenciais[i],
                delta: regiaoDeltas[i]
            };
        }),
        innerId: 'regiao-inner',
        color: '#3fae87',
        onClick: function (item) {
            abrirAnaliseRegiao(item.label);
        }
    });
}

function inicializarGraficos() {
    const canalInner = document.getElementById('canal-inner');
    if (canalInner) {
        ajustarAlturaGraficoBarras('canal-inner', canalLabels.length || 1);
    }
}
