// ============================================================
// mapa.js — mapa coroplético do Brasil por UF (D3)
// (depende de: dados.js, formatacao.js, D3.js)
// ============================================================

function renderMapa() {
  const svg = d3.select("#map-svg").attr("viewBox", "0 0 520 480");
  const tooltipEl = document.getElementById('map-tooltip');
  const mapWrap = document.getElementById('map-wrap');

  if (!mapWrap) return;

  fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson")
    .then(r => r.json())
    .then(geo => {
      const projection = d3.geoMercator().fitSize([520, 470], geo);
      const path = d3.geoPath().projection(projection);

      svg.selectAll("path")
        .data(geo.features)
        .join("path")
        .attr("class", "uf-path")
        .attr("d", path)
        .attr("fill", f => {
          const sigla = f.properties.sigla;
          const pct = valorPorUF[sigla];
          return pct ? greenForPct(pct) : "#242424";
        })

        // Mouse sobre o estado
        .on("mousemove", (event, f) => {
          const sigla = f.properties.sigla;
          const pct = valorPorUF[sigla];
          const rec = listaCompleta.find(d => d.sigla === sigla);

          const rect = mapWrap.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;

          if (!pct || !rec) {
            tooltipEl.innerHTML = `
              <div class="tt-title">${f.properties.name}</div>
              <div class="tt-row">
                <span>Sem faturamento registrado</span>
              </div>
            `;
          } else {
            tooltipEl.innerHTML = `
              <div class="tt-title">
                <span 
                  class="tt-dot" 
                  style="background:${greenForPct(pct)}">
                </span>
                ${f.properties.name}
              </div>

              <div class="tt-row">
                <span>Faturamento</span>
                <span>${fmtBRL(rec.valor)}</span>
              </div>

              <div class="tt-row">
                <span>Participação</span>
                <span>${fmtPct(pct)}</span>
              </div>
            `;
          }

          tooltipEl.style.left =
            Math.min(x + 14, rect.width - 190) + 'px';

          tooltipEl.style.top =
            Math.max(y - 10, 0) + 'px';

          tooltipEl.classList.add('visible');
        })

        // Clique no estado → abre o segundo nível
        .on("click", (event, f) => {
          const uf = f.properties.sigla;

          console.log("Abrindo análise da UF:", uf);

          abrirAnaliseEstado(uf);
        })

        // Saiu do estado
        .on("mouseleave", () => {
          tooltipEl.classList.remove('visible');
        });
    })
    .catch(() => {
      mapWrap.innerHTML =
        '<p style="color:var(--ink-faint);font-size:13px;padding:40px 0;">Não foi possível carregar o mapa (sem conexão com o GeoJSON externo).</p>';
    });
}