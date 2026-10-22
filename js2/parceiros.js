// ============================================================
// PARCEIROS — wrappers sobre Dashboard.renderPartnersTable
// ============================================================

function _mapParceirosItems() {
    return (parceiros || []).map(function (p) {
        return {
            name: p.nome || p.name || 'Sem nome',
            value: p.valor != null ? p.valor : p.value,
            ref: p.ref,
            delta: p.delta
        };
    });
}

function _limparArgDrill(value) {
    var v = String(value == null ? '' : value).trim();
    for (var i = 0; i < 5; i++) {
        if (!v) break;
        var next = v;
        try {
            var parsed = JSON.parse(next);
            if (typeof parsed === 'string') next = parsed.trim();
        } catch (e) {}
        if (next.length >= 2 && next[0] === '"' && next[next.length - 1] === '"') {
            next = next.slice(1, -1).trim();
        }
        next = next.replace(/\\"/g, '"');
        if (next === v) break;
        v = next;
    }
    return v;
}

function abrirProdutosParceiroEstado(parceiro) {
    if (!parceiro || parceiro.codparc == null) return;

    var argsAtuais = window.top.dashboardArgs || {};
    var novosArgs = Object.assign({}, argsAtuais);

    // Reconstroi somente os argumentos de contexto, removendo serializações
    // acumuladas antes de enviá-los ao próximo nível.
    ['UF', 'P_PERIODO_R_INI', 'P_PERIODO_R_FIM', 'P_PERIODO_INI', 'P_PERIODO_FIM', 'P_NEG'].forEach(function (chave) {
        if (novosArgs[chave] != null) novosArgs[chave] = _limparArgDrill(novosArgs[chave]);
    });

    novosArgs.UF = novosArgs.UF || '';
    novosArgs.REGIAO = '';
    novosArgs.CODPARC = String(parceiro.codparc);
    novosArgs.PARCEIRO = _limparArgDrill(parceiro.nome || parceiro.name || 'Parceiro selecionado');

    window.top.dashboardArgs = novosArgs;

    console.log('DASHBOARD ARGS · PRODUTOS · ESTADO:', novosArgs);

    if (typeof openLevel === 'function') {
        // Passa um objeto novo e limpo para impedir o acúmulo de JSON/escape.
        openLevel('02W', Object.assign({}, novosArgs));
    }
}

function vincularCliqueParceirosEstado() {
    var linhas = document.querySelectorAll('#partners-list .partner-row');
    Array.prototype.forEach.call(linhas, function (linha, index) {
        if (linha.dataset.bv171Drill === '1') return;

        var parceiro = parceiros[index];
        if (!parceiro || parceiro.codparc == null) return;

        linha.dataset.bv171Drill = '1';
        linha.classList.add('drill-clickable');
        linha.setAttribute('role', 'button');
        linha.setAttribute('tabindex', '0');
        linha.title = 'Clique para ver os produtos deste parceiro no estado';

        var abrir = function () { abrirProdutosParceiroEstado(parceiro); };
        linha.addEventListener('click', abrir);
        linha.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                abrir();
            }
        });
    });
}

function renderParceiros() {
    Dashboard.renderPartnersTable('partners-list', {
        items: _mapParceirosItems(),
        limit: 10,
        valueFormat: 'currency'
    });

    vincularCliqueParceirosEstado();
}

function renderTotalParceiros() {
    // Re-render lista + total de uma vez (API unificada)
    Dashboard.renderPartnersTable('partners-list', {
        items: _mapParceirosItems(),
        limit: 10,
        valueFormat: 'currency',
        totalContainerId: 'partners-total',
        totalLabel: 'Total dos parceiros',
        totalSub: 'Base: todos os parceiros ativos no período',
        total: {
            value: totalParceiros.valor,
            ref: totalParceiros.ref,
            delta: totalParceiros.delta
        }
    });

    vincularCliqueParceirosEstado();
}


function inicializarParceiros() {
    renderTotalParceiros();
}
