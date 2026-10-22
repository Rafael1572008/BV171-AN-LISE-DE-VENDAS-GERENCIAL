// ============================================================
// FORMATAÇÃO E COMPONENTES VISUAIS
// ============================================================

// ------------------------------------------------------------
// Data/hora do rodapé
// ------------------------------------------------------------

function atualizarDataRodape() {
    const agora = new Date();

    const data = agora.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const hora = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const footer = document.getElementById('footer-updated');

    if (footer) {
        footer.textContent = `Atualizado em ${data} às ${hora}`;
    }
}

// ------------------------------------------------------------
// Barras dos KPIs
// ------------------------------------------------------------

function animarBarrasKPI() {
    requestAnimationFrame(() => {
        document.querySelectorAll('.kpi-bar-fill').forEach((el) => {
            const width = el.getAttribute('data-width');

            requestAnimationFrame(() => {
                el.style.width = `${width}%`;
            });
        });
    });
}

// ------------------------------------------------------------
// Classe da medalha/ranking
// ------------------------------------------------------------

function medalClass(index) {
    if (index === 0) return 'm1';
    if (index === 1) return 'm2';
    if (index === 2) return 'm3';

    return 'm4';
}

// ------------------------------------------------------------
// Badge de variação
// ------------------------------------------------------------

function renderDeltaBadge(delta) {
    if (delta === null || delta === undefined) {
        return '<span class="delta-badge novo">Novo</span>';
    }

    const classe = delta >= 0 ? 'up' : 'down';
    const seta = delta >= 0 ? String.fromCharCode(9650) : String.fromCharCode(9660); //AQUI

    return `
        <span class="delta-badge ${classe}">
            ${seta} ${fmtPct(Math.abs(delta), false)}
        </span>
    `;
}

// ------------------------------------------------------------
// Referencial do parceiro
// ------------------------------------------------------------

function renderReferencia(ref) {
    if (ref === null || ref === undefined) {
        return `
            <span class="na">
                não comparável
            </span>
        `;
    }

    return `
        <div class="v">${fmtBRL(ref)}</div>
        <div class="l">Referencial</div>
    `;
}

// ------------------------------------------------------------
// Linha de total
// ------------------------------------------------------------

function renderTotalRow(
    containerId,
    nome,
    sub,
    valor,
    ref,
    delta
) {
    const container = document.getElementById(containerId);

    if (!container) return;

    const classeDelta = delta >= 0 ? 'up' : 'down';
    const seta = delta >= 0 ? String.fromCharCode(9650) : String.fromCharCode(9660);

    container.innerHTML = `
        <div class="partner-row total-row">

            <div class="p-rank total">
                Σ
            </div>

            <div class="p-name-block">
                <div class="p-name">
                    ${nome}
                </div>

                <div class="p-name-sub">
                    ${sub}
                </div>
            </div>

            <div class="p-val">
                <div class="v">
                    ${fmtBRL(valor)}
                </div>
                <div class="l">
                    Valor
                </div>
            </div>

            <div class="p-ref">
                <div class="v">
                    ${fmtBRL(ref)}
                </div>
                <div class="l">
                    Referencial
                </div>
            </div>

            <div class="p-delta">
                <span class="delta-badge ${classeDelta}">
                    ${seta} ${fmtPct(Math.abs(delta), false)}
                </span>
            </div>

        </div>
    `;
}

// ------------------------------------------------------------
// Inicialização das formatações
// ------------------------------------------------------------

function inicializarFormatacao() {
    atualizarDataRodape();
    animarBarrasKPI();
}

function formatarMoeda(valor) {

    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

}


function formatarPercentual(valor) {

    return Number(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' %';

}

function formatarVariacao(valor) {

    const numero = Number(valor) || 0;

    const percentual = Math.abs(numero).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    if (numero > 0) {
        return String.fromCharCode(9650) + ' ' + percentual + '%';
    }

    if (numero < 0) {
        return String.fromCharCode(9660) + ' ' + percentual + '%';
    }

    return '—';
}