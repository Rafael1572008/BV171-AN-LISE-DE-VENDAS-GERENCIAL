console.log("Olá · index6 · Canal")

// ------------------------------------------------------------
// CONTEXTO DO CANAL
// ------------------------------------------------------------

function obterCanalSelecionado() {
    const args = window.top.dashboardArgs || {};

    const params = new URLSearchParams(window.location.search || '');

    return String(
        args.CANAL ||
        params.get('CANAL') ||
        'Distribuidores'
    ).trim();
}

function obterCanalSql() {
    return obterCanalSelecionado().replace(/'/g, "''");
}

// ------------------------------------------------------------
// QUERY 01 - KPI
// ------------------------------------------------------------

function montarQueryKPI() {
  const salesKpi = Dashboard.salesKpis.isSales(window.top.dashboardArgs.P_NEG);

    return `
WITH ATUAL AS (
    SELECT
        ${salesKpi ? Dashboard.salesKpis.select('FATURAMENTO') : `SUM(AMV.VLRTOTITEM) AS FATURAMENTO,
        SUM(AMV.VLRLIQ1)    AS M1,
        SUM(AMV.VLRLIQ2)    AS M2,
        SUM(AMV.MARGEM)     AS MARGEM`}

    FROM AD_MARGEM_VENDA AMV

    LEFT JOIN TGFCAB CAB 
        ON CAB.NUNOTA = AMV.NUNOTA

    LEFT JOIN TGFPAR PAR
        ON PAR.CODPARC = CAB.CODPARC
        
    LEFT JOIN TSICID CID
        ON CID.CODCID = PAR.CODCID
        
    LEFT JOIN TSIUFS UFS
        ON UFS.CODUF = CID.UF

    LEFT JOIN TSIREG REG
        ON REG.CODREG = PAR.CODREG

    LEFT JOIN TGFTPP TPP
        ON TPP.CODTIPPARC = PAR.CODTIPPARC

    LEFT JOIN TGFTPP TPP_PAI 
        ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND ${salesKpi ? Dashboard.salesKpis.movements : `AMV.TPMOV = ${window.top.dashboardArgs.P_NEG}`}
      AND DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_INI}' 
                   AND '${window.top.dashboardArgs.P_PERIODO_FIM}'
      AND ${salesKpi ? '1 = 1' : 'AMV.OPER NOT IN (1124, 1151, 2071)'}
      AND (UFS.UF = '${window.top.dashboardArgs.UF}' OR '${window.top.dashboardArgs.UF}' IS NULL)
      AND TPP_PAI.DESCRTIPPARC = '${obterCanalSql()}'
),

ANTERIOR AS (
    SELECT
        SUM(AMV.VLRTOTITEM) AS FATURAMENTO_ANTERIOR

    FROM AD_MARGEM_VENDA AMV

    LEFT JOIN TGFCAB CAB 
        ON CAB.NUNOTA = AMV.NUNOTA

    LEFT JOIN TGFPAR PAR
        ON PAR.CODPARC = CAB.CODPARC
        
    LEFT JOIN TSICID CID
        ON CID.CODCID = PAR.CODCID
        
    LEFT JOIN TSIUFS UFS
        ON UFS.CODUF = CID.UF

    LEFT JOIN TSIREG REG
        ON REG.CODREG = PAR.CODREG

    LEFT JOIN TGFTPP TPP
        ON TPP.CODTIPPARC = PAR.CODTIPPARC

    LEFT JOIN TGFTPP TPP_PAI 
        ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND AMV.TPMOV = ${window.top.dashboardArgs.P_NEG}
      AND DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_R_INI}' 
                   AND '${window.top.dashboardArgs.P_PERIODO_R_FIM}'
      AND AMV.OPER NOT IN (1124, 1151, 2071)
      AND (UFS.UF = '${window.top.dashboardArgs.UF}' OR '${window.top.dashboardArgs.UF}' IS NULL)
      AND TPP_PAI.DESCRTIPPARC = '${obterCanalSql()}'
)

SELECT
    A.FATURAMENTO,
    ANT.FATURAMENTO_ANTERIOR,
    A.M1,
    A.M2,
    A.MARGEM${salesKpi ? Dashboard.salesKpis.columns() : ""}

FROM ATUAL A
CROSS JOIN ANTERIOR ANT
`;
}




// ============================================================
// EXECUÇÃO - KPI
// ============================================================

function carregarKPIQuery() {

    const query = montarQueryKPI();

    console.log('========== QUERY KPI ==========');
    console.log(query);

    executeQuery(
        query,
        [],
        function(value) {

            console.log('========== RETORNO KPI ==========');
            console.log(value);

            const rows = JSON.parse(value);

            carregarKPI(rows);
            Dashboard.loading.done();
        },
        function(erro) {

            console.error('========== ERRO KPI ==========');
            console.error(erro);
            Dashboard.loading.done();

        }
    );
}



// ============================================================
// TRATAMENTO DO RETORNO - KPI
// ============================================================

function carregarKPI(rows) {
    if (Dashboard.salesKpis.render(rows && rows[0])) return;

    if (!rows || !rows.length) {
        console.warn('KPI: nenhuma linha retornada.');
        return;
    }

    const row = rows[0];

    const faturamento = Number(row.FATURAMENTO) || 0;
    const faturamentoAnterior = Number(row.FATURAMENTO_ANTERIOR) || 0;
    const m1 = Number(row.M1) || 0;
    const m2 = Number(row.M2) || 0;
    const margem = Number(row.MARGEM) || 0;

    const m1Pct = faturamento !== 0 ? (m1 / faturamento) * 100 : 0;
    const m2Pct = faturamento !== 0 ? (m2 / faturamento) * 100 : 0;
    const margemPct = m1 !== 0 ? (margem / m1) * 100 : 0;

    Dashboard.renderKPI('kpi-fat', {
        value: faturamento,
        ref: faturamentoAnterior,
        format: 'currency',
        ids: {
            value: 'kpi-fat',
            badge: 'kpi-fat-badge',
            ref: 'kpi-fat-ref'
        }
    });

    const elFat = document.getElementById('kpi-fat');
    const elFatRef = document.getElementById('kpi-fat-ref');
    if (elFat) elFat.textContent = Dashboard.fmt.mil(faturamento, 1);
    if (elFatRef) elFatRef.textContent = Dashboard.fmt.mil(faturamentoAnterior, 1);

    Dashboard.renderKPI('kpi-m1', {
        value: m1,
        percent: m1Pct,
        barPercent: m1Pct,
        ids: {
            value: 'kpi-m1',
            percent: 'kpi-m1-pct',
            bar: 'm1-bar'
        }
    });
    const elM1 = document.getElementById('kpi-m1');
    if (elM1) elM1.textContent = Dashboard.fmt.mil(m1, 1);

    Dashboard.renderKPI('kpi-m2', {
        value: m2,
        percent: m2Pct,
        barPercent: m2Pct,
        ids: {
            value: 'kpi-m2',
            percent: 'kpi-m2-pct',
            bar: 'm2-bar'
        }
    });
    const elM2 = document.getElementById('kpi-m2');
    if (elM2) elM2.textContent = Dashboard.fmt.mil(m2, 1);

    Dashboard.renderKPI('kpi-margin', {
        value: margem,
        barPercent: margemPct,
        ids: {
            value: 'kpi-margin',
            bar: null
        }
    });
    const elMargem = document.getElementById('kpi-margin');
    if (elMargem) elMargem.textContent = Dashboard.fmt.mil(margem, 1);

    const margemBar = document.querySelector('#kpi-margin + .sub + .kpi-bar-track .kpi-bar-fill');
    if (margemBar) {
        margemBar.style.width = Math.max(0, Math.min(margemPct, 100)) + '%';
    }

    const elM1pct = document.getElementById('kpi-m1-pct');
    const elM2pct = document.getElementById('kpi-m2-pct');
    if (elM1pct) elM1pct.textContent = Dashboard.fmt.pct(m1Pct, false, 2);
    if (elM2pct) elM2pct.textContent = Dashboard.fmt.pct(m2Pct, false, 2);

    console.log('KPI carregado (Dashboard):', {
        faturamento, faturamentoAnterior, m1, m2, margem, m1Pct, m2Pct, margemPct
    });
}

// ============================================================
// QUERY 02 - FATURAMENTO POR REGIÃO (agrupado por NOMEREG, filtro CANAL)
// ============================================================

function montarQueryRegioes() {

    return `
WITH MES_ATUAL AS (
    SELECT 
        REPLACE(REG.NOMEREG, '<SEM REGIAO>', 'OUTROS') AS REGIAO,
        SUM(AMV.VLRTOTITEM) AS FATURAMENTO
    FROM AD_MARGEM_VENDA AMV
        LEFT JOIN TGFCAB CAB 
            ON CAB.NUNOTA = AMV.NUNOTA
        LEFT JOIN TGFPAR PAR
            ON PAR.CODPARC = CAB.CODPARC
        LEFT JOIN TSICID CID
            ON CID.CODCID = PAR.CODCID
        LEFT JOIN TSIUFS UFS
            ON UFS.CODUF = CID.UF
        LEFT JOIN TGFTPP TPP
            ON TPP.CODTIPPARC = PAR.CODTIPPARC
        LEFT JOIN TGFTPP TPP_PAI 
            ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI
        LEFT JOIN TSIREG REG
            ON REG.CODREG = PAR.CODREG
    WHERE  1 = 1 ${Dashboard.filters.sql()} AND AMV.TPMOV = ${window.top.dashboardArgs.P_NEG}
      AND DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_INI}'
                   AND '${window.top.dashboardArgs.P_PERIODO_FIM}'
      AND AMV.OPER NOT IN (1124, 1151, 2071)
      AND (UFS.UF = '${window.top.dashboardArgs.UF}' OR '${window.top.dashboardArgs.UF}' IS NULL)
      AND TPP_PAI.DESCRTIPPARC = '${obterCanalSql()}'
    GROUP BY REPLACE(REG.NOMEREG, '<SEM REGIAO>', 'OUTROS')
),
MES_ANTERIOR AS (
    SELECT 
        REPLACE(REG.NOMEREG, '<SEM REGIAO>', 'OUTROS') AS REGIAO,
        SUM(AMV.VLRTOTITEM) AS FATURAMENTO_ANTERIOR
    FROM AD_MARGEM_VENDA AMV
        LEFT JOIN TGFCAB CAB 
            ON CAB.NUNOTA = AMV.NUNOTA
        LEFT JOIN TGFPAR PAR
            ON PAR.CODPARC = CAB.CODPARC
        LEFT JOIN TSICID CID
            ON CID.CODCID = PAR.CODCID
        LEFT JOIN TSIUFS UFS
            ON UFS.CODUF = CID.UF
        LEFT JOIN TGFTPP TPP
            ON TPP.CODTIPPARC = PAR.CODTIPPARC
        LEFT JOIN TGFTPP TPP_PAI 
            ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI
        LEFT JOIN TSIREG REG
            ON REG.CODREG = PAR.CODREG
    WHERE  1 = 1 ${Dashboard.filters.sql()} AND AMV.TPMOV = ${window.top.dashboardArgs.P_NEG}
      AND DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_R_INI}'
                   AND '${window.top.dashboardArgs.P_PERIODO_R_FIM}'
      AND AMV.OPER NOT IN (1124, 1151, 2071)
      AND (UFS.UF = '${window.top.dashboardArgs.UF}' OR '${window.top.dashboardArgs.UF}' IS NULL)
      AND TPP_PAI.DESCRTIPPARC = '${obterCanalSql()}'
    GROUP BY REPLACE(REG.NOMEREG, '<SEM REGIAO>', 'OUTROS')
)
SELECT 
    COALESCE(A.REGIAO, B.REGIAO) AS REGIAO,
    COALESCE(A.FATURAMENTO, 0) AS FATURAMENTO,
    COALESCE(B.FATURAMENTO_ANTERIOR, 0) AS FATURAMENTO_ANTERIOR,
    CASE 
        WHEN COALESCE(B.FATURAMENTO_ANTERIOR, 0) = 0 THEN 0
        ELSE ROUND(
            (
                (COALESCE(A.FATURAMENTO, 0) - B.FATURAMENTO_ANTERIOR)
                / B.FATURAMENTO_ANTERIOR
            ) * 100,
            2
        )
    END AS DELTA_REGIAO
FROM MES_ATUAL A
LEFT JOIN MES_ANTERIOR B
    ON B.REGIAO = A.REGIAO
ORDER BY FATURAMENTO DESC
`;
}


// ============================================================
// EXECUÇÃO - REGIÕES
// ============================================================

function carregarRegioesQuery() {

    const query = montarQueryRegioes();

    console.log('========== QUERY REGIÕES ==========');
    console.log(query);

    executeQuery(
        query,
        [],
        function(value) {

            console.log('========== RETORNO REGIÕES ==========');
            console.log(value);

            const rows = JSON.parse(value);
            carregarRegioes(rows);
            Dashboard.loading.done();
        },
        function(erro) {

            console.error('========== ERRO REGIÕES ==========');
            console.error(erro);
            Dashboard.loading.done();

        }
    );
}


// ============================================================
// TRATAMENTO DO RETORNO - REGIÕES
// ============================================================

function carregarRegioes(rows) {

    if (!rows || !rows.length) {
        console.warn('REGIÕES: nenhuma linha retornada.');
        return;
    }

    channels.length = 0;

    rows.forEach((row, index) => {
        const value = Number(row.FATURAMENTO) || 0;
        const ref = Number(row.FATURAMENTO_ANTERIOR) || 0;
        const delta = Number(row.DELTA_REGIAO) || 0;

        channels.push({
            name: row.REGIAO || 'Outros',
            value,
            ref,
            delta,
            color: channelColors[index] || '#3fae87'
        });
    });

    renderChannelChart();
    renderShareChart();

    console.log('Regiões carregadas:', channels);
}


// ============================================================
// QUERY 03 - TOP PARCEIROS (filtrado por CANAL)
// ============================================================

function montarQueryParceiros() {

    // TOTAL completo de TODOS os parceiros do canal (CTE TOTAIS),
    // independente do FETCH FIRST 10 da lista.
    return `
WITH ATUAL AS (
    SELECT
        PAR.CODPARC,
        PAR.NOMEPARC AS PARCEIRO,
        SUM(AMV.VLRTOTITEM) AS FATURAMENTO
    FROM AD_MARGEM_VENDA AMV
    LEFT JOIN TGFCAB CAB
        ON CAB.NUNOTA = AMV.NUNOTA
    LEFT JOIN TGFPAR PAR
        ON PAR.CODPARC = CAB.CODPARC
    LEFT JOIN TSICID CID
        ON CID.CODCID = PAR.CODCID
    LEFT JOIN TSIUFS UFS
        ON UFS.CODUF = CID.UF
    LEFT JOIN TGFTPP TPP
        ON TPP.CODTIPPARC = PAR.CODTIPPARC
    LEFT JOIN TGFTPP TPP_PAI
        ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI
    LEFT JOIN TSIREG REG
        ON REG.CODREG = PAR.CODREG
    WHERE  1 = 1 ${Dashboard.filters.sql()} AND AMV.TPMOV = ${window.top.dashboardArgs.P_NEG}
      AND AMV.DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_INI}'
                       AND '${window.top.dashboardArgs.P_PERIODO_FIM}'
      AND AMV.OPER NOT IN (1124, 1151, 2071)
      AND (UFS.UF = '${window.top.dashboardArgs.UF}' OR '${window.top.dashboardArgs.UF}' IS NULL)
      AND TPP_PAI.DESCRTIPPARC = '${obterCanalSql()}'
    GROUP BY PAR.CODPARC, PAR.NOMEPARC
),
ANTERIOR AS (
    SELECT
        PAR.CODPARC,
        SUM(AMV.VLRTOTITEM) AS FATURAMENTO_ANTERIOR
    FROM AD_MARGEM_VENDA AMV
    LEFT JOIN TGFCAB CAB
        ON CAB.NUNOTA = AMV.NUNOTA
    LEFT JOIN TGFPAR PAR
        ON PAR.CODPARC = CAB.CODPARC
    LEFT JOIN TSICID CID
        ON CID.CODCID = PAR.CODCID
    LEFT JOIN TSIUFS UFS
        ON UFS.CODUF = CID.UF
    LEFT JOIN TGFTPP TPP
        ON TPP.CODTIPPARC = PAR.CODTIPPARC
    LEFT JOIN TGFTPP TPP_PAI
        ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI
    LEFT JOIN TSIREG REG
        ON REG.CODREG = PAR.CODREG
    WHERE  1 = 1 ${Dashboard.filters.sql()} AND AMV.TPMOV = ${window.top.dashboardArgs.P_NEG}
      AND AMV.DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_R_INI}'
                       AND '${window.top.dashboardArgs.P_PERIODO_R_FIM}'
      AND AMV.OPER NOT IN (1124, 1151, 2071)
      AND (UFS.UF = '${window.top.dashboardArgs.UF}' OR '${window.top.dashboardArgs.UF}' IS NULL)
      AND TPP_PAI.DESCRTIPPARC = '${obterCanalSql()}'
    GROUP BY PAR.CODPARC
),
BASE AS (
    SELECT
        A.CODPARC,
        A.PARCEIRO,
        COALESCE(A.FATURAMENTO, 0) AS FATURAMENTO,
        COALESCE(ANT.FATURAMENTO_ANTERIOR, 0) AS FATURAMENTO_ANTERIOR,
        CASE
            WHEN COALESCE(ANT.FATURAMENTO_ANTERIOR, 0) = 0 THEN 0
            ELSE ROUND(
                (
                    (COALESCE(A.FATURAMENTO, 0) - ANT.FATURAMENTO_ANTERIOR)
                    / ANT.FATURAMENTO_ANTERIOR
                ) * 100,
                2
            )
        END AS DELTA_PARCEIRO
    FROM ATUAL A
    LEFT JOIN ANTERIOR ANT
        ON ANT.CODPARC = A.CODPARC
),
TOTAIS AS (
    SELECT
        SUM(FATURAMENTO) AS TOTAL_PARCEIROS,
        SUM(FATURAMENTO_ANTERIOR) AS TOTAL_PARCEIROS_ANTERIOR
    FROM BASE
)
SELECT
    B.CODPARC,
    B.PARCEIRO,
    B.FATURAMENTO,
    B.FATURAMENTO_ANTERIOR,
    B.DELTA_PARCEIRO,
    T.TOTAL_PARCEIROS,
    T.TOTAL_PARCEIROS_ANTERIOR
FROM BASE B
CROSS JOIN TOTAIS T
ORDER BY B.FATURAMENTO DESC
FETCH FIRST 10 ROWS ONLY
`;
}


// ============================================================
// EXECUÇÃO - TOP PARCEIROS
// ============================================================

function carregarParceirosQuery() {

    const query = montarQueryParceiros();

    console.log('========== QUERY TOP PARCEIROS ==========');
    console.log(query);

    executeQuery(
        query,
        [],
        function(value) {

            console.log('========== RETORNO TOP PARCEIROS ==========');
            console.log(value);

            const rows = JSON.parse(value);
            carregarParceiros(rows);
            Dashboard.loading.done();
        },
        function(erro) {

            console.error('========== ERRO TOP PARCEIROS ==========');
            console.error(erro);
            Dashboard.loading.done();

        }
    );
}


// ============================================================
// TRATAMENTO DO RETORNO - TOP PARCEIROS
// ============================================================

function carregarParceiros(rows) {

    if (!rows || !rows.length) {
        renderPartners([]);
        console.warn('TOP PARCEIROS: nenhuma linha retornada.');
        return;
    }

    const parceiros = rows.map(row => {
        const refRaw = Number(row.FATURAMENTO_ANTERIOR) || 0;
        const novo = refRaw === 0;
        return {
            codparc: row.CODPARC,
            name: row.PARCEIRO || 'Sem nome',
            value: Number(row.FATURAMENTO) || 0,
            ref: novo ? null : refRaw,
            delta: novo ? null : (Number(row.DELTA_PARCEIRO) || 0),
            novo: novo
        };
    });

    const total = {
        value: Number(rows[0].TOTAL_PARCEIROS) || 0,
        ref: Number(rows[0].TOTAL_PARCEIROS_ANTERIOR) || 0
    };
    total.delta = total.ref === 0 ? null : ((total.value - total.ref) / total.ref) * 100;

    renderPartners(parceiros, total);

    console.log('Top parceiros carregado:', parceiros);
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

function formatarPeriodoHeader(ini, fim) {
    const formatar = valor => {
        if (!valor) return '';
        const partes = String(valor).trim().split(/[ T]/)[0].split('-');
        if (partes.length !== 3) return String(valor);
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };
    return `${formatar(ini)} - ${formatar(fim)}`;
}

function atualizarCabecalhoContexto() {
    const args = window.top.dashboardArgs || {};
    const canal = obterCanalSelecionado();
    const uf = document.getElementById('breadcrumb-uf');
    const breadcrumb = document.getElementById('breadcrumb-canal');
    const periodo = document.getElementById('header-periodo');
    const referencia = document.getElementById('header-periodo-ref');

    if (uf) uf.textContent = args.UF || 'Todos os estados';
    if (breadcrumb) breadcrumb.textContent = canal;
    if (periodo) periodo.textContent = formatarPeriodoHeader(args.P_PERIODO_INI, args.P_PERIODO_FIM);
    if (referencia) referencia.textContent = formatarPeriodoHeader(args.P_PERIODO_R_INI, args.P_PERIODO_R_FIM);

    ['channel-region', 'partner-region'].forEach(function(id) {
        const element = document.getElementById(id);
        if (element) element.textContent = canal;
    });
}

document.addEventListener('DOMContentLoaded', function() {

    atualizarCabecalhoContexto();

    Dashboard.loading.start(3);

    carregarKPIQuery();
    carregarRegioesQuery();
    carregarParceirosQuery();

});
