/**
 * channelChart.js
 * Wrapper: gráfico "Faturamento por Canal" via Dashboard.renderBarWithMeta
 * (com linha de meta/referencial + valor + Δ%).
 */
let channelChartInstance = null;

function renderChannelChart() {
  const canvas = document.getElementById('channel-chart');
  if (!canvas || typeof Dashboard === 'undefined') return;

  const items = (typeof channels !== 'undefined' ? channels : []).map(function (c) {
    return {
      label: c.name || c.label || '',
      value: Number(c.value) || 0,
      ref: c.ref === undefined || c.ref === null ? 0 : Number(c.ref) || 0,
      delta: c.delta
    };
  });

  channelChartInstance = Dashboard.renderBarWithMeta('channel-chart', {
    items: items,
    color: '#3fae87',
    animation: true
  });
}
