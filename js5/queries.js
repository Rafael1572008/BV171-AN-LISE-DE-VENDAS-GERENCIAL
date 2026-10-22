/**
 * BV171 · builders de queries SQL
 *
 * Dependência: BV.utils
 *
 * Regra de parceiro/matriz:
 * - O parâmetro CODPARC pode apontar para um parceiro filial ou para a própria matriz.
 * - Primeiro descobrimos a matriz do parceiro selecionado.
 * - Depois todos os dados são filtrados pela matriz, permitindo que filiais e a matriz
 *   participem dos mesmos indicadores.
 *
 * Regra de período referencial:
 * - Produtos que aparecem somente no período atual devem ser retornados.
 * - Produtos que aparecem somente no período referencial também devem ser retornados.
 * - A lista final de produtos é formada pela união dos produtos dos dois períodos.
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

      if (/^\d+$/.test(codStr) && Number(codStr) > 0) {
        return codStr;
      }

    }

    return '';
  }


  function movementType() {

    var neg = String(U.arg('P_NEG', 'V')).trim();

    // P_NEG historicamente chega como 'V';
    // alguns drill-downs podem serializá-lo.
    neg = neg
      .replace(/^['"]+|['"]+$/g, '')
      .trim()
      .toUpperCase();

    return /^[VCS]$/.test(neg) ? neg : 'V';
  }


  function matrixCte() {

    var cod = selectedPartner();

    // Sem parceiro, não cria um CROSS JOIN vazio.
    // A query continua executável e o filtro de parceiro
    // abaixo decide se deve ou não retornar registros.
    if (!cod) {

      return "MATRIZ AS (" +
        "SELECT CAST(NULL AS NUMBER) AS CODPARCMATRIZ FROM DUAL" +
        ")";

    }

    return "MATRIZ AS (\n" +
      "      SELECT COALESCE(PAR2.CODPARCMATRIZ, PAR2.CODPARC) AS CODPARCMATRIZ\n" +
      "      FROM TGFPAR PAR2\n" +
      "      WHERE PAR2.CODPARC = " + cod + "\n" +
      "    )";
  }


  function filterUf(alias) {

    if (alias === undefined) {
      alias = 'UFS';
    }

    var uf = U.arg('UF', '');

    if (!uf || /^todos os estados$/i.test(uf)) {
      return '';
    }

    return " AND " + alias + ".UF = '" + U.sql(uf) + "'";
  }


  function filterParceiro(alias) {

    if (alias === undefined) {
      alias = 'PAR';
    }

    if (!selectedPartner()) {
      return ' AND 1 = 0';
    }

    return ' AND COALESCE(' +
      alias +
      '.CODPARCMATRIZ, ' +
      alias +
      '.CODPARC) = MTZ.CODPARCMATRIZ';
  }


  function baseWhere(ini, fim) {

    var mov = "AMV.TPMOV = '" + movementType() + "'";

    return mov +
      Dashboard.filters.sql() + "\n      AND AMV.DTNF BETWEEN '" +
      U.sql(ini) +
      "' AND '" +
      U.sql(fim) +
      "'" +

      "\n      AND AMV.OPER NOT IN (1124,1151,2071)" +

      "\n      " +
      filterUf('UFS') +

      "\n      " +
      filterParceiro('PAR');
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
      "      CROSS JOIN MATRIZ MTZ\n" +
      "      WHERE " +
      kpiWhere(
        U.arg('P_PERIODO_INI', ''),
        U.arg('P_PERIODO_FIM', '')
      );


    var ref =
      "SELECT SUM(AMV.VLRTOTITEM) FATREF\n" +
      "      FROM AD_MARGEM_VENDA AMV\n" +
      "      LEFT JOIN TGFCAB CAB ON CAB.NUNOTA = AMV.NUNOTA\n" +
      "      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC\n" +
      "      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID\n" +
      "      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF\n" +
      "      CROSS JOIN MATRIZ MTZ\n" +
      "      WHERE " +
      baseWhere(
        U.arg('P_PERIODO_R_INI', ''),
        U.arg('P_PERIODO_R_FIM', '')
      );


    return (
      "WITH " +
      matrixCte() +
      ",\n" +

      "    A AS (" +
      atual +
      "),\n" +

      "    R AS (" +
      ref +
      ")\n" +

      "    SELECT A.*, R.FATREF\n" +
      "    FROM A\n" +
      "    CROSS JOIN R"
    );
  }


  function qProducts() {

    /*
     * ============================================================
     * PERÍODO ATUAL
     * ============================================================
     */

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

      "      CROSS JOIN MATRIZ MTZ\n" +

      "      WHERE 1 = 1" + Dashboard.filters.sql() + " AND AMV.TPMOV = '" +
      movementType() +
      "'\n" +

      "        AND AMV.DTNF BETWEEN '" +
      U.sql(U.arg('P_PERIODO_INI', '')) +
      "' AND '" +
      U.sql(U.arg('P_PERIODO_FIM', '')) +
      "'\n" +

      "        AND AMV.OPER NOT IN (1124, 1151, 2071)\n" +

      "        " +
      filterParceiro('PAR') +

      "\n        " +
      filterUf('UFS') +

      "\n      GROUP BY AMV.CODPROD, PRO.DESCRPROD";


    /*
     * ============================================================
     * PERÍODO REFERENCIAL
     * ============================================================
     */

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

      "      CROSS JOIN MATRIZ MTZ\n" +

      "      WHERE 1 = 1" + Dashboard.filters.sql() + " AND AMV.TPMOV = '" +
      movementType() +
      "'\n" +

      "        AND AMV.DTNF BETWEEN '" +
      U.sql(U.arg('P_PERIODO_R_INI', '')) +
      "' AND '" +
      U.sql(U.arg('P_PERIODO_R_FIM', '')) +
      "'\n" +

      "        AND AMV.OPER NOT IN (1124, 1151, 2071)\n" +

      "        " +
      filterParceiro('PAR') +

      "\n        " +
      filterUf('UFS') +

      "\n      GROUP BY AMV.CODPROD";


    /*
     * ============================================================
     * CORREÇÃO PRINCIPAL
     * ============================================================
     *
     * Antes:
     *
     *   FROM ATUAL A
     *   LEFT JOIN ANTERIOR P
     *
     * Isso fazia com que a lista de produtos fosse determinada
     * exclusivamente pelo período atual.
     *
     * Agora:
     *
     *   PRODUTOS = ATUAL UNION ANTERIOR
     *
     * Assim:
     *
     *   Produto somente no atual       -> aparece
     *   Produto somente no referencial -> aparece
     *   Produto nos dois períodos      -> aparece
     *
     */

    return (

      "WITH " +
      matrixCte() +
      ",\n" +

      "    ATUAL AS (" +
      atual +
      "),\n" +

      "    ANTERIOR AS (" +
      anterior +
      "),\n" +

      "    PRODUTOS AS (\n" +

      "      SELECT CODPROD\n" +
      "      FROM ATUAL\n" +

      "      UNION\n" +

      "      SELECT CODPROD\n" +
      "      FROM ANTERIOR\n" +

      "    )\n" +

      "    SELECT\n" +

      "      PR.CODPROD,\n" +

      "      PRO.DESCRPROD AS DESCRPROD,\n" +

      "      COALESCE(A.CAIXAS, 0) AS CAIXAS,\n" +

      "      COALESCE(A.VALOR, 0) AS VALOR,\n" +

      "      ROUND(\n" +
      "        (\n" +
      "          COALESCE(A.VALOR, 0) /\n" +
      "          NULLIF(SUM(COALESCE(A.VALOR, 0)) OVER (), 0)\n" +
      "        ) * 100,\n" +
      "        2\n" +
      "      ) AS PERC_VALOR,\n" +

      "      CASE\n" +
      "        WHEN COALESCE(A.CAIXAS, 0) = 0 THEN 0\n" +
      "        ELSE A.VALOR / A.CAIXAS\n" +
      "      END AS VALORUNIT,\n" +

      "      COALESCE(P.CAIXASREF, 0) AS CAIXASREF,\n" +

      "      COALESCE(P.VALORREF, 0) AS VALORREF,\n" +

      "      CASE\n" +
      "        WHEN COALESCE(P.CAIXASREF, 0) = 0 THEN 0\n" +
      "        ELSE P.VALORREF / P.CAIXASREF\n" +
      "      END AS VALORUNITREF,\n" +

      "      COALESCE(A.VALOR, 0) -\n" +
      "      COALESCE(P.VALORREF, 0) AS VARIACAO,\n" +

      "      CASE\n" +
      "        WHEN COALESCE(P.VALORREF, 0) = 0 THEN 0\n" +
      "        ELSE (\n" +
      "          (\n" +
      "            COALESCE(A.VALOR, 0) - P.VALORREF\n" +
      "          ) / P.VALORREF\n" +
      "        ) * 100\n" +
      "      END AS VARIACAOPCT,\n" +

      "      COALESCE(A.M1, 0) AS M1,\n" +

      "      COALESCE(A.MARGEM, 0) AS MARGEM,\n" +

      "      CASE\n" +
      "        WHEN COALESCE(A.M1, 0) = 0 THEN 0\n" +
      "        ELSE (A.MARGEM / A.M1) * 100\n" +
      "      END AS MARGEMPCT\n" +

      "    FROM PRODUTOS PR\n" +

      "    LEFT JOIN ATUAL A\n" +
      "      ON A.CODPROD = PR.CODPROD\n" +

      "    LEFT JOIN ANTERIOR P\n" +
      "      ON P.CODPROD = PR.CODPROD\n" +

      "    LEFT JOIN TGFPRO PRO\n" +
      "      ON PRO.CODPROD = PR.CODPROD\n" +

      "    ORDER BY COALESCE(A.VALOR, 0) DESC"

    );
  }


  /*
   * ==============================================================
   * EXPOSIÇÃO DAS QUERIES
   * ==============================================================
   */

  global.BV = global.BV || {};

  global.BV.queries = {

    filterUf: filterUf,

    filterParceiro: filterParceiro,

    baseWhere: baseWhere,

    qKpi: qKpi,

    qProducts: qProducts

  };

})(window);
