/**
 * data.js
 * Responsabilidade única: guardar os dados brutos (mock) usados no dashboard.
 * Nenhuma manipulação de DOM ou lógica de gráfico deve entrar aqui.
 */

// Regiões — fallback visual enquanto a query ainda não retornou.
const channels = [
    { name: 'METROP. DE SP', value: 2813350, ref: 2650000, color: '#3fae87' },
    { name: 'INTERIOR SP', value: 1590326, ref: 1480000, color: '#5bc4a0' },
    { name: 'SUL', value: 980547, ref: 720000, color: '#7dd4b5' },
    { name: 'NORDESTE', value: 685846, ref: 590000, color: '#a8e0cb' },
    { name: 'OUTROS', value: 738581, ref: 919201, color: '#c5ebe0' }
];

// Cores do donut — harmônicas com o verde da marca
const channelColors = ['#3fae87', '#5b8def', '#d1a367', '#c66be0', '#d4796d'];

// Top parceiros — alinhado à imagem 3 (valores reais)
const partners = [
    { name: 'SENDAS DISTRIBUIDORA S/A', value: 7961538.2, ref: 7061520.2, delta: 12.8, novo: false },
    { name: 'TOP SERVICE', value: 6020155.3, ref: 6658954.9, delta: -9.6, novo: false },
    { name: 'ATACADAO S.A.', value: 3920687.7, ref: 5042603.7, delta: -22.3, novo: false },
    { name: 'COMPRE FACIL COMERCIO DE PRODUTOS ALIMENTICIOS LI', value: 2309750.4, ref: 2090034.4, delta: 10.5, novo: false },
    { name: 'COMERCIAL ESPERANCA ATAC IMPORTACAO E EXP LTDA', value: 1636701.5, ref: 1773606.5, delta: -7.7, novo: false },
    { name: 'MARTINS COMERCIO E SERVICOS DE DISTRIBUICAO S/A', value: 1420800.0, ref: 1280000.0, delta: 11.0, novo: false },
    { name: 'TENDA ATACADO S.A.', value: 1180500.5, ref: 1320000.0, delta: -10.6, novo: false },
    { name: 'GRUPO MATEUS S.A.', value: 950400.0, ref: 880000.0, delta: 8.0, novo: false },
    { name: 'DKT DO BRASIL PRODUTOS DE INTEGRACAO LTDA', value: 780300.0, ref: 850000.0, delta: -8.2, novo: false },
    { name: 'NOVO MUNDO MOVEIS E UTILIDADES S/A', value: 510200.0, ref: 0.0, delta: 100.0, novo: true }
];

const partnersSummary = {
    total: 47588673.4,
    refTotal: 49037413.8,
    delta: -3.0
};
