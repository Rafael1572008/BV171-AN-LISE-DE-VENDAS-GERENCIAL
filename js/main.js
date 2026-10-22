// ============================================================
// QUERIES DO PAINEL
// ============================================================

// ------------------------------------------------------------
// Conversão de datas
// Entrada: "2026-08-01 00:00:00.0" (ou similar)
// Saída:   "01/08/2026"
// ------------------------------------------------------------
function formatarDataSQL(dataStr) {
  if (!dataStr) return null;

  // pega só a parte "YYYY-MM-DD" antes do espaço
  var soData = dataStr.trim().split(' ')[0];
  var partes = soData.split('-'); // [YYYY, MM, DD]

  if (partes.length !== 3) {
    console.warn('Data em formato inesperado:', dataStr);
    return null;
  }

  var ano = partes[0];
  var mes = partes[1];
  var dia = partes[2];

  return dia + '/' + mes + '/' + ano;
}

// Datas do período (globais, já convertidas)
var dashboardArgs = window.top.dashboardArgs || {};
var P_PERIODO_INI   = formatarDataSQL(dashboardArgs.P_PERIODO_INI);
var P_PERIODO_FIM   = formatarDataSQL(dashboardArgs.P_PERIODO_FIM);
var P_PERIODO_R_INI = formatarDataSQL(dashboardArgs.P_PERIODO_R_INI);
var P_PERIODO_R_FIM = formatarDataSQL(dashboardArgs.P_PERIODO_R_FIM);

console.log('Datas convertidas para SQL:');
console.log('P_PERIODO:   ', P_PERIODO_INI, '-', P_PERIODO_FIM);
console.log('P_PERIODO_R: ', P_PERIODO_R_INI, '-', P_PERIODO_R_FIM);


// ------------------------------------------------------------
// Filtro de tipo de negócio (Venda / Bonificação / Devolução)
// Entrada: window.P_NEG = "'V', 'B'" (string com letras entre aspas)
// Tipos possíveis: V, B, D
// ------------------------------------------------------------

// condição SQL correspondente a cada tipo de negócio
var CONDICAO_POR_TIPO_NEGOCIO = {
  V: "(TPMOV = 'V' AND OPER NOT IN (1124, 1151, 2071))", // venda, exclui bonificação
  B: "(TPMOV = 'V' AND OPER IN (1124, 1151, 2071))",     // bonificação
  D: "(TPMOV = 'D')",                                    // devolução
  F: "(TPMOV = 'F')"                                     // Despesas diversas
};

// extrai as letras V/B/D/F de dentro da string, ignorando aspas/espaços/vírgulas
function parseTiposNegocio(str) {
  if (!str) return ['V'];

  var letras = str.match(/[VBDF]/g);

  if (!letras || letras.length === 0) {
    console.warn('P_NEG em formato inesperado:', str);
    return ['V'];
  }

  // remove duplicados
  return letras.filter((tipo, i) => letras.indexOf(tipo) === i);
}

// monta a condição final, unindo os tipos selecionados com OR
function montarFiltroNegocio() {
  var tipos = parseTiposNegocio(window.P_NEG);

  var condicoes = tipos
    .map(tipo => CONDICAO_POR_TIPO_NEGOCIO[tipo])
    .filter(Boolean);

  if (condicoes.length === 0) {
    condicoes = [CONDICAO_POR_TIPO_NEGOCIO.V];
  }

  return '(' + condicoes.join(' OR ') + ')';
}

var FILTRO_NEGOCIO = montarFiltroNegocio();

console.log('Tipos de negócio selecionados:', parseTiposNegocio(window.P_NEG));
console.log('Filtro de negócio SQL:', FILTRO_NEGOCIO);


// ------------------------------------------------------------
// 1. KPIs — retorna apenas 1 linha
// ------------------------------------------------------------
function montarQueryKPI() {
  const salesKpi = Dashboard.salesKpis.isSales(window.P_NEG);
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

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND ${salesKpi ? Dashboard.salesKpis.movements : FILTRO_NEGOCIO}
      AND DTNF BETWEEN '${P_PERIODO_INI}' AND '${P_PERIODO_FIM}'
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

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND ${FILTRO_NEGOCIO}
      AND DTNF BETWEEN '${P_PERIODO_R_INI}' AND '${P_PERIODO_R_FIM}'
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
// 2. FATURAMENTO POR CANAL
// ------------------------------------------------------------
function montarQueryCanal() {
  return `
WITH ATUAL AS (
    SELECT
        TPP_PAI.DESCRTIPPARC AS CANAL,
        SUM(AMV.VLRTOTITEM) AS VLRTOTITEM

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

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND ${FILTRO_NEGOCIO}
      AND AMV.DTNF BETWEEN '${P_PERIODO_INI}' AND '${P_PERIODO_FIM}'

    GROUP BY TPP_PAI.DESCRTIPPARC
),

ANTERIOR AS (
    SELECT
        TPP_PAI.DESCRTIPPARC AS CANAL,
        SUM(AMV.VLRTOTITEM) AS VLRTOTITEM_ANTERIOR

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

    WHERE  1 = 1 ${Dashboard.filters.sql()} AND ${FILTRO_NEGOCIO}
      AND AMV.DTNF BETWEEN '${P_PERIODO_R_INI}' AND '${P_PERIODO_R_FIM}'

    GROUP BY TPP_PAI.DESCRTIPPARC
)

SELECT
    COALESCE(A.CANAL, ANT.CANAL) AS CANAL,

    COALESCE(A.VLRTOTITEM, 0) AS VLRTOTITEM,

    COALESCE(ANT.VLRTOTITEM_ANTERIOR, 0) AS VLRTOTITEM_ANTERIOR,

    COALESCE(
        ROUND(
            (A.VLRTOTITEM - ANT.VLRTOTITEM_ANTERIOR)
            / NULLIF(ANT.VLRTOTITEM_ANTERIOR, 0) * 100,
            2
        ),
        0
    ) AS VARIACAO_PERC

FROM ATUAL A

FULL OUTER JOIN ANTERIOR ANT
    ON ANT.CANAL = A.CANAL
`;
}


// ------------------------------------------------------------
// 3. FATURAMENTO POR UF — MAPA
// ------------------------------------------------------------
function montarQueryMapa() {
  return `
SELECT 
    UFS.UF,
    SUM(AMV.VLRTOTITEM) AS VLRTOTITEM

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

WHERE  1 = 1 ${Dashboard.filters.sql()} AND ${FILTRO_NEGOCIO}
  AND DTNF BETWEEN '${P_PERIODO_INI}' AND '${P_PERIODO_FIM}'

GROUP BY UFS.UF
`;
}


// ------------------------------------------------------------
// 4. FATURAMENTO POR UF — RANKING
// ------------------------------------------------------------
function montarQueryRanking() {
  return `
SELECT 
    UFS.UF,
    SUM(AMV.VLRTOTITEM) AS VLRTOTITEM

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

WHERE  1 = 1 ${Dashboard.filters.sql()} AND ${FILTRO_NEGOCIO}
  AND DTNF BETWEEN '${P_PERIODO_INI}' AND '${P_PERIODO_FIM}'

GROUP BY UFS.UF

ORDER BY SUM(AMV.VLRTOTITEM) DESC
`;
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

    if (periodo) periodo.textContent = formatarPeriodoHeader(args.P_PERIODO_INI, args.P_PERIODO_FIM);
    if (referencia) referencia.textContent = formatarPeriodoHeader(args.P_PERIODO_R_INI, args.P_PERIODO_R_FIM);
}

document.addEventListener('DOMContentLoaded', () => {
    atualizarCabecalhoContexto();
    atualizarRodape();
    Dashboard.loading.start(4);
    carregarTodasAsQueries();
});

// ---------------- carga via executeQuery ----------------
function carregarTodasAsQueries() {

  executeQuery(montarQueryKPI(), [], function (value) {

    const linhasKPI = JSON.parse(value);

    console.log('FAT_KPI:', linhasKPI);

    carregarKPI(linhasKPI);
    Dashboard.loading.done();

    carregarCanalQuery();

  }, function (value) {

    // showToast('Erro na query de KPI: ' + value, 'err');
    Dashboard.loading.done(4);

  });

}

function abrirAnaliseEstado(uf) {

    window.top.dashboardArgs = {
        UF: uf,
        P_PERIODO_R_INI: P_PERIODO_R_INI,
        P_PERIODO_R_FIM: P_PERIODO_R_FIM,
        P_PERIODO_INI: P_PERIODO_INI,
        P_PERIODO_FIM: P_PERIODO_FIM,
        P_NEG: window.P_NEG
    };

    console.log("DASHBOARD ARGS:", window.top.dashboardArgs);

    openLevel("03I", {
        UF: uf
    });
}


function carregarCanalQuery() {

  executeQuery(montarQueryCanal(), [], function (value) {

    const linhasCanal = JSON.parse(value);

    console.log('FAT_CANAL:', linhasCanal);

    carregarCanal(linhasCanal);
    Dashboard.loading.done();

    carregarMapaQuery();

  }, function (value) {

    showToast('Erro na query de Canal: ' + value, 'err');
    Dashboard.loading.done(3);

  });

}

function carregarMapaQuery() {

  executeQuery(montarQueryMapa(), [], function (value) {

    const linhasMapa = JSON.parse(value);

    console.log('FAT_MAPA:', linhasMapa);

    carregarMapa(linhasMapa);
    Dashboard.loading.done();

    carregarRankingQuery();

  }, function (value) {

    showToast('Erro na query de Mapa: ' + value, 'err');
    Dashboard.loading.done(2);

  });

}

function carregarRankingQuery() {

  executeQuery(montarQueryRanking(), [], function (value) {

    const linhasRanking = JSON.parse(value);

    console.log('FAT_RANKING:', linhasRanking);

    carregarRanking(linhasRanking);
    Dashboard.loading.done();

  }, function (value) {

    showToast('Erro na query de Ranking: ' + value, 'err');
    Dashboard.loading.done();

  });

}

// agrega as linhas da query e redesenha todo o painel

// ---------------- KPIs do cabeçalho ----------------
function renderKPIs() {
  // index.jsp: IDs específicos (*-valor, *-sub-pct, barras em .bar-fill)
  Dashboard.renderKPI('kpi-faturamento', {
    value: totais.faturamento,
    ref: totais.faturamentoAnterior,
    ids: {
      value: 'kpi-faturamento-valor',
      badge: 'kpi-faturamento-badge',
      ref: 'kpi-faturamento-ref'
    }
  });
  // KPIs exibem valores integrais
  setText('kpi-faturamento-valor', fmtBRL(totais.faturamento));
  setText('kpi-faturamento-ref', 'Ref.: ' + fmtBRL(totais.faturamentoAnterior));

  const faturamentoVar =
    totais.faturamentoAnterior > 0
      ? (totais.faturamento / totais.faturamentoAnterior * 100 - 100)
      : 0;
  setText('kpi-faturamento-sub-pct', fmtPct(faturamentoVar));

  Dashboard.renderKPI('kpi-m1', {
    value: totais.m1,
    percent: totais.m1PctFat,
    barPercent: totais.m1PctFat,
    ids: {
      value: 'kpi-m1-valor',
      percent: 'kpi-m1-sub-pct',
      bar: 'kpi-m1-bar'
    }
  });
  setText('kpi-m1-valor', fmtBRL(totais.m1));
  setText('kpi-m1-badge', fmtPct(totais.m1PctFat));
  setText('kpi-m1-sub-pct', fmtPct(totais.m1PctFat));
  setBarWidth('kpi-m1-bar', totais.m1PctFat);

  Dashboard.renderKPI('kpi-m2', {
    value: totais.m2,
    percent: totais.m2PctFat,
    barPercent: totais.m2PctFat,
    ids: {
      value: 'kpi-m2-valor',
      percent: 'kpi-m2-sub-pct',
      bar: 'kpi-m2-bar'
    }
  });
  setText('kpi-m2-valor', fmtBRL(totais.m2));
  setText('kpi-m2-badge', fmtPct(totais.m2PctFat));
  setText('kpi-m2-sub-pct', fmtPct(totais.m2PctFat));
  setBarWidth('kpi-m2-bar', totais.m2PctFat);

  Dashboard.renderKPI('kpi-margem', {
    value: totais.margem,
    percent: totais.margemPctFat,
    barPercent: totais.margemPctFat,
    ids: {
      value: 'kpi-margem-valor',
      badge: 'kpi-margem-badge',
      percent: 'kpi-margem-sub-pct',
      bar: 'kpi-margem-bar'
    }
  });
  setText('kpi-margem-valor', fmtBRL(totais.margem));
  // O gadget no topo continua representando Margem / M1.
  setText('kpi-margem-badge', fmtPct(totais.margemPctM1));
  // A barra/subtítulo representam Margem / Faturamento.
  setText('kpi-margem-sub-pct', fmtPct(totais.margemPctFat));
  setBarWidth('kpi-margem-bar', totais.margemPctFat);

  // total geral do ranking
  setText('rank-total-valor', fmtBRL(totais.faturamento));
  setText('rank-total-pct', '100,00%');
  setText('rank-uf-count', listaCompleta.length + ' UFs');
}

function setText(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function setBarWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = Math.min(Math.max(pct, 0), 100) + '%';
}

// ---------------- rodapé: data/hora de atualização ----------------
function atualizarRodape() {
  const footerEl = document.getElementById('footer-updated');
  if (footerEl) {
    footerEl.textContent =
      'Atualizado em ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' - ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}