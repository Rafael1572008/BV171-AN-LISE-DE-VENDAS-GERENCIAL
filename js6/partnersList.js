/**
 * partnersList.js
 * Ranking de parceiros + drill-down para o nível de produtos.
 * Contexto: canal selecionado (index6).
 * Clique no parceiro abre o nível 03Z.
 */

/** Remove aspas/JSON acumulados pelo openLevel (mesmo helper do js2). */
function _limparArgDrill(value) {
    var v = String(value == null ? '' : value).trim();
    for (var i = 0; i < 5; i++) {
        if (!v) break;
        var next = v;
        try {
            var parsed = JSON.parse(next);
            if (typeof parsed === 'string') next = parsed.trim();
        } catch (e) { /* não é JSON */ }
        if (next.length >= 2 && next[0] === '"' && next[next.length - 1] === '"') {
            next = next.slice(1, -1).trim();
        }
        next = next.replace(/\\"/g, '"');
        if (next === v) break;
        v = next;
    }
    return v;
}

function abrirProdutosParceiro(parceiro) {
    if (!parceiro || parceiro.codparc == null) return;

    var argsAtuais = (window.top && window.top.dashboardArgs) || {};
    var novosArgs = Object.assign({}, argsAtuais);

    // Limpa serializações acumuladas nos filtros de contexto.
    ['UF', 'CANAL', 'REGIAO', 'P_PERIODO_R_INI', 'P_PERIODO_R_FIM',
     'P_PERIODO_INI', 'P_PERIODO_FIM', 'P_NEG', 'P_CUSTO_PRAZO', 'PARCEIRO'].forEach(function (chave) {
        if (novosArgs[chave] != null) novosArgs[chave] = _limparArgDrill(novosArgs[chave]);
    });

    // Contexto do drill: canal + parceiro. Usa '' em vez de null (openLevel do Sankhya quebra com null).
    novosArgs.UF = novosArgs.UF || '';
    novosArgs.CANAL = novosArgs.CANAL || (window.dashboardCanal ? _limparArgDrill(window.dashboardCanal) : '');
    novosArgs.REGIAO = novosArgs.REGIAO || '';
    novosArgs.CODPARC = String(parceiro.codparc);
    novosArgs.PARCEIRO = _limparArgDrill(parceiro.name || parceiro.nome || 'Parceiro selecionado');

    window.top.dashboardArgs = novosArgs;

    console.log('DASHBOARD ARGS · OPEN LEVEL 03Z:', novosArgs);

    if (typeof openLevel === 'function') {
        // Objeto novo e limpo — só strings/valores definidos, sem null.
        // Mesmo padrão do js2/parceiros.js (openLevel '02W').
        openLevel('03Z', Object.assign({}, novosArgs));
    } else {
        console.error('openLevel não está disponível no contexto atual.');
    }
}

function renderPartners(rows, total) {
    var data = rows || (typeof partners !== 'undefined' ? partners : []);

    Dashboard.renderPartnersTable('partners-list', {
        items: (data || []).map(function (p) {
            return {
                name: p.name || p.nome || 'Sem nome',
                value: Number(p.value) || 0,
                ref: p.ref === 0 && p.novo ? null : (p.ref === undefined ? null : p.ref),
                delta: p.delta,
                codparc: p.codparc
            };
        }),
        limit: 10,
        valueFormat: 'mil',
        totalContainerId: 'partners-total',
        totalLabel: 'Total dos parceiros',
        totalSub: 'Base: todos os parceiros do período',
        total: total || null
    });

    var linhas = document.querySelectorAll('#partners-list .partner-row');
    Array.prototype.forEach.call(linhas, function (linha, index) {
        var parceiro = data[index];
        if (!parceiro || parceiro.codparc == null) return;
        if (linha.dataset.bv171Drill === '1') return;

        linha.dataset.bv171Drill = '1';
        linha.classList.add('drill-clickable');
        linha.setAttribute('role', 'button');
        linha.setAttribute('tabindex', '0');
        linha.title = 'Clique para ver os produtos deste parceiro';

        var abrir = function () { abrirProdutosParceiro(parceiro); };
        linha.addEventListener('click', abrir);
        linha.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                abrir();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    if (typeof partners !== 'undefined' && partners.length) renderPartners();
});
