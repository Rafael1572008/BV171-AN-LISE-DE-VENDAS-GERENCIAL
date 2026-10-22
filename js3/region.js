/**
 * region.js
 * Responsabilidade única: resolver a região recebida pelo drill-down.
 */

(function() {
    const args = window.top.dashboardArgs || {};
    const params = new URLSearchParams(window.location.search || '');

    const regiao = String(
        args.REGIAO ||
        params.get('REGIAO') ||
        'METROP. DE SP'
    ).trim();

    window.dashboardRegion = regiao;

    console.log('========== REGIÃO DO DRILL-DOWN ==========', regiao);
})();
