// ============================================================
// ranking.js — tabela de ranking por UF
// (depende de: dados.js, formatacao.js)
// ============================================================

function renderRanking() {
  const rankBody = document.getElementById('rank-body');
  if (!rankBody) return;

  rankBody.innerHTML = '';

  if (!listaCompleta.length) return;

  const maxPct = listaCompleta[0].pct;
  const medalhas = ['m1', 'm2', 'm3'];

  listaCompleta.forEach((d, i) => {
    const tr = document.createElement('tr');

    if (i < 3) tr.classList.add('top3');

    const barWidth = Math.max((d.pct / maxPct * 100), 3).toFixed(1);

    const marker = i < 3
      ? `<span class="rank-medal ${medalhas[i]}">${i + 1}</span>`
      : `<span class="rank-dot ${d.sigla === 'EX' ? 'rank-dot-ex' : ''}" style="background:${d.sigla === 'EX' ? '#A855F7' : greenForPct(d.pct)}"></span>`;

    tr.innerHTML = `
      <td class="rank-uf">${marker}${d.sigla}</td>
      <td class="rank-val">${fmtBRL(d.valor)}</td>
      <td>
        <div class="rank-pct-cell">
          <div class="pct-bar-track">
            <div class="pct-bar-fill" style="width:${barWidth}%"></div>
          </div>
          <span class="rank-pct">${fmtPct(d.pct)}</span>
        </div>
      </td>`;

    // Clique na UF → abre o mesmo segundo nível do mapa
    tr.addEventListener('click', () => {
      console.log('Abrindo análise da UF pelo ranking:', d.sigla);
      abrirAnaliseEstado(d.sigla);
    });

    rankBody.appendChild(tr);
  });
}