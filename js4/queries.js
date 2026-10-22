/**
 * BV171 · builders de queries SQL
 * Dependência: BV.utils
 *
 * Regra de parceiro/matriz:
 * - O parâmetro CODPARC pode apontar para um parceiro filial ou para a própria matriz.
 * - Primeiro descobrimos a matriz do parceiro selecionado.
 * - Depois todos os dados são filtrados pela matriz, permitindo que filiais e a matriz
 *   participem dos mesmos indicadores.
 */
(function (global) {
  'use strict';

  var U = global.BV.utils;

  function selectedPartner() {
    var cod = U.args.CODPARC ?? U.args.codparc ?? U.params.get('CODPARC') ?? U.params.get('codparc') ?? '';
    var codStr = String(cod).trim();
    return /^\d+$/.test(codStr) ? codStr : '';
  }

  function matrixCte() {
    var cod = selectedPartner();
    // Mantém o mesmo comportamento de segurança da versão anterior quando não há parceiro.
    var value = cod || '0';
    return "MATRIZ AS (\n" +
      "      SELECT COALESCE(PAR2.CODPARCMATRIZ, PAR2.CODPARC) AS CODPARCMATRIZ\n" +
      "      FROM TGFPAR PAR2\n" +
      "      WHERE PAR2.CODPARC = " + value + "\n" +
      "    )";
  }

  function filterUf(alias) {
    if (alias === undefined) alias = 'UFS';
    var uf = U.arg('UF', '');
    if (!uf || /^todos os estados$/i.test(uf)) return '';
    return " AND " + alias + ".UF = '" + U.sql(uf) + "'";
  }


  function filterRegiao(alias) {
    if (alias === undefined) alias = 'REG';
    var regiao = U.arg('REGIAO', '');
    if (!regiao || /^todas as regiões$/i.test(regiao)) return '';
    return " AND REPLACE(" + alias + ".NOMEREG, '<SEM REGIAO>', 'OUTROS') = '" + U.sql(regiao) + "'";
  }

  function filterParceiro(alias) {
    if (alias === undefined) alias = 'PAR';
    if (!selectedPartner()) return ' AND 1 = 0';
    return ' AND COALESCE(' + alias + '.CODPARCMATRIZ, ' + alias + '.CODPARC) = MTZ.CODPARCMATRIZ';
  }

  function baseWhere(ini, fim) {
    var neg = U.arg('P_NEG', '');
    var mov = neg !== '' && /^[VCS]$/i.test(neg)
      ? "AMV.TPMOV = '" + U.sql(neg.toUpperCase()) + "'"
      : "AMV.TPMOV = 'V'";

    return mov +
      Dashboard.filters.sql() + "\n      AND AMV.DTNF BETWEEN '" + U.sql(ini) + "' AND '" + U.sql(fim) + "'" +
      "\n      AND AMV.OPER NOT IN (1124,1151,2071)" +
      "\n      " + filterUf('UFS') +
      "\n      " + filterRegiao('REG') +
      "\n      " + filterParceiro('PAR');
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
      "      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC\n" +
      "      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID\n" +
      "      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF\n" +
      "      LEFT JOIN TSIREG REG ON REG.CODREG = PAR.CODREG\n" +
      "      CROSS JOIN MATRIZ MTZ\n" +
      "      WHERE " + kpiWhere(U.arg('P_PERIODO_INI', ''), U.arg('P_PERIODO_FIM', ''));

    var ref =
      "SELECT SUM(AMV.VLRTOTITEM) FATREF\n" +
      "      FROM AD_MARGEM_VENDA AMV\n" +
      "      LEFT JOIN TGFCAB CAB ON CAB.NUNOTA = AMV.NUNOTA\n" +
      "      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC\n" +
      "      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID\n" +
      "      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF\n" +
      "      LEFT JOIN TSIREG REG ON REG.CODREG = PAR.CODREG\n" +
      "      CROSS JOIN MATRIZ MTZ\n" +
      "      WHERE " + baseWhere(U.arg('P_PERIODO_R_INI', ''), U.arg('P_PERIODO_R_FIM', ''));

    return "WITH " + matrixCte() + ",\n    A AS (" + atual + "),\n    R AS (" + ref + ")\n    SELECT A.*, R.FATREF\n    FROM A\n    CROSS JOIN R";
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
      "      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC\n" +
      "      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID\n" +
      "      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF\n" +
      "      LEFT JOIN TSIREG REG ON REG.CODREG = PAR.CODREG\n" +
      "      CROSS JOIN MATRIZ MTZ\n" +
      "      WHERE 1 = 1" + Dashboard.filters.sql() + " AND AMV.TPMOV = 'V'\n" +
      "        AND AMV.DTNF BETWEEN '" + U.sql(U.arg('P_PERIODO_INI', '')) + "' AND '" + U.sql(U.arg('P_PERIODO_FIM', '')) + "'\n" +
      "        AND AMV.OPER NOT IN (1124, 1151, 2071)\n" +
      "        " + filterParceiro('PAR') + "\n" +
      "        " + filterUf('UFS') + "\n" +
      "        " + filterRegiao('REG') + "\n" +
      "      GROUP BY AMV.CODPROD, PRO.DESCRPROD";

    var anterior =
      "SELECT\n" +
      "        AMV.CODPROD,\n" +
      "        SUM(AMV.QTDNEG) AS CAIXASREF,\n" +
      "        SUM(AMV.VLRTOTITEM) AS VALORREF\n" +
      "      FROM AD_MARGEM_VENDA AMV\n" +
      "      LEFT JOIN TGFCAB CAB ON CAB.NUNOTA = AMV.NUNOTA\n" +
      "      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC\n" +
      "      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID\n" +
      "      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF\n" +
      "      LEFT JOIN TSIREG REG ON REG.CODREG = PAR.CODREG\n" +
      "      CROSS JOIN MATRIZ MTZ\n" +
      "      WHERE 1 = 1" + Dashboard.filters.sql() + " AND AMV.TPMOV = 'V'\n" +
      "        AND AMV.DTNF BETWEEN '" + U.sql(U.arg('P_PERIODO_R_INI', '')) + "' AND '" + U.sql(U.arg('P_PERIODO_R_FIM', '')) + "'\n" +
      "        AND AMV.OPER NOT IN (1124, 1151, 2071)\n" +
      "        " + filterParceiro('PAR') + "\n" +
      "        " + filterUf('UFS') + "\n" +
      "        " + filterRegiao('REG') + "\n" +
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
    filterRegiao: filterRegiao,
    filterParceiro: filterParceiro,
    baseWhere: baseWhere,
    qKpi: qKpi,
    qProducts: qProducts
  };
})(window);
