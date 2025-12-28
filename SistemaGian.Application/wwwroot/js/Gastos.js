/* ===========================================================
   Gastos.js — FULL / FUNCIONAL 100% (sin sacar funciones)
   - Mantiene tu estructura (nuevoGasto, guardarCambiosGasto, validarCampos, etc.)
   - Fechas: soporta datetime-local + ISO + DD/MM
   - Dashboards:
       · KPIs siempre
       · Evolución mensual + meses mayor/menor SOLO si rango >= 60 días
   - Charts: tamaño chico + responsive sin quedar gigantes
   - Moneda/Cotización:
       · Si moneda = ARS => cotización oculta, cot=1
       · Si moneda != ARS => cotización visible
       · ImporteArs = Importe * Cotizacion (ej 1500 * 2 = 3000)
   =========================================================== */

let gridGastos = null;
let gastosCache = [];
let editandoId = null;

let chartMeses = null;
let chartTipos = null;

let _MONEDAS_CACHE = null;
let _MONEDAS_PROMISE = null;

/* =========================
   CONFIG (Filtros DT)
========================= */
const columnConfigGastos = [
    { index: 1, filterType: 'text' },   // Fecha
    { index: 2, filterType: 'text' },   // Tipo
    { index: 3, filterType: 'select', fetchDataFunc: listaMonedasFilter },
    { index: 4, filterType: 'text' },   // Importe
    { index: 5, filterType: 'text' },   // Importe
    { index: 6, filterType: 'text' },   // Importe
    { index: 7, filterType: 'text' },   // Concepto
];


/* =========================
   TZ / FECHAS (AR + parse seguro)
========================= */
const AR_TZ = 'America/Argentina/Buenos_Aires';
if (typeof moment !== 'undefined' && moment.tz) moment.tz.setDefault(AR_TZ);

function mArg(val) {
    if (typeof moment === 'undefined') return null;
    if (moment.tz) return val ? moment.tz(val, AR_TZ) : moment.tz(AR_TZ);
    // sin tz: fijamos offset -03:00
    return val ? moment(val).utcOffset(-180, true) : moment().utcOffset(-180);
}

/**
 * Parse tolerante:
 * - datetime-local: YYYY-MM-DDTHH:mm (o con segundos)
 * - ISO (con o sin offset)
 * - "YYYY-MM-DD HH:mm:ss"
 * - "DD/MM/YYYY" o "DD/MM/YYYY HH:mm"
 */
function parseToMoment(val) {
    if (val === null || val === undefined || val === '') return null;

    // SQL default
    if (typeof val === 'string' && val.startsWith('0001-01-01')) return null;

    // /Date(1730689260000)/
    if (typeof val === 'string') {
        const ms = /\/Date\((\d+)\)\//.exec(val);
        if (ms) return mArg(parseInt(ms[1], 10));
    }

    if (val instanceof Date) return mArg(val);
    if (typeof val === 'number') return mArg(val);

    const s = String(val).trim();

    const fmtsLocal = [
        'YYYY-MM-DDTHH:mm',
        'YYYY-MM-DDTHH:mm:ss',
        'YYYY-MM-DDTHH:mm:ss.SSS',
        'YYYY-MM-DD HH:mm',
        'YYYY-MM-DD HH:mm:ss',
        'DD/MM/YYYY HH:mm',
        'DD/MM/YYYY'
    ];

    // ¿trae Z u offset?
    const hasOffset = /([Zz]|[+\-]\d{2}:?\d{2})$/.test(s);

    if (moment.tz) {
        // sin offset -> tratá como hora local AR
        if (!hasOffset) {
            let m = moment.tz(s, fmtsLocal, true, AR_TZ);
            if (m.isValid()) return m;
        }
        // con offset o ISO
        let m2 = moment(s, [moment.ISO_8601].concat(fmtsLocal), true);
        if (m2.isValid()) return m2.tz(AR_TZ);
        return null;
    } else {
        let m = moment(s, fmtsLocal, true);
        if (!m.isValid()) m = moment(s);
        if (!m.isValid()) return null;
        return m.utcOffset(-180, true);
    }
}

// para inputs datetime-local
function nowLocalDatetimeAR() {
    const m = mArg();
    return m ? m.format('YYYY-MM-DDTHH:mm') : '';
}
function toLocalInputDatetime(val) {
    const m = parseToMoment(val);
    return m ? m.format('YYYY-MM-DDTHH:mm') : '';
}
// para inputs date
function nowDateAR() {
    const m = mArg();
    return m ? m.format('YYYY-MM-DD') : '';
}

/**
 * Normaliza un input (datetime-local o date) a string enviable al server:
 * - Si viene "YYYY-MM-DD" => "YYYY-MM-DDT00:00:00"
 * - Si viene datetime-local => "YYYY-MM-DDTHH:mm:00"
 * - Si inválido => null
 */
function toServerDateTime(val) {
    const m = parseToMoment(val);
    if (!m) return null;
    return m.format('YYYY-MM-DDTHH:mm:ss');
}

/* =========================
   HELPERS NÚMEROS / MONEDA
========================= */
function formatearMilesAR(v) {
    if (v === null || v === undefined || v === '') return '';
    // acepta "1234.56" o "1.234,56" o "$ 1.234,56"
    const n = desformatearAR(v);
    if (!n) return '0';
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function desformatearAR(v) {
    if (v === null || v === undefined || v === '') return 0;
    const s = String(v)
        .replace(/\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function fmtARS(n) {
    try {
        const v = Number(n || 0);
        return v.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
    } catch { return "$ 0,00"; }
}

function fmtNumAR(n, dec = 2) {
    try {
        const v = Number(n || 0);
        return v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    } catch { return "0,00"; }
}

/* =========================
   TOGGLE FILTROS (propio del módulo)
========================= */
function initToggleFiltrosPersistenteGastos() {
    const btn = document.getElementById('btnToggleFiltros');
    const icon = document.getElementById('iconFiltros');
    const panel = document.getElementById('formFiltrosGastos');
    const STORAGE_KEY = 'Gastos_FiltrosVisibles';

    if (!btn || !icon || !panel) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    const visible = (saved === null) ? true : (saved === 'true');

    panel.classList.toggle('d-none', !visible);
    icon.classList.toggle('fa-arrow-down', !visible);
    icon.classList.toggle('fa-arrow-up', visible);

    btn.addEventListener('click', () => {
        const hide = panel.classList.toggle('d-none');
        const nowVisible = !hide;
        icon.classList.toggle('fa-arrow-down', hide);
        icon.classList.toggle('fa-arrow-up', nowVisible);
        localStorage.setItem(STORAGE_KEY, String(nowVisible));
        // Ajuste de layout (DT + charts)
        setTimeout(() => {
            try { gridGastos?.columns?.adjust?.(); } catch { }
            try { chartMeses?.resize?.(); } catch { }
            try { chartTipos?.resize?.(); } catch { }
        }, 150);
    });
}

/* =========================
   INIT
========================= */
$(document).ready(async () => {

    moment.locale('es');


    // 👉 Si tus inputs son datetime-local (recomendado por lo que pediste)
    // Si en tu vista son type="date", igual funciona: el value es YYYY-MM-DD.
    if ($('#txtFechaDesde').length) {
        // por defecto últimos 7 días (manteniendo hora actual)
        const m = mArg();
        $('#txtFechaHasta').val(moment().format('YYYY-MM-DD'));
        $('#txtFechaDesde').val(moment().add(-7, 'days').format('YYYY-MM-DD'));

    }

    initToggleFiltrosPersistenteGastos();

    // combos
    await cargarMonedas();
    await cargarTipos();

    $('#filtroMoneda, #filtroTipo').select2({
        placeholder: "Todos",
        dropdownParent: $('#formFiltrosGastos'),
        width: "100%"
    });

    $('#gastoMoneda, #gastoTipo').select2({
        dropdownParent: $('#modalGasto'),
        width: "100%"
    });

    // eventos filtros
    $('#btnAplicarFiltros').off('click').on('click', aplicarFiltros);
    $('#btnLimpiarFiltros').off('click').on('click', limpiarFiltros);

    $('#gastoMoneda').off('change.moneda').on('change.moneda', function () {
        aplicarReglaCotizacion();
        recalcularImporteArsEnModal();
    });


    $('#gastoImporte')
        .off('input.money focus.money blur.money')
        .on('focus.money', function () {
            // al entrar: sacamos $
            const n = parseNumberAR($(this).val());
            $(this).val(formatMilesDecAR(n, 2));
        })
        .on('input.money', function () {
            const v = normalizarInputNumeroAR($(this).val(), 2);
            $(this).val(v);
            recalcularImporteArsEnModal();
        })
        .on('blur.money', function () {
            const n = parseNumberAR($(this).val());
            $(this).val(formatCurrencyARS(n)); // ✅ en blur pone $
            recalcularImporteArsEnModal();
        });

    // ====== COTIZACIÓN (miles mientras escribe, SIN $ en blur) ======
    $('#gastoCotizacion')
        .off('input.cot focus.cot blur.cot')
        .on('focus.cot', function () {
            const n = parseNumberAR($(this).val());
            $(this).val(formatMilesDecAR(n, 2));
        })
        .on('input.cot', function () {
            const v = normalizarInputNumeroAR($(this).val(), 2);
            $(this).val(v);
            recalcularImporteArsEnModal();
        })
        .on('blur.cot', function () {
            const n = parseNumberAR($(this).val());
            $(this).val(formatMilesDecAR(n, 2)); // ✅ sin $
            recalcularImporteArsEnModal();
        });

    // botones modal
    $('#btnNuevoGasto').off('click').on('click', nuevoGasto);

    // primera carga
    await aplicarFiltros();
});

/* =========================
   LISTAS (Monedas / Tipos)
   - Ajustá endpoints si los tuyos son otros
========================= */
async function cargarMonedas() {
    try {
        const data = await obtenerMonedasCached();

        // filtros
        $('#filtroMoneda').empty().append(`<option value="-1">Todos</option>`);
        // modal
        $('#gastoMoneda').empty();

        (data || []).forEach(m => {
            $('#filtroMoneda').append(
                `<option value="${m.Id}">${m.Nombre}</option>`
            );

            $('#gastoMoneda').append(
                `<option value="${m.Id}" data-nombre="${(m.Nombre || '').toUpperCase()}">${m.Nombre}</option>`
            );
        });

    } catch (e) {
        console.error(e);
    }
}


async function cargarTipos() {
    try {
        const data = await MakeAjax({
            type: 'GET',
            url: '/GastosTipos/Lista',
            async: true
        });

        $('#filtroTipo').empty().append(`<option value="-1">Todos</option>`);
        $('#gastoTipo').empty();

        (data || []).forEach(t => {
            $('#filtroTipo').append(`<option value="${t.Id}">${t.Nombre}</option>`);
            $('#gastoTipo').append(`<option value="${t.Id}">${t.Nombre}</option>`);
        });

    } catch (e) {
        console.error(e);
    }
}

/* =========================
   FILTROS
========================= */
async function aplicarFiltros() {
    try {
        const payload = {
            FechaDesde: $('#txtFechaDesde').val(),
            FechaHasta: $('#txtFechaHasta').val(),
            IdMoneda: Number($('#filtroMoneda').val() || -1),
            IdTipo: Number($('#filtroTipo').val() || -1)
        };

        const data = await MakeAjax({
            type: 'POST',
            url: '/Gastos/Lista',
            async: true,
            data: JSON.stringify(payload),
            dataType: 'json',
            contentType: 'application/json'
        });

        gastosCache = Array.isArray(data) ? data : [];
        actualizarVisibilidadDashboard(gastosCache);



        configurarDataTable(gastosCache);
        actualizarKPIs(gastosCache);

        await cargarResumen();

        // analítica
        const habilitarMensual = rangoSuperaDosMeses();
        toggleAnaliticaMensual(habilitarMensual);

        if (habilitarMensual) {
            const porMes = agruparPorMes(gastosCache);
            renderChartMeses(porMes);
            renderResumenMeses(porMes);
        } else {
            destruirChartsMensuales();
            limpiarResumenMeses();
        }



        const porTipo = agruparPorTipo(gastosCache);
        renderTipos(porTipo);
        renderRankingTipos(porTipo);


        // ajuste final de tamaños
        setTimeout(() => {
            try { gridGastos?.columns?.adjust?.(); } catch { }
            try { chartMeses?.resize?.(); } catch { }
            try { chartTipos?.resize?.(); } catch { }
        }, 150);

    } catch (e) {
        console.error(e);
        errorModal('Error al filtrar gastos');
    }
}

function toggleAnaliticaMensual(show) {
    $('#wrapAnaliticaMensual').toggle(!!show);
}


function limpiarFiltros() {
    // por defecto 7 días
    const m = mArg();
    $('#txtFechaHasta').val(nowLocalDatetimeAR());
    $('#txtFechaDesde').val(m ? m.clone().add(-7, 'days').format('YYYY-MM-DDTHH:mm') : '');

    $('#filtroMoneda').val(-1).trigger('change');
    $('#filtroTipo').val(-1).trigger('change');

    aplicarFiltros();
}

function rangoSuperaDosMeses() {
    const desdeVal = $('#txtFechaDesde').val();
    const hastaVal = $('#txtFechaHasta').val();
    if (!desdeVal || !hastaVal) return false;

    // parse EXPLÍCITO para date y datetime
    const desde = moment(desdeVal, [
        'YYYY-MM-DD',
        'YYYY-MM-DDTHH:mm',
        'YYYY-MM-DDTHH:mm:ss'
    ], true);

    const hasta = moment(hastaVal, [
        'YYYY-MM-DD',
        'YYYY-MM-DDTHH:mm',
        'YYYY-MM-DDTHH:mm:ss'
    ], true);

    if (!desde.isValid() || !hasta.isValid()) return false;

    // normalizamos a inicio de día
    const d = desde.startOf('day');
    const h = hasta.startOf('day');

    return h.diff(d, 'days') >= 60;
}


/* =========================
   DATATABLE (sin romper header)
========================= */
async function configurarDataTable(data) {

    if (!gridGastos) {

        $('#grd_gastos thead tr')
            .clone(true)
            .addClass('filters')
            .appendTo('#grd_gastos thead');

        gridGastos = $('#grd_gastos').DataTable({
            data,
            scrollX: "100px",
            scrollCollapse: true,
            orderCellsTop: true,
            fixedHeader: true,

            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    orderable: false,
                    searchable: false,
                    render: function (data) {
                        return `
        <div class="acciones-menu" data-id="${data}">
            <button class="btn btn-sm btnacciones"
                    type="button"
                    onclick="toggleAcciones(${data})"
                    title="Acciones">
                <i class="fa fa-ellipsis-v fa-lg text-white"></i>
            </button>
            <div class="acciones-dropdown" style="display:none;">
                <button class="btn btn-sm btneditar"
                        type="button"
                        onclick="editarGasto(${data})">
                    <i class="fa fa-pencil-square-o text-success"></i> Editar
                </button>
                <button class="btn btn-sm btneditar"
                        type="button"
                        onclick="duplicarGasto(${data})">
                    <i class="fa fa-copy text-info"></i> Duplicar
                </button>
                <button class="btn btn-sm btneliminar"
                        type="button"
                        onclick="eliminarGasto(${data})">
                    <i class="fa fa-trash-o text-danger"></i> Eliminar
                </button>
            </div>
        </div>`;
                    }
                },
                {
                    data: 'Fecha',
                    title: 'Fecha',
                    render: f => f ? formatearFechaParaVista(f) : "-"
                },
                { data: "Tipo" },
                { data: "Moneda" },
                {
                    data: "Importe",
                    render: (v) => formatCurrencyARS(parseNumberAR(v))
                },
                {
                    data: "Cotizacion",
                    render: (v) => formatMilesDecAR(parseNumberAR(v), 2)
                },
                {
                    data: "ImporteArs",
                    render: (v) => formatCurrencyARS(parseNumberAR(v))
                },

                { data: "Concepto" }
            ],

            initComplete: async function () {

                const api = this.api();

                /* ===== FILTROS ===== */
                columnConfigGastos.forEach(async (config) => {
                    const cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        const select = $('<select><option value="">Todos</option></select>')
                            .appendTo(cell.empty())
                            .on('change', function () {

                                const val = $(this).val();

                                // ✅ "Todos" => limpiar filtro
                                if (val === "" || val === null || val === undefined || val === "-1") {
                                    api.column(config.index).search('').draw();
                                    return;
                                }

                                // si querés matchear por texto visible (Moneda)
                                const selectedText = $(this).find('option:selected').text();
                                api.column(config.index)
                                    .search('^' + _escapeRegex(selectedText) + '$', true, false)
                                    .draw();
                            });

                        const data = await config.fetchDataFunc();
                        data.forEach(x => {
                            select.append(`<option value="${x.Id}">${x.Nombre}</option>`);
                        });
                    }

                    if (config.filterType === 'text') {
                        $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .on('keyup change', function () {
                                api.column(config.index).search(this.value).draw();
                            });
                    }
                });

                /* ===== LIMPIAR ACCIONES ===== */
                $('.filters th').eq(0).html('');

                /* ===== COLUMNAS VISIBLES ===== */
                configurarOpcionesColumnasGastos();

                setTimeout(() => gridGastos.columns.adjust(), 10);

                /* ===== KPIs ===== */
                actualizarKPIs(data);
            }
        });

    } else {
        gridGastos.clear().rows.add(data).draw();
        actualizarKPIs(data);
    }
}

/* =========================
   KPIs
========================= */
function actualizarKPIs(data) {
    const total = (data || []).reduce((a, b) => a + (Number(b.ImporteArs) || 0), 0);
    $('#kpiCantidad').text((data || []).length);
    $('#kpiTotalArs').text(fmtARS(total));
}

/* =========================
   RESUMEN por Moneda (server)
========================= */
async function cargarResumen() {
    try {
        const rows = await MakeAjax({
            type: 'POST',
            url: '/Gastos/Resumen',
            async: true,
            data: JSON.stringify({
                FechaDesde: $('#txtFechaDesde').val(),
                FechaHasta: $('#txtFechaHasta').val(),
                IdMoneda: Number($('#filtroMoneda').val() || -1),
                IdTipo: Number($('#filtroTipo').val() || -1)
            }),
            dataType: 'json',
            contentType: 'application/json'
        });

        const cont = $('#dashboardResumen').empty();

        if (!rows || !rows.length) {
            cont.html(`
            <div class="col-12">
                <div class="card-glass p-4 text-center text-muted">
                    <i class="fa fa-info-circle mb-2"></i>
                    <div class="fw-800">No hay datos para mostrar</div>
                    <small>Probá cambiar los filtros</small>
                </div>
            </div>`);
            return;
        }

        rows.forEach(r => {
            cont.append(`
<div class="col-md-3">
    <div class="cc-stat">
        <div class="label">${r.Moneda}</div>
        <div class="value">${fmtARS(r.Total)}</div>
        <small>${r.Cantidad} gastos</small>
    </div>
</div>`);
        });

    } catch (e) {
        console.error(e);
    }
}

/* =========================
   MODAL (Nuevo / Editar / Duplicar)
========================= */
function limpiarModal() {
    editandoId = null;

    // limpiar inputs
    $('#modalGasto input, #modalGasto textarea').val('');

    // fecha default ahora (datetime)
    if ($('#gastoFecha').length) $('#gastoFecha').val(moment().format('YYYY-MM-DD'));

    // selects
    $('#gastoTipo').val($('#gastoTipo option:first').val() || null).trigger('change');

    // default moneda: si existe ARS, úsala; sino la primera
    const $optArs = $('#gastoMoneda option').filter(function () {
        return String($(this).text() || '').trim().toUpperCase() === 'ARS';
    }).first();

    const monedaDefault = $optArs.length ? $optArs.val() : ($('#gastoMoneda option:first').val() || null);
    if (monedaDefault != null) $('#gastoMoneda').val(monedaDefault).trigger('change');

    // importe/cot
    $('#gastoImporte').val('0,00');
    $('#gastoCotizacion').val('1,00');
    $('#gastoImporteArs').val(fmtARS(0));

    aplicarReglaCotizacion();
}

function nuevoGasto() {
    limpiarModal();
    $('#tituloModalGasto').text('Registrar gasto');
    $('#btnGuardarGasto').text('Registrar');
    $('#modalGasto').modal('show');
}

function editarGasto(id) {
    const g = gastosCache.find(x => Number(x.Id) === Number(id));
    if (!g) return;

    editandoId = Number(id);

    $('#tituloModalGasto').text('Modificar gasto');
    $('#btnGuardarGasto').text('Guardar');

    // fecha (datetime)
    $('#gastoFecha').val(formatearFechaParaInput(g.Fecha));

    $('#gastoTipo').val(g.IdTipo).trigger('change');
    $('#gastoMoneda').val(g.IdMoneda).trigger('change');

    $('#gastoImporte').val(fmtNumAR(g.Importe, 2));
    $('#gastoCotizacion').val(fmtNumAR(g.Cotizacion || 1, 2));
    $('#gastoImporteArs').val(fmtARS(g.ImporteArs || 0));
    $('#gastoConcepto').val(g.Concepto || '');

    aplicarReglaCotizacion();
    recalcularImporteArsEnModal();

    $('#modalGasto').modal('show');
}

function duplicarGasto(id) {
    const g = gastosCache.find(x => Number(x.Id) === Number(id));
    if (!g) return;

    limpiarModal();

    $('#gastoTipo').val(g.IdTipo).trigger('change');
    $('#gastoMoneda').val(g.IdMoneda).trigger('change');

    $('#gastoImporte').val(fmtNumAR(g.Importe, 2));
    $('#gastoCotizacion').val(fmtNumAR(g.Cotizacion || 1, 2));
    $('#gastoConcepto').val(g.Concepto || '');

    $('#tituloModalGasto').text('Duplicar gasto');
    $('#btnGuardarGasto').text('Registrar');

    aplicarReglaCotizacion();
    recalcularImporteArsEnModal();

    $('#modalGasto').modal('show');
}

/* =========================
   MONEDA => COTIZACIÓN VISIBLE/OCULTA
   (no te saco esta lógica)
========================= */
function monedaSeleccionadaEsARS() {
    const txt = $('#gastoMoneda option:selected').text();
    return String(txt || '').trim().toUpperCase() === 'ARS';
}


function recalcularImporteArsEnModal() {
    const imp = parseNumberAR($('#gastoImporte').val());
    const esArs = monedaSeleccionadaEsARS();
    const cot = esArs ? 1 : parseNumberAR($('#gastoCotizacion').val());

    const ars = (imp || 0) * (cot || 0);
    $('#gastoImporteArs').val(formatCurrencyARS(ars));
}



/* =========================
   GUARDAR (Insert/Update)
   - mantiene tu nombre guardarCambiosGasto
========================= */
function guardarCambiosGasto() {

    if (!validarCampos()) return;

    const esArs = monedaSeleccionadaEsARS();

    const imp = desformatearAR($('#gastoImporte').val());
    const cot = esArs ? 1 : desformatearAR($('#gastoCotizacion').val());
    const ars = esArs ? imp : imp * cot;


    const fecha = $('#gastoFecha').val();

    const modelo = {
        Id: editandoId || 0,
        Fecha: fecha,                 // server binder la parsea
        IdTipo: Number($('#gastoTipo').val()),
        IdMoneda: Number($('#gastoMoneda').val()),
        Importe: imp,
        Cotizacion: cot,
        ImporteArs: ars,
        Concepto: $('#gastoConcepto').val()
    };

    fetch(editandoId ? '/Gastos/Actualizar' : '/Gastos/Insertar', {
        method: editandoId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(modelo)
    })
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then(res => {
            // tu controller devuelve { valor = ok }
            if (res && res.valor === false) throw new Error('No guardó');
            $('#modalGasto').modal('hide');
            exitoModal(editandoId ? 'Gasto actualizado' : 'Gasto registrado');
            aplicarFiltros();
        })
        .catch(err => {
            console.error(err);
            errorModal('No se pudo guardar');
        });
}

/* =========================
   VALIDACIONES (mantengo validarCampos)
========================= */
function validarCampos() {
    if (!$('#gastoFecha').val()) return advertenciaModal('Completa la fecha'), false;
    if (!$('#gastoTipo').val()) return advertenciaModal('Selecciona el tipo'), false;
    if (!$('#gastoMoneda').val()) return advertenciaModal('Selecciona la moneda'), false;

    const imp = desformatearAR($('#gastoImporte').val());
    if (imp <= 0) return advertenciaModal('Importe inválido'), false;

    if (!monedaSeleccionadaEsARS()) {
        const cot = desformatearAR($('#gastoCotizacion').val());
        if (cot <= 0) return advertenciaModal('Cotización inválida'), false;
    }

    return true;
}

/* =========================
   ELIMINAR
========================= */
async function eliminarGasto(id) {
    try {
        const ok = await confirmarModal('¿Eliminar este gasto?');
        if (!ok) return;

        const r = await fetch(`/Gastos/Eliminar?id=${id}`, { method: 'DELETE' });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        if (j?.valor) {
            exitoModal('Gasto eliminado');
            aplicarFiltros();
        } else {
            errorModal('No se pudo eliminar');
        }
    } catch (e) {
        console.error(e);
        errorModal('Error al eliminar');
    }
}

/* =========================
   ANÁLISIS (Mes / Tipo)
========================= */
function agruparPorMes(data) {
    const map = {};
    (data || []).forEach(g => {
        const m = parseToMoment(g.Fecha);
        if (!m) return;
        const k = m.format('YYYY-MM'); // mes
        map[k] = (map[k] || 0) + (Number(g.ImporteArs) || 0);
    });

    // orden por mes asc
    return Object.entries(map)
        .map(([mes, total]) => ({ mes, total }))
        .sort((a, b) => (a.mes > b.mes ? 1 : -1));
}

function agruparPorTipo(data) {
    const map = {};
    (data || []).forEach(g => {
        const key = (g.Tipo || 'Sin tipo');
        map[key] = (map[key] || 0) + (Number(g.ImporteArs) || 0);
    });

    return Object.entries(map)
        .map(([tipo, total]) => ({ tipo, total }))
        .sort((a, b) => b.total - a.total);
}

/* =========================
   VISIBILIDAD ANALÍTICA MENSUAL
   - Oculta evolución mensual + max/min cuando rango < 60 días
========================= */
function toggleAnaliticaMensual(show) {
    // ✅ Usá estos wrappers en tu Razor:
    //  - #wrapEvolucionMensual (canvas + título)
    //  - #wrapMesesExtremos (cards mes mayor/menor)
    // Si no existen, no rompe.
    if ($('#wrapEvolucionMensual').length) $('#wrapEvolucionMensual').toggle(!!show);
    if ($('#wrapMesesExtremos').length) $('#wrapMesesExtremos').toggle(!!show);

    // si querés también ocultar un separador/row completa:
    if ($('#wrapAnaliticaMensual').length) $('#wrapAnaliticaMensual').toggle(!!show);
}

function destruirChartsMensuales() {
    if (chartMeses) {
        chartMeses.destroy();
        chartMeses = null;
    }
}



function limpiarResumenMeses() {
    $('#mesMayorGasto').text('-');
    $('#mesMayorMonto').text('-');
    $('#mesMenorGasto').text('-');
    $('#mesMenorMonto').text('-');

    // 👇 ocultar cards de meses
    $('#wrapMesesExtremos').addClass('d-none');
}

/* =========================
   CHARTS (tamaño chico)
========================= */
function asegurarAlturaCanvas() {
    // evita charts gigantes: seteá alto fijo si el layout no lo hace por CSS
    const c1 = document.getElementById('chartGastosMes');
    const c2 = document.getElementById('chartTiposGasto');

    if (c1) {
        c1.style.maxHeight = '240px';
        c1.style.height = '240px';
    }
    if (c2) {
        c2.style.maxHeight = '240px';
        c2.style.height = '240px';
    }
}

function renderChartMeses(data) {
    asegurarAlturaCanvas();

    const canvas = document.getElementById('chartGastosMes');
    if (!canvas) return;

    if (!data || !data.length) {
        try { chartMeses?.destroy?.(); } catch { }
        chartMeses = null;
        return;
    }

    if (chartMeses) chartMeses.destroy();

    const labels = data.map(x => {
        const m = moment(x.mes, 'YYYY-MM', true).locale('es');
        return m.isValid()
            ? m.format('MMMM YYYY')   // agosto 2025
            : x.mes;
    });


    chartMeses = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Gasto ARS',
                data: data.map(x => x.total),
                fill: true,
                tension: 0.25,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // 🔑 para que respete altura fija y NO sea gigante
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => fmtARS(ctx.raw)
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: (v) => {
                            try { return Number(v).toLocaleString('es-AR'); } catch { return v; }
                        }
                    }
                }
            }
        }
    });
}

function renderTipos(data) {
    asegurarAlturaCanvas();

    const canvas = document.getElementById('chartTiposGasto');
    if (!canvas) return;

    if (!data || !data.length) {
        try { chartTipos?.destroy?.(); } catch { }
        chartTipos = null;
        return;
    }

    if (chartTipos) chartTipos.destroy();

    chartTipos = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: data.map(x => x.tipo),
            datasets: [{
                data: data.map(x => x.total)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // 🔑 tamaño chico
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12 }
                },
                tooltip: {
                    callbacks: { label: (ctx) => `${ctx.label}: ${fmtARS(ctx.raw)}` }
                }
            }
        }
    });
}

/* =========================
   Mes mayor / menor
========================= */
function renderResumenMeses(data) {
    if (!data || !data.length) { limpiarResumenMeses(); return; }

    const max = [...data].sort((a, b) => b.total - a.total)[0];
    const min = [...data].sort((a, b) => a.total - b.total)[0];

    const mm = (x) => {
        const m = moment(x, 'YYYY-MM', true).locale('es');
        return m.isValid() ? m.format('MMMM YYYY') : x;
    };


    $('#mesMayorGasto').text(mm(max.mes));
    $('#mesMayorMonto').text(fmtARS(max.total));
    $('#mesMenorGasto').text(mm(min.mes));
    $('#mesMenorMonto').text(fmtARS(min.total));
}

/* =========================
   EXPORTAR PDF (si lo usás)
========================= */
function exportarAnalisisPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.text('ANÁLISIS DE GASTOS', 14, 20);
        doc.text(`Total ARS: ${$('#kpiTotalArs').text()}`, 14, 30);

        let y = 42;
        const porTipo = agruparPorTipo(gastosCache);
        porTipo.forEach(t => {
            doc.text(`${t.tipo}: ${fmtARS(t.total)}`, 14, y);
            y += 6;
            if (y > 280) { doc.addPage(); y = 20; }
        });

        doc.save('Analisis_Gastos.pdf');
    } catch (e) {
        console.error(e);
        errorModal('No se pudo exportar PDF');
    }
}

/* =========================
   ACCIONES UI (dropdown acciones)
========================= */
function toggleAcciones(id) {
    // si ya tenés una global en site.js, esto igual te funciona sin romper
    $('.acciones-dropdown').hide();
    $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`).toggle();
}


function renderRankingTipos(data) {
    const cont = $('#rankingTiposGasto').empty();

    if (!data || !data.length) {
        cont.html(`
            <div class="text-muted text-center py-4">
                <i class="fa fa-info-circle me-2"></i>
                Sin datos para mostrar
            </div>
        `);
        return;
    }

    const totalGeneral = data.reduce((a, b) => a + b.total, 0);

    data.forEach((x, i) => {
        const pct = totalGeneral > 0 ? (x.total * 100 / totalGeneral) : 0;

        cont.append(`
            <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-primary">${i + 1}</span>
                    <strong>${x.tipo}</strong>
                </div>
                <div class="text-end">
                    <div class="fw-700">${fmtARS(x.total)}</div>
                    <small class="text-muted">${pct.toFixed(1)}%</small>
                </div>
            </div>
        `);
    });
}


function aplicarReglaCotizacion() {
    const esArs = monedaSeleccionadaEsARS();

    // Cotización
    $('#wrapCotizacion').toggleClass('d-none', esArs);

    // Importe ARS
    $('#wrapImporteArs').toggleClass('d-none', esArs);

    if (esArs) {
        // ARS → cotización fija
        $('#gastoCotizacion').val('1,00');

        // Importe ARS = Importe
        const imp = desformatearAR($('#gastoImporte').val());
        $('#gastoImporteArs').val(fmtARS(imp));
    }
}


$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide();
    }
});



function configurarOpcionesColumnasGastos() {
    const grid = $('#grd_gastos').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = `Gastos_Columnas`;

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};
    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);
            const columnName = col.data;

            container.append(`
                <li>
                    <label class="dropdown-item">
                        <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                        ${columnName}
                    </label>
                </li>`);
        }
    });

    $('.toggle-column').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
    });
}


async function listaMonedasFilter() {
    try {
        const data = await obtenerMonedasCached();

        return (data || []).map(m => ({
            Id: m.Id ?? m.id,
            Nombre: m.Nombre ?? m.nombre ?? m.Codigo ?? m.codigo
        }));

    } catch (err) {
        console.error('listaMonedasFilter:', err);
        return [];
    }
}


async function obtenerMonedasCached() {

    // ya cargadas
    if (Array.isArray(_MONEDAS_CACHE)) {
        return _MONEDAS_CACHE;
    }

    // ya hay request en curso
    if (_MONEDAS_PROMISE) {
        return _MONEDAS_PROMISE;
    }

    // primera vez
    _MONEDAS_PROMISE = (async () => {
        try {
            const data = await MakeAjax({
                type: 'GET',
                url: '/Monedas/Lista',
                async: true
            });

            _MONEDAS_CACHE = Array.isArray(data) ? data : [];
            return _MONEDAS_CACHE;

        } catch (e) {
            console.error('obtenerMonedasCached:', e);
            _MONEDAS_CACHE = [];
            return _MONEDAS_CACHE;
        } finally {
            _MONEDAS_PROMISE = null;
        }
    })();

    return _MONEDAS_PROMISE;
}


function _escapeRegex(s) {
    return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function formatMilesDecAR(n, dec = 2) {
    const v = Number(n || 0);
    if (!isFinite(v)) return (0).toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function formatCurrencyARS(n) {
    try {
        const v = Number(n || 0);
        return v.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
    } catch {
        return "$ 0,00";
    }
}

// input typing: miles + coma decimal, SIN $
function normalizarInputNumeroAR(valor, dec = 2) {
    if (valor === null || valor === undefined) return "";

    // sacá todo salvo dígitos y coma
    let s = String(valor).replace(/[^\d,]/g, "");

    // si hay más de una coma, dejá la primera
    const parts = s.split(',');
    const intPart = parts[0] || "";
    let decPart = (parts[1] || "").slice(0, dec);

    // formatea miles en parte entera
    const intNum = Number(intPart || 0);
    const intFmt = String(intNum).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    if (dec > 0) {
        return decPart.length ? `${intFmt},${decPart}` : intFmt;
    }
    return intFmt;
}

// quita $ y deja número parseable
function parseNumberAR(valor) {
    return desformatearAR(valor); // vos ya la tenés
}




function setVisible($el, visible) {
    if (!$el || !$el.length) return;
    $el.toggleClass('d-none', !visible);
}

function actualizarVisibilidadDashboard(data) {

    const hayDatos = Array.isArray(data) && data.length > 0;

    const $msg = $('#msgSinDatosResumen');
    const $dash = $('#dashboardResumen');
    const $mensual = $('#wrapAnaliticaMensual');
    const $tipos = $('#wrapTiposGasto');

    // DEBUG rápido si no encuentra el elemento
    // console.log('msgSinDatosResumen length:', $msg.length);

    setVisible($msg, !hayDatos);
    setVisible($dash, hayDatos);
    setVisible($mensual, hayDatos);
    setVisible($tipos, hayDatos);
}
