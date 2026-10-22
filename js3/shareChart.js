/**
 * shareChart.js
 * Responsabilidade única: montar/atualizar o donut "Participação por Canal".
 */
let shareChartInstance = null;

function renderShareChart() {
  const canvas = document.getElementById('share-chart');
  const shareLegend = document.getElementById('share-legend');
  const shareTotalEl = document.getElementById('share-total');
  if (!canvas || !shareLegend || !shareTotalEl || typeof Chart === 'undefined') return;

  if (shareChartInstance) {
    shareChartInstance.destroy();
  }

  shareLegend.innerHTML = '';

  const total = channels.reduce((s, x) => s + Number(x.value || 0), 0);
  atualizarTotalShare(total, shareTotalEl);

  shareChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: channels.map(x => x.name),
      datasets: [{
        data: channels.map(x => Number(x.value || 0)),
        backgroundColor: channelColors.slice(0, channels.length),
        borderColor: '#171717',
        borderWidth: 4,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0e1420',
          borderColor: 'rgba(255,255,255,.09)',
          borderWidth: 1,
          titleColor: '#fff',
          bodyColor: '#c7cedb',
          padding: 12,
          callbacks: {
            label: c => ` ${c.label}: ${((c.raw / total) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% · ${fmt(c.raw, 0)}`
          }
        },
        datalabels: { display: false }
      }
    }
  });

  channels.forEach((channel, i) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'share-legend-item';

    const dot = channelColors[i] || '#3fae87';
    item.innerHTML = `<span class="share-legend-dot" style="background:${dot}"></span><span>${channel.name}</span>`;

    item.addEventListener('click', () => {
      const meta = shareChartInstance.getDatasetMeta(0);
      const hidden = meta.data[i].hidden === true;
      meta.data[i].hidden = !hidden;
      item.classList.toggle('is-hidden', !hidden);
      shareChartInstance.update();

      const visibleTotal = channels.reduce((sum, ch, index) => {
        return meta.data[index].hidden ? sum : sum + Number(ch.value || 0);
      }, 0);

      atualizarTotalShare(visibleTotal, shareTotalEl);
    });

    shareLegend.appendChild(item);
  });
}

function atualizarTotalShare(total, element) {
  element.textContent = 'R$ ' + (total / 1000000).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' mi';
}
