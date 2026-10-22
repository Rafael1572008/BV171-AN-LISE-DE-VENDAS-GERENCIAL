// ============================================================
// dados.js — agregação dos dados vindos da query (1) do Sankhya
// (a query devolve uma linha por item: VLRTOTITEM, VLRLIQ1,
//  VLRLIQ2, MARGEM, UF, CANAL — aqui agregamos por UF e por canal)
// ============================================================

// nomes completos das 27 UFs (usado no ranking e no tooltip do mapa)
const nomesUF = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins"
};

// ---------------- estado global (preenchido por agregarDados) ----------------
let totais = {
  faturamento: 0,   // SUM(VLRTOTITEM)
  faturamentoAnterior: 0, //SUM(VLRTOTITEM_ANTERIOR)
  m1: 0,            // SUM(VLRLIQ1)
  m2: 0,            // SUM(VLRLIQ2)
  margem: 0,        // SUM(MARGEM)
  m1PctFat: 0,       // M1 / Faturamento
  m2PctFat: 0,       // M2 / Faturamento
  margemPctM1: 0,    // Margem / M1 (badge superior)
  margemPctFat: 0    // Margem / Faturamento (barra/subtítulo)
};

let listaCompleta = [];   // ranking por UF: [{sigla, nome, valor, pct}]
let valorPorUF = {};      // sigla -> pct (usado pelo mapa coroplético)
let canaisData = {        // faturamento por canal
    labels: [],
    atual: [],
    anterior: [],
    variacao: []
};

/**
 * Recebe o array de linhas devolvido pela query (1) — já com
 * JSON.parse aplicado — e monta todas as estruturas usadas pelo
 * painel: totais gerais, ranking por UF e faturamento por canal.
 *
 * Cada linha esperada:
 *   { VLRTOTITEM, VLRLIQ1, VLRLIQ2, MARGEM, UF, CANAL }
 */


function carregarCanal(rows) {

    const canaisOrdenados = (rows || [])
        .map(r => {

            return {
                canal: (r.CANAL || 'Sem canal').trim(),

                atual:
                    Number(r.VLRTOTITEM) || 0,

                anterior:
                    Number(r.VLRTOTITEM_ANTERIOR) || 0,

                variacao:
                    Number(r.VARIACAO_PERC) || 0
            };

        })
        .sort((a, b) => b.atual - a.atual);


    canaisData = {

        labels: canaisOrdenados.map(c => c.canal),

        atual: canaisOrdenados.map(
            c => c.atual / 1000
        ),

        anterior: canaisOrdenados.map(
            c => c.anterior / 1000
        ),

        variacao: canaisOrdenados.map(
            c => c.variacao
        )

    };


    console.log('Dados do gráfico:', canaisData);

    renderGraficoCanais();
}

function carregarMapa(rows) {

  const faturamentoTotal = totais.faturamento;

  valorPorUF = {};

  (rows || []).forEach(r => {

    const uf = (r.UF || '').trim();
    const valor = Number(r.VLRTOTITEM) || 0;

    if (!uf) return;

    valorPorUF[uf] =
      faturamentoTotal !== 0
        ? (valor / faturamentoTotal * 100)
        : 0;

  });

  renderMapa();
}

function carregarRanking(rows) {

  const faturamentoTotal = totais.faturamento;

  listaCompleta = (rows || [])
    .map(r => {

      const sigla = (r.UF || '').trim();
      const valor = Number(r.VLRTOTITEM) || 0;

      return {
        sigla: sigla,
        nome: nomesUF[sigla] || sigla,
        valor: valor,
        pct: faturamentoTotal !== 0
          ? (valor / faturamentoTotal * 100)
          : 0
      };

    })
    .sort((a, b) => b.pct - a.pct);

  renderRanking();

  setText(
    'rank-total-valor',
    fmtBRL(totais.faturamento)
  );

  setText(
    'rank-uf-count',
    listaCompleta.length + ' UFs'
  );
}

function carregarKPI(rows) {

    const r = rows && rows.length ? rows[0] : {};

    totais.faturamento =
        Number(r.FATURAMENTO) || 0;

    totais.faturamentoAnterior =
        Number(r.FATURAMENTO_ANTERIOR) || 0;

    totais.m1 =
        Number(r.M1) || 0;

    totais.m2 =
        Number(r.M2) || 0;

    totais.margem =
        Number(r.MARGEM) || 0;


    // Percentuais atuais continuam sendo calculados
    totais.m1PctFat =
        totais.faturamento !== 0
            ? (totais.m1 / totais.faturamento * 100)
            : 0;

    totais.m2PctFat =
        totais.faturamento !== 0
            ? (totais.m2 / totais.faturamento * 100)
            : 0;

    totais.margemPctM1 =
        totais.m1 > 0
            ? (totais.margem / totais.m1 * 100)
            : 0;

    totais.margemPctFat =
        totais.faturamento !== 0
            ? (totais.margem / totais.faturamento * 100)
            : 0;

    console.log('KPI atual:', totais.faturamento);
    console.log('KPI anterior:', totais.faturamentoAnterior);

    if (!Dashboard.salesKpis.render(r)) renderKPIs();
    else setText('rank-total-valor', fmtBRL(totais.faturamento));
}
