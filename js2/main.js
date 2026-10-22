// ============================================================
// MAIN
// PONTO DE ENTRADA DA APLICAÇÃO
// ============================================================


// ============================================================
// QUERIES
// ============================================================

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

    LEFT JOIN TGFTPP TPP
        ON TPP.CODTIPPARC = PAR.CODTIPPARC

    LEFT JOIN TGFTPP TPP_PAI 
        ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND ${salesKpi ? Dashboard.salesKpis.movements : `TPMOV = ${window.top.dashboardArgs.P_NEG}`}
      AND DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_INI}' 
                   AND '${window.top.dashboardArgs.P_PERIODO_FIM}'
      AND ${salesKpi ? '1 = 1' : 'OPER NOT IN (1124, 1151, 2071)'}
      AND UFS.UF = '${window.top.dashboardArgs.UF}'
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

    LEFT JOIN TGFTPP TPP
        ON TPP.CODTIPPARC = PAR.CODTIPPARC

    LEFT JOIN TGFTPP TPP_PAI 
        ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND TPMOV = ${window.top.dashboardArgs.P_NEG}
      AND DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_R_INI}' 
                   AND '${window.top.dashboardArgs.P_PERIODO_R_FIM}'
      AND OPER NOT IN (1124, 1151, 2071)
      AND UFS.UF = '${window.top.dashboardArgs.UF}'
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

// ------------------------------------------------------------
// QUERY 02 - FATURAMENTO POR REGIÃO
// ------------------------------------------------------------

function montarQueryFaturamentoRegiao() {

    return `
WITH ATUAL AS (

    SELECT
        REG.NOMEREG AS REGIAO,
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

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND TPMOV = ${window.top.dashboardArgs.P_NEG}
      AND DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_INI}'
                   AND '${window.top.dashboardArgs.P_PERIODO_FIM}'
      AND OPER NOT IN (1124, 1151, 2071)
      AND UFS.UF = '${window.top.dashboardArgs.UF}'

    GROUP BY
        REG.NOMEREG
),

ANTERIOR AS (

    SELECT
        REG.NOMEREG AS REGIAO,
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

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND TPMOV = ${window.top.dashboardArgs.P_NEG}
      AND DTNF BETWEEN '${window.top.dashboardArgs.P_PERIODO_R_INI}'
                   AND '${window.top.dashboardArgs.P_PERIODO_R_FIM}'
      AND OPER NOT IN (1124, 1151, 2071)
      AND UFS.UF = '${window.top.dashboardArgs.UF}'

    GROUP BY
        REG.NOMEREG
),

TOTAL_ATUAL AS (

    SELECT
        SUM(FATURAMENTO) AS TOTAL_FATURAMENTO

    FROM ATUAL
)

SELECT
    A.REGIAO,

    A.FATURAMENTO,

    NVL(ANT.FATURAMENTO_ANTERIOR, 0) AS FATURAMENTO_ANTERIOR,

    CASE
        WHEN NVL(ANT.FATURAMENTO_ANTERIOR, 0) > 0
        THEN (
            (A.FATURAMENTO - ANT.FATURAMENTO_ANTERIOR)
            / ANT.FATURAMENTO_ANTERIOR
        ) * 100
        ELSE 0
    END AS DELTA_REGIAO

FROM ATUAL A

LEFT JOIN ANTERIOR ANT
    ON ANT.REGIAO = A.REGIAO

CROSS JOIN TOTAL_ATUAL T

ORDER BY
    A.FATURAMENTO DESC
`;
}

// ============================================================
// QUERY 03 - FATURAMENTO POR CANAL
// ============================================================

function montarQueryFaturamentoCanal() {
    return `
WITH MES_ATUAL AS (
    SELECT 
        TPP_PAI.DESCRTIPPARC AS CANAL,
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
      AND UFS.UF = '${window.top.dashboardArgs.UF}'
    GROUP BY TPP_PAI.DESCRTIPPARC
),
MES_ANTERIOR AS (
    SELECT 
        TPP_PAI.DESCRTIPPARC AS CANAL,
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
      AND UFS.UF = '${window.top.dashboardArgs.UF}'
    GROUP BY TPP_PAI.DESCRTIPPARC
)
SELECT 
    COALESCE(A.CANAL, B.CANAL) AS CANAL,
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
    END AS DELTA_CANAL
FROM MES_ATUAL A
LEFT JOIN MES_ANTERIOR B
    ON B.CANAL = A.CANAL
ORDER BY FATURAMENTO DESC
`;
}

// ============================================================
// QUERY 04 - TOP PARCEIROS
// ============================================================

function montarQueryTopParceiros() {

    /*
     * IMPORTANTE:
     * Esta regra vale SOMENTE para a tabela Top Parceiros.
     *
     * Um parceiro filial pode possuir CODPARCMATRIZ apontando para sua matriz.
     * Portanto, o ranking precisa trabalhar com a chave da matriz, e não com
     * PAR.CODPARC isoladamente. Assim:
     *
     *   - matriz sem filial -> a própria matriz é a chave;
     *   - filial -> a CODPARCMATRIZ é a chave;
     *   - matriz + filiais -> todo o faturamento é consolidado em uma única linha.
     *
     * O filtro de UF continua sendo aplicado ao parceiro que efetivamente
     * participou da venda (PAR da nota), preservando a lógica da visão por UF.
     */

    return `
WITH ATUAL AS (

    SELECT
        COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) AS CODPARC,
        COALESCE(PAR_MATRIZ.NOMEPARC, PAR.NOMEPARC) AS PARCEIRO,
        SUM(AMV.VLRTOTITEM) AS FATURAMENTO

    FROM AD_MARGEM_VENDA AMV

    LEFT JOIN TGFCAB CAB
        ON CAB.NUNOTA = AMV.NUNOTA

    LEFT JOIN TGFPAR PAR
        ON PAR.CODPARC = CAB.CODPARC

    LEFT JOIN TGFPAR PAR_MATRIZ
        ON PAR_MATRIZ.CODPARC = COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC)

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
      AND UFS.UF = '${window.top.dashboardArgs.UF}'

    GROUP BY
        COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC),
        COALESCE(PAR_MATRIZ.NOMEPARC, PAR.NOMEPARC)
),

ANTERIOR AS (

    SELECT
        COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC) AS CODPARC,
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
      AND UFS.UF = '${window.top.dashboardArgs.UF}'

    GROUP BY
        COALESCE(PAR.CODPARCMATRIZ, PAR.CODPARC)
),

TODOS_PARCEIROS AS (

    SELECT CODPARC FROM ATUAL

    UNION

    SELECT CODPARC FROM ANTERIOR

)

SELECT

    P.CODPARC,

    COALESCE(
        A.PARCEIRO,
        PAR_MATRIZ.NOMEPARC,
        'Parceiro não informado'
    ) AS PARCEIRO,

    COALESCE(
        A.FATURAMENTO,
        0
    ) AS FATURAMENTO,

    COALESCE(
        B.FATURAMENTO_ANTERIOR,
        0
    ) AS FATURAMENTO_ANTERIOR,

    CASE

        WHEN COALESCE(B.FATURAMENTO_ANTERIOR, 0) = 0 THEN 0

        ELSE ROUND(
            (
                (
                    COALESCE(A.FATURAMENTO, 0)
                    -
                    B.FATURAMENTO_ANTERIOR
                )
                /
                B.FATURAMENTO_ANTERIOR
            ) * 100,
            2
        )

    END AS DELTA_PARCEIRO

FROM TODOS_PARCEIROS P

LEFT JOIN ATUAL A
    ON A.CODPARC = P.CODPARC

LEFT JOIN ANTERIOR B
    ON B.CODPARC = P.CODPARC

LEFT JOIN TGFPAR PAR_MATRIZ
    ON PAR_MATRIZ.CODPARC = P.CODPARC

ORDER BY
    COALESCE(A.FATURAMENTO, 0) DESC
`;
}

// ------------------------------------------------------------
// EXECUÇÃO - KPI
// ------------------------------------------------------------

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

function carregarDadosRegiao(rows) {

    console.log('========== CARREGANDO DADOS REGIÃO ==========');
    console.log(rows);

    if (!rows || !rows.length) {
        console.warn('Nenhum dado retornado para região.');
        return;
    }

    // ========================================================
    // LIMPA OS ARRAYS DO CONFIG.JS
    // ========================================================

    regiaoLabels.length = 0;
    regiaoValores.length = 0;
    regiaoReferenciais.length = 0;
    regiaoDeltas.length = 0;


    // ========================================================
    // CARREGA DADOS DA QUERY
    // ========================================================

    rows.forEach(function(row) {

        const regiao =
            row.REGIAO || 'Sem região';

        const atual =
            Number(row.FATURAMENTO) || 0;

        const anterior =
            Number(row.FATURAMENTO_ANTERIOR) || 0;

        const delta =
            Number(row.DELTA_REGIAO) || 0;


        regiaoLabels.push(regiao);

        regiaoValores.push(atual);

        regiaoReferenciais.push(anterior);

        regiaoDeltas.push(delta);

    });


    // ========================================================
    // CALCULA TOTAL
    // ========================================================

    const totalAtual =
        regiaoValores.reduce(function(total, valor) {
            return total + valor;
        }, 0);

    const totalAnterior =
        regiaoReferenciais.reduce(function(total, valor) {
            return total + valor;
        }, 0);

    const totalDelta =
        totalAnterior > 0
            ? ((totalAtual - totalAnterior) / totalAnterior) * 100
            : 0;


    // ========================================================
    // ATUALIZA OBJETO TOTAL
    // ========================================================

    regiaoTotal.nome = 'Total';

    regiaoTotal.sub =
        'Faturamento total por região';

    regiaoTotal.valor =
        totalAtual;

    regiaoTotal.ref =
        totalAnterior;

    regiaoTotal.delta =
        totalDelta;


    // ========================================================
    // DEBUG
    // ========================================================

    console.log('========== REGIÃO PROCESSADA ==========');

    console.log('Labels:', regiaoLabels);
    console.log('Valores:', regiaoValores);
    console.log('Referenciais:', regiaoReferenciais);
    console.log('Deltas:', regiaoDeltas);
    console.log('Total:', regiaoTotal);


    // ========================================================
    // ATUALIZA GRÁFICO
    // ========================================================

    atualizarGraficoRegiao();
    renderTotalRow(
        'regiao-total',
        regiaoTotal.nome,
        regiaoTotal.sub,
        regiaoTotal.valor,
        regiaoTotal.ref,
        regiaoTotal.delta
    );
}

function carregarDadosCanal(rows) {

    console.log('========== CARREGANDO DADOS CANAL ==========');
    console.log(rows);

    if (!rows || !rows.length) {

        console.warn(
            'Nenhum dado retornado para canal.'
        );

        return;
    }

    // ========================================================
    // LIMPA OS ARRAYS
    // ========================================================

    canalLabels.length = 0;
    canalValores.length = 0;
    canalReferenciais.length = 0;
    canalDeltas.length = 0;


    // ========================================================
    // CARREGA DADOS DA QUERY
    // ========================================================

    rows.forEach(function(row) {

        const canal =
            row.CANAL || 'Sem canal';

        const atual =
            Number(row.FATURAMENTO) || 0;

        const anterior =
            Number(row.FATURAMENTO_ANTERIOR) || 0;

        const delta =
            Number(row.DELTA_CANAL) || 0;


        canalLabels.push(canal);

        canalValores.push(atual);

        canalReferenciais.push(anterior);

        canalDeltas.push(delta);

    });


    // ========================================================
    // TOTAL
    // ========================================================

    const totalAtual =
        canalValores.reduce(function(total, valor) {
            return total + valor;
        }, 0);


    const totalAnterior =
        canalReferenciais.reduce(function(total, valor) {
            return total + valor;
        }, 0);


    const totalDelta =
        totalAnterior > 0
            ? ((totalAtual - totalAnterior) / totalAnterior) * 100
            : 0;


    // ========================================================
    // ATUALIZA OBJETO TOTAL
    // ========================================================

    canalTotal.nome =
        'Total';

    canalTotal.sub =
        'Faturamento total por canal';

    canalTotal.valor =
        totalAtual;

    canalTotal.ref =
        totalAnterior;

    canalTotal.delta =
        totalDelta;


    // ========================================================
    // DEBUG
    // ========================================================

    console.log(
        '========== ARRAYS CANAL =========='
    );

    console.log(
        'Labels:',
        canalLabels
    );

    console.log(
        'Valores:',
        canalValores
    );

    console.log(
        'Referenciais:',
        canalReferenciais
    );

    console.log(
        'Deltas:',
        canalDeltas
    );

    console.log(
        'Total:',
        canalTotal
    );


    // ========================================================
    // ATUALIZA GRÁFICO
    // ========================================================

    atualizarGraficoCanal();


    // ========================================================
    // ATUALIZA TOTALIZADOR
    // ========================================================

    renderTotalRow(
        'canal-total',
        canalTotal.nome,
        canalTotal.sub,
        canalTotal.valor,
        canalTotal.ref,
        canalTotal.delta
    );
}

// ============================================================
// CARREGA DADOS DOS TOP PARCEIROS
// ============================================================

function carregarDadosParceiros(rows) {

    console.log(
        '========== CARREGANDO TOP PARCEIROS =========='
    );

    console.log(rows);

    if (!rows || !rows.length) {

        console.warn(
            'Nenhum dado retornado para parceiros.'
        );

        return;
    }


    // ========================================================
    // TODOS OS PARCEIROS
    // ========================================================

    const todosParceiros = rows.map(function(row) {

        const valor =
            Number(row.FATURAMENTO) || 0;

        const refBanco =
            Number(row.FATURAMENTO_ANTERIOR) || 0;

        const ref =
            refBanco > 0
                ? refBanco
                : null;

        const delta =
            ref !== null
                ? Number(row.DELTA_PARCEIRO) || 0
                : null;

        return {

            codparc:
                row.CODPARC,

            nome:
                row.PARCEIRO || 'Parceiro não informado',

            valor:
                valor,

            ref:
                ref,

            delta:
                delta

        };

    });


    // ========================================================
    // TOTAL GERAL
    // ========================================================

    const totalAtual =
        todosParceiros.reduce(function(total, parceiro) {

            return total + parceiro.valor;

        }, 0);


    const totalAnterior =
        todosParceiros.reduce(function(total, parceiro) {

            return total +
                (parceiro.ref !== null
                    ? parceiro.ref
                    : 0);

        }, 0);


    const totalDelta =
        totalAnterior > 0
            ? (
                (totalAtual - totalAnterior)
                / totalAnterior
            ) * 100
            : 0;


    totalParceiros.valor =
        totalAtual;

    totalParceiros.ref =
        totalAnterior;

    totalParceiros.delta =
        totalDelta;


    // ========================================================
    // TOP 10
    // ========================================================

    parceiros.length = 0;

    todosParceiros
        .sort(function(a, b) {

            return b.valor - a.valor;

        })
        .slice(0, 10)
        .forEach(function(parceiro) {

            parceiros.push(parceiro);

        });


    // ========================================================
    // DEBUG
    // ========================================================

    console.log(
        '========== TOP 10 PARCEIROS =========='
    );

    console.log(parceiros);

    console.log(
        '========== TOTAL GERAL PARCEIROS =========='
    );

    console.log(totalParceiros);


    // ========================================================
    // RENDER
    // ========================================================

    renderParceiros();

    renderTotalParceiros();
}

// ------------------------------------------------------------
// EXECUÇÃO - FATURAMENTO POR REGIÃO
// ------------------------------------------------------------

function carregarFaturamentoRegiaoQuery() {

    const query = montarQueryFaturamentoRegiao();

    console.log('========== QUERY FATURAMENTO POR REGIÃO ==========');
    console.log(query);

    executeQuery(
        query,
        [],
        function(value) {

            console.log('========== RETORNO FATURAMENTO POR REGIÃO ==========');
            console.log(value);

            const rows = JSON.parse(value);

            carregarDadosRegiao(rows);
            Dashboard.loading.done();

        },
        function(erro) {

            console.error(
                '========== ERRO FATURAMENTO POR REGIÃO =========='
            );

            console.error(erro);
            Dashboard.loading.done();
        }
    );
}

// ------------------------------------------------------------
// EXECUÇÃO - FATURAMENTO POR CANAL
// ------------------------------------------------------------

function carregarFaturamentoCanalQuery() {

    const query =
        montarQueryFaturamentoCanal();


    console.log(
        '========== QUERY FATURAMENTO POR CANAL =========='
    );

    console.log(query);

    canalLabels.length = 0;
    canalValores.length = 0;
    canalReferenciais.length = 0;
    canalDeltas.length = 0;

    executeQuery(
        query,
        [],
        function(value) {

            console.log(
                '========== RETORNO FATURAMENTO POR CANAL =========='
            );

            console.log(value);


            const rows =
                JSON.parse(value);


            carregarDadosCanal(rows);
            Dashboard.loading.done();

        },
        function(erro) {

            console.error(
                '========== ERRO FATURAMENTO POR CANAL =========='
            );

            console.error(erro);
            Dashboard.loading.done();

        }
    );
}



function carregarKPI(rows) {
    if (Dashboard.salesKpis.render(rows && rows[0])) return;

    const r = rows && rows.length ? rows[0] : {};

    const faturamento = Number(r.FATURAMENTO) || 0;
    const faturamentoAnterior = Number(r.FATURAMENTO_ANTERIOR) || 0;
    const m1 = Number(r.M1) || 0;
    const m2 = Number(r.M2) || 0;
    const margem = Number(r.MARGEM) || 0;

    const m1Percent = faturamento > 0 ? (m1 / faturamento) * 100 : 0;
    const m2Percent = faturamento > 0 ? (m2 / faturamento) * 100 : 0;
    const margemPercent = m1 > 0 ? (margem / m1) * 100 : 0;

    Dashboard.renderKPIs({
        'kpi-faturamento': {
            value: faturamento,
            ref: faturamentoAnterior
        },
        'kpi-m1': {
            value: m1,
            percent: m1Percent,
            barPercent: m1Percent
        },
        'kpi-m2': {
            value: m2,
            percent: m2Percent,
            barPercent: m2Percent
        },
        'kpi-margem': {
            value: margem,
            barPercent: margemPercent,
            ids: {
                badge: 'kpi-margem-badge',
                bar: 'kpi-margem-bar'
            }
        }
    });

    // Badge da margem mostra % sobre M1 (não variação YoY)
    const badgeMargem = document.getElementById('kpi-margem-badge');
    if (badgeMargem) {
        badgeMargem.textContent = typeof formatarPercentual === 'function'
            ? formatarPercentual(margemPercent)
            : Dashboard.fmt.pct(margemPercent, false, 2);
        badgeMargem.classList.remove('up', 'down', 'neutral');
        badgeMargem.classList.add('up');
    }

    console.log('========== KPIs ATUALIZADOS (Dashboard) ==========');
    console.log({
        faturamento,
        faturamentoAnterior,
        m1,
        m1Percent,
        m2,
        m2Percent,
        margem,
        margemPercent
    });
}


// ============================================================
// EXECUÇÃO - TOP PARCEIROS
// ============================================================

function carregarTopParceirosQuery() {

    const query =
        montarQueryTopParceiros();


    console.log(
        '========== QUERY TOP PARCEIROS =========='
    );

    console.log(query);


    executeQuery(
        query,
        [],
        function(value) {

            console.log(
                '========== RETORNO TOP PARCEIROS =========='
            );

            console.log(value);


            const rows =
                JSON.parse(value);


            carregarDadosParceiros(rows);
            Dashboard.loading.done();

        },
        function(erro) {

            console.error(
                '========== ERRO TOP PARCEIROS =========='
            );

            console.error(erro);
            Dashboard.loading.done();

        }
    );
}




// ============================================================
// INICIALIZAÇÃO
// ============================================================

function inicializarDashboard() {

    Dashboard.loading.start(4);

    inicializarFormatacao();

    inicializarGraficos();

    inicializarParceiros();

    // QUERY 01 - KPI
    carregarKPIQuery();

    // QUERY 02 - Faturamento por Região
    carregarFaturamentoRegiaoQuery();

    // QUERY 03 - Faturamento por Canal
    carregarFaturamentoCanalQuery();

    // QUERY 04 - Top Parceiros
    carregarTopParceirosQuery();
}




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
    const uf = document.getElementById('breadcrumb-uf');
    const regiao = document.getElementById('breadcrumb-regiao');
    const periodo = document.getElementById('header-periodo');
    const referencia = document.getElementById('header-periodo-ref');

    if (uf) uf.textContent = args.UF || '';
    document.querySelectorAll('.header-uf-label').forEach(function(element) {
        element.textContent = args.UF || '';
    });
    const periodUf = document.getElementById('period-uf');
    if (periodUf) periodUf.textContent = args.UF || '';
    if (regiao) regiao.textContent = args.REGIAO || 'Todas as regiões';
    if (periodo) periodo.textContent = formatarPeriodoHeader(args.P_PERIODO_INI, args.P_PERIODO_FIM);
    if (referencia) referencia.textContent = formatarPeriodoHeader(args.P_PERIODO_R_INI, args.P_PERIODO_R_FIM);
}

// ------------------------------------------------------------
// Aguarda o DOM estar pronto
// ------------------------------------------------------------

if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        function() {
            atualizarCabecalhoContexto();
            inicializarDashboard();
        }
    );

} else {

    atualizarCabecalhoContexto();
    inicializarDashboard();

}