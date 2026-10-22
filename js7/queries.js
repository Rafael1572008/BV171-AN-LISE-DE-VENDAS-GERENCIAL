/**
 * BV171 · builders de queries SQL (index7 · parceiro no contexto de canal)
 *
 * Filtros: UF + CANAL + CODPARC (matriz).
 * Mesma regra de matriz do index4/index5.
 */
(function (global) {
  'use strict';

  var U = global.BV.utils;

  function selectedPartner() {
    var candidates = [
      U.arg('CODPARC', ''),
      U.arg('P_CODPARC', ''),
      U.arg('CODPARCMATRIZ', '')
    ];
    for (var i = 0; i < candidates.length; i++) {
      var codStr = String(candidates[i] || '').trim();
      if (/^\d+$/.test(codStr) && Number(codStr) > 0) return codStr;
    }
    return '';
  }

  function movementType() {
    var neg = String(U.arg('P_NEG', 'V')).trim()
      .replace(/^['"]+|['"]+$/g, '')
      .trim()
      .toUpperCase();
    return /^[VCS]$/.test(neg) ? neg : 'V';
  }

  function matrixCte() {
    var cod = selectedPartner();
    if (!cod) {
      return "MATRIZ AS (SELECT CAST(NULL AS NUMBER) AS CODPARCMATRIZ FROM DUAL)";
    }
    return (
      "MATRIZ AS (\n" +
      "      SELECT COALESCE(PAR2.CODPARCMATRIZ, PAR2.CODPARC) AS CODPARCMATRIZ\n" +
      "      FROM TGFPAR PAR2\n" +
      "      WHERE PAR2.CODPARC = " + cod + "\n" +
      "    )"
    );
  }

  function filterUf(alias) {
    if (alias === undefined) alias = 'UFS';
    var uf = U.arg('UF', '');
    if (!uf || /^todos os estados$/i.test(uf)) return '';
    return " AND " + alias + ".UF = '" + U.sql(uf) + "'";
  }

  function filterCanal() {
    var canal = U.arg('CANAL', '');
    if (!canal) return '';
    return " AND TPP_PAI.DESCRTIPPARC = '" + U.sql(canal) + "'";
  }

  function filterParceiro(alias) {
    if (alias === undefined) alias = 'PAR';
    if (!selectedPartner()) return ' AND 1 = 0';
    return ' AND COALESCE(' + alias + '.CODPARCMATRIZ, ' + alias + '.CODPARC) = MTZ.CODPARCMATRIZ';
  }

  function joinsParceiroCanal() {
    return (
      "      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC\n" +
      "      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID\n" +
      "      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF\n" +
      "      LEFT JOIN TGFTPP TPP ON TPP.CODTIPPARC = PAR.CODTIPPARC\n" +
      "      LEFT JOIN TGFTPP TPP_PAI ON TPP_PAI.CODTIPPARC = TPP.CODTIPPARCPAI\n" +
      "      CROSS JOIN MATRIZ MTZ"
    );
  }

  function baseWhere(ini, fim) {
    return (
      "AMV.TPMOV = '" + movementType() + "'" +
      Dashboard.filters.sql() + "\n      AND AMV.DTNF BETWEEN '" + U.sql(ini) + "' AND '" + U.sql(fim) + "'" +
      "\n      AND AMV.OPER NOT IN (1124,1151,2071)" +
      "\n      " + filterUf('UFS') +
      "\n      " + filterCanal() +
      "\n      " + filterParceiro('PAR')
    );
  }

  function qKpi() {
    var salesKpi = Dashboard.salesKpis.isSales(U.arg('P_NEG', ''));
    function kpiWhere(ini, fim) {
      var where = baseWhere(ini, fim);
      return salesKpi ? where.replace(/AMV\.TPMOV = '[VCS]'/, Dashboard.salesKpis.movements)
        .replace(/AMV\.OPER NOT IN \(1124,1151,2071\)/, '1 = 1') : where;
    }
    var atual =
      "SELECT\n" +
      (salesKpi ? Dashboard.salesKpis.select('FAT') + '\n' : (
      "        SUM(AMV.VLRTOTITEM) FAT,\n" +
      "        SUM(AMV.VLRLIQ1) M1,\n" +
      "        SUM(AMV.VLRLIQ2) M2,\n" +
      "        SUM(AMV.MARGEM) MARGEM\n")) +
      "      FROM AD_MARGEM_VENDA AMV\n" +
      "      LEFT JOIN TGFCAB CAB ON CAB.NUNOTA = AMV.NUNOTA\n" +
      joinsParceiroCanal() + "\n" +
      "      WHERE " + kpiWhere(U.arg('P_PERIODO_INI', ''), U.arg('P_PERIODO_FIM', ''));

    var ref =
      "SELECT SUM(AMV.VLRTOTITEM) FATREF\n" +
      "      FROM AD_MARGEM_VENDA AMV\n" +
      "      LEFT JOIN TGFCAB CAB ON CAB.NUNOTA = AMV.NUNOTA\n" +
      joinsParceiroCanal() + "\n" +
      "      WHERE " + baseWhere(U.arg('P_PERIODO_R_INI', ''), U.arg('P_PERIODO_R_FIM', ''));

    return (
      "WITH " + matrixCte() + ",\n" +
      "    A AS (" + atual + "),\n" +
      "    R AS (" + ref + ")\n" +
      "    SELECT A.*, R.FATREF\n" +
      "    FROM A\n" +
      "    CROSS JOIN R"
    );
  }

  function qProducts() {
    var atual =
      "SELECT\n" +
      "        AMV.CODPROD,\n" +
      "        PRO.DESCRPROD AS DESCRPROD,\n" +
      "        SUM(AMV.QTDNEG) AS CAIXAS,\n" +
      "        SUM(AMV.VLRTOTITEM) AS VALOR,\n" +
      "        SUM(AMV.VLRLIQ1) AS M1,\n" +
      "        SUM(AMV.MARGEM) AS MARGEM\n" +
      "      FROM AD_MARGEM_VENDA AMV\n" +
      "      LEFT JOIN TGFCAB CAB ON CAB.NUNOTA = AMV.NUNOTA\n" +
      "      LEFT JOIN TGFPRO PRO ON PRO.CODPROD = AMV.CODPROD\n" +
      joinsParceiroCanal() + "\n" +
      "      WHERE " + baseWhere(U.arg('P_PERIODO_INI', ''), U.arg('P_PERIODO_FIM', '')) + "\n" +
      "      GROUP BY AMV.CODPROD, PRO.DESCRPROD";

    var anterior =
      "SELECT\n" +
      "        AMV.CODPROD,\n" +
      "        SUM(AMV.QTDNEG) AS CAIXASREF,\n" +
      "        SUM(AMV.VLRTOTITEM) AS VALORREF\n" +
      "      FROM AD_MARGEM_VENDA AMV\n" +
      "      LEFT JOIN TGFCAB CAB ON CAB.NUNOTA = AMV.NUNOTA\n" +
      joinsParceiroCanal() + "\n" +
      "      WHERE " + baseWhere(U.arg('P_PERIODO_R_INI', ''), U.arg('P_PERIODO_R_FIM', '')) + "\n" +
      "      GROUP BY AMV.CODPROD";

    return (
      "WITH " + matrixCte() + ",\n" +
      "    ATUAL AS (" + atual + "),\n" +
      "    ANTERIOR AS (" + anterior + ")\n" +
      "    SELECT\n" +
      "      A.CODPROD,\n" +
      "      A.DESCRPROD,\n" +
      "      A.CAIXAS,\n" +
      "      A.VALOR,\n" +
      "      ROUND((A.VALOR / NULLIF(SUM(A.VALOR) OVER (), 0)) * 100, 2) AS PERC_VALOR,\n" +
      "      CASE WHEN A.CAIXAS = 0 THEN 0 ELSE A.VALOR / A.CAIXAS END AS VALORUNIT,\n" +
      "      COALESCE(P.CAIXASREF, 0) AS CAIXASREF,\n" +
      "      COALESCE(P.VALORREF, 0) AS VALORREF,\n" +
      "      CASE WHEN COALESCE(P.CAIXASREF, 0) = 0 THEN 0 ELSE P.VALORREF / P.CAIXASREF END AS VALORUNITREF,\n" +
      "      A.VALOR - COALESCE(P.VALORREF, 0) AS VARIACAO,\n" +
      "      CASE WHEN COALESCE(P.VALORREF, 0) = 0 THEN 0 ELSE ((A.VALOR - P.VALORREF) / P.VALORREF) * 100 END AS VARIACAOPCT,\n" +
      "      A.M1,\n" +
      "      A.MARGEM,\n" +
      "      CASE WHEN A.M1 = 0 THEN 0 ELSE (A.MARGEM / A.M1) * 100 END AS MARGEMPCT\n" +
      "    FROM ATUAL A\n" +
      "    LEFT JOIN ANTERIOR P ON P.CODPROD = A.CODPROD\n" +
      "    ORDER BY A.VALOR DESC"
    );
  }

  global.BV = global.BV || {};
  global.BV.queries = {
    filterUf: filterUf,
    filterCanal: filterCanal,
    filterParceiro: filterParceiro,
    baseWhere: baseWhere,
    qKpi: qKpi,
    qProducts: qProducts
  };
})(window);
