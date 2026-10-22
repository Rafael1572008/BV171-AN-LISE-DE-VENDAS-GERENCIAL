/**
 * canal.js
 * Responsabilidade única: resolver o canal recebido pelo drill-down.
 */

(function() {
    const args = window.top.dashboardArgs || {};
    const params = new URLSearchParams(window.location.search || '');

    const canal = String(
        args.CANAL ||
        params.get('CANAL') ||
        'Distribuidores'
    ).trim();

    window.dashboardCanal = canal;

    console.log('========== CANAL DO DRILL-DOWN ==========', canal);
})();
