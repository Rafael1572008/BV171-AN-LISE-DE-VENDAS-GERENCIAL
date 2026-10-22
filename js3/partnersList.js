/**
 * partnersList.js
 * Ranking de parceiros + drill-down para o nível de produtos (04I).
 */
function abrirProdutosParceiro(parceiro) {
    const args = window.top.dashboardArgs || {};
    // Mantém TODOS os filtros recebidos do nível anterior (períodos, negociação, UF, região etc.)
    // e acrescenta apenas o parceiro selecionado para o drill-down.
    window.top.dashboardArgs = Object.assign({}, args, {
        UF: args.UF || null,
        REGIAO: args.REGIAO || window.dashboardRegion || null,
        CODPARC: parceiro.codparc,
        PARCEIRO: parceiro.name || 'Parceiro selecionado'
    });

    console.log('DASHBOARD ARGS · PRODUTOS:', window.top.dashboardArgs);

    if (typeof openLevel === 'function') {
        openLevel('03K', Object.assign({}, window.top.dashboardArgs, {
            UF: window.top.dashboardArgs.UF,
            REGIAO: window.top.dashboardArgs.REGIAO,
            CODPARC: parceiro.codparc,
            PARCEIRO: parceiro.name || 'Parceiro selecionado'
        }));
    }
}

function renderPartners(rows) {
    const data = rows || (typeof partners !== 'undefined' ? partners : []);

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
        totalSub: 'Base: Top parceiros do período'
    });

    // O componente padronizado não conhece a navegação do projeto;
    // ligamos cada linha ao CODPARC retornado pela query.
    const linhas = document.querySelectorAll('#partners-list .partner-row');
    Array.prototype.forEach.call(linhas, function (linha, index) {
        const parceiro = data[index];
        if (!parceiro || parceiro.codparc == null) return;
        linha.classList.add('drill-clickable');
        linha.setAttribute('role', 'button');
        linha.setAttribute('tabindex', '0');
        linha.title = 'Clique para ver os produtos deste parceiro';
        const abrir = function () { abrirProdutosParceiro(parceiro); };
        linha.addEventListener('click', abrir);
        linha.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abrir(); }
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    if (typeof partners !== 'undefined' && partners.length) renderPartners();
});
