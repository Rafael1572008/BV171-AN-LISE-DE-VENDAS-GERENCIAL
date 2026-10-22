// ============================================================
// grafico.js — gráfico de faturamento por canal
// Atual x Anterior
// ============================================================

let chanChartInstance = null;

function renderGraficoCanais() {

    Chart.register(ChartDataLabels);

    const ctx = document.getElementById('chan-chart');

    if (!ctx) return;


    if (chanChartInstance) {
        chanChartInstance.destroy();
    }


    chanChartInstance = new Chart(ctx, {

        data: {

            labels: canaisData.labels,

            datasets: [

                // =================================================
                // ATUAL
                // =================================================
                {
                    type: 'bar',

                    label: 'Atual',

                    data: canaisData.atual,

                    backgroundColor: '#3fae87',

                    borderRadius: 4,

                    maxBarThickness: 30,

                    yAxisID: 'y',

                    datalabels: {
                        labels: {
                            valor: {
                                display: true,
                                anchor: 'end',
                                align: 'top',
                                color: '#8b96a8',
                                font: {
                                    size: 10,
                                    family: "'IBM Plex Mono', monospace"
                                },
                                offset: 3,
                                formatter: value => 'R$ ' + value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                            },
                            variacao: {
                                display: true,
                                anchor: 'end',
                                align: 'top',
                                offset: 16,
                                color: function (context) {
                                    const variacao = canaisData.variacao[context.dataIndex] || 0;
                                    return variacao > 0 ? '#3fae87' : variacao < 0 ? '#e06c75' : '#8b96a8';
                                },
                                font: {
                                    size: 10,
                                    weight: '600',
                                    family: "'IBM Plex Mono', monospace"
                                },
                                formatter: function (value, context) {
                                    const variacao = canaisData.variacao[context.dataIndex] || 0;
                                    const seta = variacao > 0 ? '\u25B2' : variacao < 0 ? '\u25BC' : '•';
                                    const percentual = (variacao > 0 ? '+' : '') + variacao.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1
                                    }) + '%';
                                    return `${seta} ${percentual}`;
                                }
                            }
                        }
                    }
                },


                // =================================================
                // ANTERIOR
                // =================================================
                {
                    type: 'bar',

                    label: 'Anterior',

                    data: canaisData.anterior,

                    backgroundColor: '#596575',

                    borderRadius: 4,

                    maxBarThickness: 30,

                    yAxisID: 'y',

                    datalabels: {

                        display: true,

                        anchor: 'end',

                        align: 'top',

                        color: '#c7cedb',

                        font: {
                            size: 10,
                            weight: '600',
                            family: "'IBM Plex Mono', monospace"
                        },

                        offset: 4,

                        formatter: value =>
                            'R$ ' + value.toLocaleString(
                                'pt-BR',
                                {
                                    maximumFractionDigits: 0
                                }
                            )
                    }
                }

            ]
        },


        options: {

            responsive: true,

            devicePixelRatio: window.devicePixelRatio || 1,

            maintainAspectRatio: false,

            interaction: {
                mode: 'index',
                intersect: false
            },

            layout: {
                padding: {
                    top: 48
                }
            },


            plugins: {

                legend: {
                    display: false
                },


                tooltip: {

                    backgroundColor: '#0e1420',

                    borderColor: 'rgba(255,255,255,.09)',

                    borderWidth: 1,

                    titleColor: '#ffffff',

                    bodyColor: '#c7cedb',

                    padding: 12,

                    cornerRadius: 8,

                    titleFont: {
                        family: "'IBM Plex Sans', sans-serif",
                        weight: '600',
                        size: 12.5
                    },

                    bodyFont: {
                        family: "'IBM Plex Mono', monospace",
                        size: 11.5
                    },

                    boxPadding: 5,


                    callbacks: {

                        label: function (context) {

                            const valor = context.raw * 1000;

                            return `${context.dataset.label}: ${fmtBRL(valor)}`;
                        },


                        callbacks: {

                            label: function (context) {

                                const valor = context.raw * 1000;

                                return `${context.dataset.label}: ${fmtBRL(valor)}`;
                            }
                        }
                    }
                }
            },


            scales: {

                x: {

                    grid: {
                        display: false
                    },

                    ticks: {

                        color: '#a7b1c2',

                        font: {
                            size: 11.5,
                            family: "'IBM Plex Sans', sans-serif"
                        }
                    }
                },


                y: {

                    position: 'left',

                    grid: {
                        color: '#242e3a'
                    },

                    border: {
                        display: false
                    },

                    ticks: {

                        color: '#6d7889',

                        font: {
                            size: 10.5,
                            family: "'IBM Plex Mono', monospace"
                        },

                        callback: value =>
                            value.toLocaleString('pt-BR')
                    }
                }
            }
        }
    });
}