/* Reportes AGS MAT — UI + datos (compatible PascalCase / camelCase API) */

/** Reportes que exportan pedidos con encabezado + detalle de productos (diseño estructurado) */
const REPORTES_EXPORT_PEDIDOS = [
    'pedidos-dia', 'ec-clientes', 'ec-para-cliente', 'ec-proveedores', 'evolucion-ventas'
];

const REPORTES = [
    { id: 'pedidos-dia', titulo: 'Pedidos por día', icon: 'fa-calendar', endpoint: 'PedidosPorDia', filtros: ['fechas'] },
    { id: 'ec-clientes', titulo: 'Estado de cuenta — Clientes', icon: 'fa-users', endpoint: 'EstadoCuentaClientes', filtros: ['fechas', 'cliente', 'soloSaldo'] },
    { id: 'ec-para-cliente', titulo: 'Para cliente', icon: 'fa-file-text-o', endpoint: 'EstadoCuentaParaCliente', filtros: ['fechas', 'cliente', 'soloSaldo'] },
    { id: 'ec-proveedores', titulo: 'Estado de cuenta — Proveedores', icon: 'fa-truck', endpoint: 'EstadoCuentaProveedores', filtros: ['fechas', 'proveedor', 'soloSaldo'], composicion: true },
    { id: 'evolucion-ventas', titulo: 'Evolución de ventas', icon: 'fa-line-chart', endpoint: 'EvolucionVentas', filtros: ['fechas', 'tipoEvolucion'] },
    { id: 'evolucion-producto', titulo: 'Evolución por producto', icon: 'fa-cubes', endpoint: 'EvolucionProducto', filtros: ['fechas', 'cliente', 'proveedor', 'producto'] },
    { id: 'pagos-clientes', titulo: 'Pagos clientes', icon: 'fa-money', endpoint: 'PagosClientes', filtros: ['fechas', 'cliente'] },
    { id: 'pagos-proveedores', titulo: 'Pagos proveedores', icon: 'fa-credit-card', endpoint: 'PagosProveedores', filtros: ['fechas', 'proveedor'] }
];

const RPT_CHECK_META = {
    cliente: { todos: 'Todos los clientes', uno: '1 cliente', n: 'clientes seleccionados', vacio: 'No hay clientes' },
    proveedor: { todos: 'Todos los proveedores', uno: '1 proveedor', n: 'proveedores seleccionados', vacio: 'No hay proveedores' },
    entidad: { todos: 'Todos', uno: '1 seleccionado', n: 'seleccionados', vacio: 'Sin ítems' },
    producto: { todos: 'Todos los productos', uno: '1 producto', n: 'productos seleccionados', vacio: 'No hay productos para el cliente/proveedor elegido.' }
};
const checkFiltroItems = { cliente: [], proveedor: [], entidad: [], producto: [] };
let checkFiltrosBound = false;
let checkDropAbierto = null;

/** Lee propiedad en camelCase o PascalCase */
function val(o, ...keys) {
    if (!o) return undefined;
    for (const k of keys) {
        if (o[k] !== undefined && o[k] !== null) return o[k];
        const p = k.charAt(0).toUpperCase() + k.slice(1);
        if (o[p] !== undefined && o[p] !== null) return o[p];
    }
    return undefined;
}

function normItem(x) {
    return { id: val(x, 'id'), nombre: val(x, 'nombre') || '' };
}

function normCatalogos(data) {
    const raw = data || {};
    return {
        clientes: (val(raw, 'clientes') || []).map(normItem),
        proveedores: (val(raw, 'proveedores') || []).map(normItem),
        productos: (val(raw, 'productos') || []).map(normItem)
    };
}

/** Normaliza arrays/objetos de respuesta POST */
function normPayload(data, id) {
    if (!data) return data;
    if (id === 'evolucion-producto') {
        return {
            fechaDesde: val(data, 'fechaDesde'),
            fechaHasta: val(data, 'fechaHasta'),
            meses: val(data, 'meses') || [],
            filas: (val(data, 'filas') || []).map(f => ({
                idProducto: val(f, 'idProducto'),
                producto: val(f, 'producto'),
                unidad: val(f, 'unidad'),
                cantidadesPorMes: val(f, 'cantidadesPorMes') || {},
                montoPrimerMes: val(f, 'montoPrimerMes'),
                montoUltimoMes: val(f, 'montoUltimoMes'),
                variacionMonto: val(f, 'variacionMonto'),
                variacionPorcentaje: val(f, 'variacionPorcentaje'),
                informacion: val(f, 'informacion')
            }))
        };
    }
    if (id === 'pedidos-dia') {
        return (Array.isArray(data) ? data : []).map(r => ({
            fecha: val(r, 'fecha'),
            cantidadPedidos: val(r, 'cantidadPedidos'),
            totalFacturado: val(r, 'totalFacturado'),
            totalCosto: val(r, 'totalCosto'),
            totalGanancia: val(r, 'totalGanancia'),
            pedidos: normPedidosLinea(val(r, 'pedidos'))
        }));
    }
    if (id === 'pagos-clientes' || id === 'pagos-proveedores') {
        return (Array.isArray(data) ? data : []).map(g => ({
            fechaPago: val(g, 'fechaPago'),
            totalDia: val(g, 'totalDia'),
            pagos: (val(g, 'pagos') || []).map(p => ({
                idPago: val(p, 'idPago'),
                idPedido: val(p, 'idPedido'),
                partida: val(p, 'partida'),
                fechaEntrega: val(p, 'fechaEntrega'),
                monto: val(p, 'monto'),
                metodoPago: val(p, 'metodoPago'),
                cliente: val(p, 'cliente'),
                proveedor: val(p, 'proveedor')
            }))
        }));
    }
    return (Array.isArray(data) ? data : []).map(g => ({
        idEntidad: val(g, 'idEntidad'),
        nombre: val(g, 'nombre'),
        etiquetaTotal: val(g, 'etiquetaTotal'),
        totalSaldo: val(g, 'totalSaldo'),
        totalGanancia: val(g, 'totalGanancia'),
        pedidos: normPedidosLinea(val(g, 'pedidos'))
    }));
}

function normPedidosLinea(arr) {
    return (arr || []).map(p => ({
        idPedido: val(p, 'idPedido'),
        partida: val(p, 'partida'),
        fechaEntrega: val(p, 'fechaEntrega'),
        monto: val(p, 'monto'),
        costo: val(p, 'costo'),
        haber: val(p, 'haber'),
        saldo: val(p, 'saldo'),
        ganancia: val(p, 'ganancia'),
        porcGanancia: val(p, 'porcGanancia'),
        cliente: val(p, 'cliente'),
        proveedor: val(p, 'proveedor'),
        estadoCliente: val(p, 'estadoCliente'),
        pagadoProveedor: val(p, 'pagadoProveedor')
    }));
}

let reporteActivo = REPORTES[0];
let catalogos = { clientes: [], proveedores: [], productos: [] };
let ultimoResultado = null;
let pedidosSeleccionadosProveedor = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof $ === 'undefined') {
        console.error('jQuery requerido para Reportes');
        return;
    }
    initFechasDefault();
    renderNavReportes();
    initFiltroTipoSelect();
    bindFiltrosCheckGlobal();
    await cargarCatalogos();
    configurarFiltrosVisibles();
    document.getElementById('btnGenerar').addEventListener('click', generarReporte);
    initModalExportar();
    document.getElementById('btnExportarPrint').addEventListener('click', () => exportarPrint());
    document.getElementById('filtroTipo').addEventListener('change', onCambioTipoEvolucion);
});

function initFechasDefault() {
    const h = new Date();
    const d = new Date(h.getFullYear(), h.getMonth(), 1);
    document.getElementById('filtroDesde').value = fmtInputDate(d);
    document.getElementById('filtroHasta').value = fmtInputDate(h);
}

function fmtInputDate(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function renderNavReportes() {
    const nav = document.getElementById('navReportes');
    nav.innerHTML = REPORTES.map((r, i) =>
        `<button type="button" class="btn-reporte${i === 0 ? ' active' : ''}" data-id="${r.id}">
            <span class="rpt-nav-icon"><i class="fa ${r.icon}"></i></span>
            <span><span class="rpt-nav-title">${esc(r.titulo)}</span></span>
        </button>`
    ).join('');
    nav.querySelectorAll('.btn-reporte').forEach(btn => {
        btn.addEventListener('click', () => {
            nav.querySelectorAll('.btn-reporte').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            reporteActivo = REPORTES.find(x => x.id === btn.dataset.id);
            pedidosSeleccionadosProveedor.clear();
            document.getElementById('reporteActivoLabel').textContent = reporteActivo.titulo;
            configurarFiltrosVisibles();
            resetResultado();
        });
    });
    document.getElementById('reporteActivoLabel').textContent = reporteActivo.titulo;
}

function resetResultado() {
    document.getElementById('resultadoMeta').textContent = '';
    document.getElementById('contenedorResultado').innerHTML = `
        <div class="rpt-empty">
            <i class="fa fa-line-chart"></i>
            <p>Presioná <strong>Generar</strong> para ver el reporte <strong>${esc(reporteActivo.titulo)}</strong>.</p>
        </div>`;
}

async function cargarCatalogos() {
    try {
        const res = await fetch('/Reportes/Catalogos');
        if (!res.ok) throw new Error(await res.text());
        catalogos = normCatalogos(await res.json());
        renderFiltroCheck('cliente', catalogos.clientes);
        renderFiltroCheck('proveedor', catalogos.proveedores);
        onCambioTipoEvolucion();
        refrescarFiltrosDelReporte();
    } catch (e) {
        console.error(e);
        if (typeof errorModal === 'function') errorModal('No se pudieron cargar clientes, proveedores y productos.');
    }
}

function initFiltroTipoSelect() {
    const $el = $('#filtroTipo');
    if (!$el.length) return;
    if ($el.data('select2')) $el.select2('destroy');
    $el.select2({
        width: '100%',
        minimumResultsForSearch: Infinity,
        dropdownParent: $('#panelFiltrosReportes')
    });
}

function configurarFiltrosVisibles() {
    const f = reporteActivo.filtros || [];
    document.querySelector('.filtro-cliente').classList.toggle('d-none', !f.includes('cliente'));
    document.querySelector('.filtro-proveedor').classList.toggle('d-none', !f.includes('proveedor'));
    document.querySelector('.filtro-producto').classList.toggle('d-none', !f.includes('producto'));
    document.querySelector('.filtro-tipo').classList.toggle('d-none', !f.includes('tipoEvolucion'));
    document.querySelector('.filtro-entidad').classList.toggle('d-none', !f.includes('tipoEvolucion'));
    document.querySelector('.filtro-solo-saldo').classList.toggle('d-none', !f.includes('soloSaldo'));
    actualizarEtiquetasFiltroFechas();
    cerrarDropCheck();
    refrescarFiltrosDelReporte();
    if (f.includes('tipoEvolucion')) onCambioTipoEvolucion();
}

function refrescarFiltrosDelReporte() {
    const f = reporteActivo.filtros || [];
    if (f.includes('cliente')) renderFiltroCheck('cliente', catalogos.clientes, obtenerIdsFiltroCheck('cliente'));
    if (f.includes('proveedor')) renderFiltroCheck('proveedor', catalogos.proveedores, obtenerIdsFiltroCheck('proveedor'));
    if (f.includes('producto')) actualizarCatalogoProductosEvolucion();
    if (f.includes('tipoEvolucion')) onCambioTipoEvolucion();
}

function getCheckEls(key) {
    return {
        wrap: document.querySelector(`[data-check-filtro="${key}"]`),
        btn: document.querySelector(`[data-check-trigger="${key}"]`),
        drop: document.querySelector(`[data-check-drop="${key}"]`),
        lista: document.querySelector(`[data-check-lista="${key}"]`),
        buscar: document.querySelector(`[data-check-buscar="${key}"]`),
        resumen: document.querySelector(`[data-check-resumen="${key}"]`)
    };
}

function bindFiltrosCheckGlobal() {
    if (checkFiltrosBound) return;
    checkFiltrosBound = true;

    document.getElementById('panelFiltrosReportes')?.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-check-trigger]');
        if (trigger) {
            e.stopPropagation();
            const key = trigger.getAttribute('data-check-trigger');
            if (checkDropAbierto === key) cerrarDropCheck();
            else abrirDropCheck(key);
            return;
        }
        const todos = e.target.closest('[data-check-todos]');
        if (todos) {
            e.preventDefault();
            const key = todos.getAttribute('data-check-todos');
            const { lista } = getCheckEls(key);
            lista?.querySelectorAll('.rpt-prod-check__item:not(.is-hidden) input[type="checkbox"]')
                .forEach(cb => { cb.checked = true; });
            onCambioFiltroCheck(key);
            return;
        }
        const ninguno = e.target.closest('[data-check-ninguno]');
        if (ninguno) {
            e.preventDefault();
            const key = ninguno.getAttribute('data-check-ninguno');
            const { lista } = getCheckEls(key);
            lista?.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
            onCambioFiltroCheck(key);
        }
    });

    document.getElementById('panelFiltrosReportes')?.addEventListener('input', (e) => {
        const buscar = e.target.closest('[data-check-buscar]');
        if (buscar) filtrarListaCheck(buscar.getAttribute('data-check-buscar'), buscar.value);
    });

    document.getElementById('panelFiltrosReportes')?.addEventListener('change', (e) => {
        if (!e.target.matches('[data-check-lista] input[type="checkbox"]')) return;
        const lista = e.target.closest('[data-check-lista]');
        if (lista) onCambioFiltroCheck(lista.getAttribute('data-check-lista'));
    });

    document.addEventListener('click', (e) => {
        if (!checkDropAbierto) return;
        const { wrap } = getCheckEls(checkDropAbierto);
        if (wrap && !wrap.contains(e.target)) cerrarDropCheck();
    });

    window.addEventListener('resize', () => { if (checkDropAbierto) posicionarDropCheck(checkDropAbierto); });
    window.addEventListener('scroll', () => { if (checkDropAbierto) posicionarDropCheck(checkDropAbierto); }, true);
}

function onCambioFiltroCheck(key) {
    actualizarResumenCheck(key);
    if (key === 'cliente' || key === 'proveedor') {
        if (reporteActivo.id === 'evolucion-producto') actualizarCatalogoProductosEvolucion();
    }
}

function filtrarListaCheck(key, q) {
    const { lista } = getCheckEls(key);
    if (!lista) return;
    const term = (q || '').trim().toLowerCase();
    lista.querySelectorAll('.rpt-prod-check__item').forEach(row => {
        const nombre = (row.dataset.nombre || '').toLowerCase();
        row.classList.toggle('is-hidden', term.length > 0 && !nombre.includes(term));
    });
}

function renderFiltroCheck(key, items, idsSeleccionados) {
    const meta = RPT_CHECK_META[key];
    const { lista, buscar } = getCheckEls(key);
    if (!lista || !meta) return;

    checkFiltroItems[key] = items || [];
    const sel = new Set((idsSeleccionados || []).map(String));

    if (!items?.length) {
        lista.innerHTML = `<p class="rpt-prod-check__empty">${meta.vacio}</p>`;
        actualizarResumenCheck(key);
        return;
    }

    lista.innerHTML = items.map(p => {
        const id = String(p.id);
        const checked = sel.has(id) ? ' checked' : '';
        const nombreRaw = p.nombre || '';
        const nombreAttr = nombreRaw.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        return `<label class="rpt-prod-check__item" data-nombre="${nombreAttr}" data-id="${id}">
            <input type="checkbox" class="form-check-input" value="${id}"${checked} />
            <span class="rpt-prod-check__name">${esc(nombreRaw)}</span>
        </label>`;
    }).join('');

    filtrarListaCheck(key, buscar?.value || '');
    actualizarResumenCheck(key);
}

function actualizarResumenCheck(key) {
    const meta = RPT_CHECK_META[key];
    const { resumen } = getCheckEls(key);
    if (!resumen || !meta) return;

    const ids = obtenerIdsFiltroCheck(key);
    const total = checkFiltroItems[key].length;
    if (!total) {
        resumen.textContent = meta.vacio;
        return;
    }
    if (!ids.length) {
        resumen.textContent = meta.todos;
        return;
    }
    if (ids.length === 1) {
        const p = checkFiltroItems[key].find(x => x.id === ids[0]);
        resumen.textContent = p?.nombre || meta.uno;
        return;
    }
    if (ids.length === total) {
        resumen.textContent = meta.todos;
        return;
    }
    resumen.textContent = `${ids.length} ${meta.n}`;
}

function obtenerIdsFiltroCheck(key) {
    const { lista } = getCheckEls(key);
    if (!lista) return [];
    return Array.from(lista.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => parseInt(cb.value, 10))
        .filter(n => n > 0);
}

function posicionarDropCheck(key) {
    const { btn, drop } = getCheckEls(key);
    if (!btn || !drop || drop.hidden) return;
    const r = btn.getBoundingClientRect();
    const maxH = Math.min(320, window.innerHeight - r.bottom - 12);
    drop.style.top = `${r.bottom + 4}px`;
    drop.style.left = `${r.left}px`;
    drop.style.width = `${Math.max(r.width, 280)}px`;
    drop.style.maxHeight = maxH > 120 ? `${maxH}px` : '320px';
    const lista = drop.querySelector('.rpt-prod-check__list');
    if (lista) lista.style.maxHeight = `${Math.max(80, maxH - 90)}px`;
}

function abrirDropCheck(key) {
    cerrarDropCheck();
    const { btn, drop, wrap, buscar } = getCheckEls(key);
    if (!btn || !drop) return;
    checkDropAbierto = key;
    drop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    wrap?.classList.add('is-open');
    posicionarDropCheck(key);
    buscar?.focus();
}

function cerrarDropCheck() {
    if (!checkDropAbierto) return;
    const key = checkDropAbierto;
    const { btn, drop, wrap, buscar } = getCheckEls(key);
    checkDropAbierto = null;
    if (drop) {
        drop.hidden = true;
        drop.style.top = drop.style.left = drop.style.width = drop.style.maxHeight = '';
        const lista = drop.querySelector('.rpt-prod-check__list');
        if (lista) lista.style.maxHeight = '';
    }
    if (btn) {
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('is-open');
    }
    wrap?.classList.remove('is-open');
    if (buscar) {
        buscar.value = '';
        filtrarListaCheck(key, '');
    }
}

async function actualizarCatalogoProductosEvolucion() {
    if (reporteActivo.id !== 'evolucion-producto') return;
    const prev = obtenerIdsFiltroCheck('producto');
    const qs = new URLSearchParams();
    obtenerIdsFiltroCheck('cliente').forEach(id => qs.append('idClientes', id));
    obtenerIdsFiltroCheck('proveedor').forEach(id => qs.append('idProveedores', id));

    try {
        const res = await fetch(`/Reportes/ProductosEvolucion?${qs}`);
        if (!res.ok) throw new Error(await res.text());
        const raw = await res.json();
        const items = (Array.isArray(raw) ? raw : []).map(normItem);
        const valid = new Set(items.map(x => x.id));
        renderFiltroCheck('producto', items, prev.filter(id => valid.has(id)));
    } catch (e) {
        console.error(e);
        renderFiltroCheck('producto', [], []);
    }
}

const REPORTES_FECHA_ENTREGA = new Set([
    'pedidos-dia', 'ec-clientes', 'ec-para-cliente', 'ec-proveedores',
    'evolucion-ventas', 'evolucion-producto'
]);

function actualizarEtiquetasFiltroFechas() {
    const porEntrega = REPORTES_FECHA_ENTREGA.has(reporteActivo.id);
    const lblDesde = document.querySelector('label[for="filtroDesde"]');
    const lblHasta = document.querySelector('label[for="filtroHasta"]');
    if (lblDesde) lblDesde.textContent = porEntrega ? 'Entrega desde' : 'Fecha desde';
    if (lblHasta) lblHasta.textContent = porEntrega ? 'Entrega hasta' : 'Fecha hasta';
}

function onCambioTipoEvolucion() {
    const tipo = document.getElementById('filtroTipo').value;
    const esCliente = tipo === 'Cliente';
    const lbl = document.getElementById('lblFiltroEntidad');
    if (lbl) lbl.textContent = esCliente ? 'Clientes' : 'Proveedores';
    const meta = RPT_CHECK_META.entidad;
    if (meta) {
        meta.todos = esCliente ? 'Todos los clientes' : 'Todos los proveedores';
        meta.uno = esCliente ? '1 cliente' : '1 proveedor';
        meta.n = esCliente ? 'clientes seleccionados' : 'proveedores seleccionados';
        meta.vacio = esCliente ? 'No hay clientes' : 'No hay proveedores';
    }
    const items = esCliente ? catalogos.clientes : catalogos.proveedores;
    const prev = obtenerIdsFiltroCheck('entidad');
    const valid = new Set(items.map(x => x.id));
    renderFiltroCheck('entidad', items, prev.filter(id => valid.has(id)));
}

function obtenerFiltro() {
    const tipo = document.getElementById('filtroTipo').value;
    const idClientes = obtenerIdsFiltroCheck('cliente');
    const idProveedores = obtenerIdsFiltroCheck('proveedor');
    const idEntidades = obtenerIdsFiltroCheck('entidad');

    const base = {
        fechaDesde: document.getElementById('filtroDesde').value || null,
        fechaHasta: document.getElementById('filtroHasta').value || null,
        idCliente: -1,
        idProveedor: -1,
        idProducto: -1,
        idClientes,
        idProveedores,
        idProductos: obtenerIdsFiltroCheck('producto'),
        tipo,
        soloConSaldo: document.getElementById('filtroSoloSaldo').checked
    };

    if (reporteActivo.filtros?.includes('tipoEvolucion')) {
        if (tipo === 'Cliente') base.idClientes = idEntidades;
        else base.idProveedores = idEntidades;
    }

    return base;
}

async function generarReporte() {
    const btn = document.getElementById('btnGenerar');
    btn.disabled = true;
    const cont = document.getElementById('contenedorResultado');
    cont.innerHTML = `<div class="rpt-loading"><i class="fa fa-spinner fa-spin d-block"></i>Generando reporte…</div>`;

    try {
        const filtro = obtenerFiltro();
        const res = await fetch(`/Reportes/${reporteActivo.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filtro)
        });
        if (!res.ok) throw new Error(await res.text());
        const raw = await res.json();
        ultimoResultado = normPayload(raw, reporteActivo.id);
        renderResultado(ultimoResultado);
        setResultadoMeta(ultimoResultado);
    } catch (e) {
        console.error(e);
        cont.innerHTML = `<div class="rpt-empty"><i class="fa fa-exclamation-triangle"></i><p class="text-danger">Error al generar el reporte.</p></div>`;
        if (typeof errorModal === 'function') errorModal('Error al generar el reporte.');
    } finally {
        btn.disabled = false;
    }
}

function setResultadoMeta(data) {
    const meta = document.getElementById('resultadoMeta');
    if (!meta) return;
    let n = 0;
    if (reporteActivo.id === 'pedidos-dia') {
        n = (data || []).reduce((a, d) => a + (d.pedidos?.length || d.cantidadPedidos || 0), 0);
    }
    else if (reporteActivo.id === 'evolucion-producto') n = data?.filas?.length || 0;
    else if (reporteActivo.id.startsWith('pagos')) n = (data || []).reduce((a, g) => a + (g.pagos?.length || 0), 0);
    else n = (data || []).reduce((a, g) => a + (g.pedidos?.length || 0), 0);
    meta.textContent = n ? `${n} registro${n !== 1 ? 's' : ''}` : 'Sin registros';
}

function renderResultado(data) {
    const id = reporteActivo.id;
    if (id === 'pedidos-dia') return renderPedidosPorDia(data);
    if (id === 'evolucion-producto') return renderEvolucionProducto(data);
    if (id === 'pagos-clientes' || id === 'pagos-proveedores') return renderPagos(data);
    if (id.startsWith('ec-') || id === 'evolucion-ventas') return renderGrupos(data);
    document.getElementById('contenedorResultado').innerHTML = '<p>Sin datos.</p>';
}

function wrapTable(head, body, foot = '') {
    return `<div class="rpt-table-wrap">
        <table class="rpt-table">
            ${head ? `<thead><tr>${head}</tr></thead>` : ''}
            <tbody>${body}</tbody>
            ${foot ? `<tfoot><tr class="rpt-total">${foot}</tr></tfoot>` : ''}
        </table>
    </div>`;
}

function thSelect() {
    return '<th class="rpt-col-select" aria-label="Selección"></th>';
}

function tdSelect() {
    return '<td class="rpt-col-select"><span class="rpt-row-select-mark" aria-hidden="true"></span></td>';
}

function contarColumnas(headHtml) {
    return (headHtml.match(/<th/g) || []).length;
}

function bindRowSelection() {
    document.querySelectorAll('tr.rpt-data-row').forEach(row => {
        row.addEventListener('click', onFilaSeleccionClick);
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFilaSeleccionClick.call(row, e);
            }
        });
    });
}

function setExportando(activo, mensaje = 'Exportando…') {
    const ids = ['btnExportar', 'btnExportarPrint', 'btnComposicionProv', 'btnIrPedidoPago', 'btnConfirmarExportarSistema'];
    if (!activo) {
        SistemaExport.setProcesando(false);
        ids.forEach(id => document.getElementById(id)?.removeAttribute('disabled'));
        return;
    }
    SistemaExport.setProcesando(true, mensaje);
    ids.forEach(id => {
        const b = document.getElementById(id);
        if (b) b.setAttribute('disabled', 'disabled');
    });
}

function esperarPintado() {
    return new Promise(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, 40));
    });
}

function onFilaSeleccionClick(e) {
    if (e.target.closest('.rpt-expand-btn, .chk-pago-prov, .rpt-col-action, input, button, a, label')) return;
    const yaSeleccionada = this.classList.contains('is-selected');
    const root = document.getElementById('contenedorResultado');
    (root ? root.querySelectorAll('tr.rpt-data-row.is-selected') : []).forEach(r => {
        r.classList.remove('is-selected');
        r.setAttribute('aria-selected', 'false');
    });
    if (!yaSeleccionada) {
        this.classList.add('is-selected');
        this.setAttribute('aria-selected', 'true');
    }
}

function toolbarAcordeon() {
    return `<div class="rpt-acc-toolbar no-print">
        <button type="button" class="btn btn-rpt-ghost btn-sm" id="btnAccPlegar"><i class="fa fa-compress me-1"></i> Plegar todos</button>
        <button type="button" class="btn btn-rpt-ghost btn-sm" id="btnAccDesplegar"><i class="fa fa-expand me-1"></i> Desplegar todos</button>
    </div>`;
}

function renderPedidosPorDia(rows) {
    if (!rows?.length) return vacio();
    let tf = 0, tc = 0, tg = 0, tp = 0;
    let resumenBody = '';
    let html = toolbarAcordeon() + '<div class="rpt-accordion-list">';

    rows.forEach((r, idx) => {
        tf += Number(r.totalFacturado) || 0;
        tc += Number(r.totalCosto) || 0;
        tg += Number(r.totalGanancia) || 0;
        tp += Number(r.cantidadPedidos) || 0;
        resumenBody += `<tr class="rpt-data-row">${tdSelect()}<td>${fmtFecha(r.fecha)}</td>
            <td class="text-end">${r.cantidadPedidos}</td>
            <td class="text-end rpt-num">${fmtMoney(r.totalFacturado)}</td>
            <td class="text-end rpt-num">${fmtMoney(r.totalCosto)}</td>
            <td class="text-end rpt-num rpt-num--ok">${fmtMoney(r.totalGanancia)}</td>
        </tr>`;

        const pedidos = r.pedidos || [];
        const head = `${thSelect()}<th class="rpt-col-expand"></th>
            <th>Partida</th><th>Fecha entrega</th><th>Cliente</th><th>Proveedor</th>
            <th class="text-end">Facturado</th><th class="text-end">Costo</th><th class="text-end">Ganancia</th>`;
        const colspanDia = contarColumnas(head);
        let body = '';
        pedidos.forEach(p => {
            body += filaPedidoConDetalle(p, {
                cols: [
                    tdExpand(p.idPedido, true),
                    celdaPartida(p.partida, p.idPedido),
                    `<td>${fmtFecha(p.fechaEntrega)}</td>`,
                    `<td>${esc(p.cliente || '—')}</td>`,
                    `<td>${esc(p.proveedor || '—')}</td>`,
                    `<td class="text-end rpt-num">${fmtMoney(p.monto)}</td>`,
                    `<td class="text-end rpt-num">${fmtMoney(p.costo)}</td>`,
                    `<td class="text-end rpt-num rpt-num--ok">${fmtMoney(p.ganancia)}</td>`
                ],
                colspan: colspanDia
            });
        });
        if (!body) body = `<tr><td colspan="${colspanDia}" class="rpt-empty-cell">Sin pedidos</td></tr>`;

        html += `<div class="rpt-acc-item is-open" data-acc>
            <button type="button" class="rpt-acc-trigger" aria-expanded="true">
                <span class="rpt-acc-chevron"><i class="fa fa-chevron-down"></i></span>
                <span class="rpt-acc-title"><i class="fa fa-calendar-o"></i> ${fmtFecha(r.fecha)}</span>
                <span class="rpt-acc-kpis">
                    <span class="rpt-acc-kpi">${r.cantidadPedidos} pedido${r.cantidadPedidos !== 1 ? 's' : ''}</span>
                    <span class="rpt-acc-kpi rpt-acc-kpi--accent">Facturado <strong>${fmtMoney(r.totalFacturado)}</strong></span>
                    <span class="rpt-acc-kpi">Costo <strong>${fmtMoney(r.totalCosto)}</strong></span>
                    <span class="rpt-acc-kpi rpt-acc-kpi--ok">Ganancia <strong>${fmtMoney(r.totalGanancia)}</strong></span>
                </span>
            </button>
            <div class="rpt-acc-body">${wrapTable(head, body)}</div>
        </div>`;
    });
    html += '</div>';

    const resumen = wrapTable(
        `${thSelect()}<th>Fecha</th><th class="text-end">Pedidos</th><th class="text-end">Facturado</th><th class="text-end">Costo</th><th class="text-end">Ganancia</th>`,
        resumenBody,
        `${tdSelect()}<td><strong>Total período</strong></td><td class="text-end"><strong>${tp}</strong></td>
         <td class="text-end rpt-num"><strong>${fmtMoney(tf)}</strong></td>
         <td class="text-end rpt-num"><strong>${fmtMoney(tc)}</strong></td>
         <td class="text-end rpt-num rpt-num--ok"><strong>${fmtMoney(tg)}</strong></td>`
    );

    document.getElementById('contenedorResultado').innerHTML =
        `<div class="rpt-section-label"><i class="fa fa-bar-chart"></i> Resumen del período</div>${resumen}${html}`;
    bindAccordion();
    bindExpandRows(true);
    bindRowSelection();
}

function renderGrupos(grupos) {
    if (!grupos?.length) return vacio();
    const esProv = reporteActivo.id === 'ec-proveedores';
    const esEvol = reporteActivo.id === 'evolucion-ventas';
    const paraCliente = reporteActivo.id === 'ec-para-cliente';
    const precioVenta = !esProv;

    let html = toolbarAcordeon() + '<div class="rpt-accordion-list">';
    grupos.forEach((g, idx) => {
        const totGan = g.totalGanancia != null
            ? `<span class="rpt-acc-kpi rpt-acc-kpi--ok">Ganancia <strong>${fmtMoney(g.totalGanancia)}</strong></span>` : '';
        const icon = esProv ? 'fa-truck' : 'fa-user-circle-o';
        html += `<div class="rpt-acc-item is-open" data-acc id="rpt-acc-${idx}">
            <button type="button" class="rpt-acc-trigger" aria-expanded="true">
                <span class="rpt-acc-chevron"><i class="fa fa-chevron-down"></i></span>
                <span class="rpt-acc-title"><i class="fa ${icon}"></i> ${esc(g.nombre)}</span>
                <span class="rpt-acc-kpis">
                    <span class="rpt-acc-kpi">${esc(g.etiquetaTotal || 'Total')}: <strong>${fmtMoney(g.totalSaldo)}</strong></span>
                    ${totGan}
                </span>
                <span class="rpt-acc-count">${(g.pedidos || []).length} pedido${(g.pedidos || []).length !== 1 ? 's' : ''}</span>
            </button>
            <div class="rpt-acc-body">
                ${tablaPedidosGrupo(g.pedidos, { esProv, esEvol, paraCliente, precioVenta })}
                ${esProv ? panelComposicionProveedor() : ''}
            </div>
        </div>`;
    });
    html += '</div>';
    document.getElementById('contenedorResultado').innerHTML = html;
    bindAccordion();
    bindExpandRows(precioVenta);
    if (esProv) bindComposicionProveedor();
    bindRowSelection();
}

function tablaPedidosGrupo(pedidos, opts) {
    const { esProv, esEvol, paraCliente, precioVenta } = opts;
    let head = `${thSelect()}<th class="rpt-col-expand"></th><th>Partida</th><th>Fecha entrega</th>`;
    if (esEvol) head += '<th class="text-end">Facturado</th><th class="text-end">Ganancia</th><th class="text-end">% Gan.</th>';
    else if (paraCliente) head += '<th class="text-end">Monto</th><th class="text-end">Haber</th><th class="text-end">Saldo</th>';
    else if (esProv) {
        head += '<th class="text-end">Monto</th><th class="text-end">Haber</th><th class="text-end">Saldo</th>';
        head += '<th>Cliente</th><th>Estado Cliente</th>';
        head += '<th class="rpt-col-check no-print" title="Marcar para exportar composición de saldos">Incluir</th>';
        head += '<th class="rpt-col-action no-print">Registrar pago</th>';
    } else {
        head += '<th class="text-end">Monto</th><th class="text-end">Haber</th><th class="text-end">Saldo</th>';
        head += '<th class="text-end">Ganancia</th><th>Proveedor</th><th>Pagado prov.</th>';
    }

    const colspan = contarColumnas(head);
    let body = '';
    (pedidos || []).forEach(p => {
        const cols = [tdExpand(p.idPedido, precioVenta), celdaPartida(p.partida, p.idPedido), `<td>${fmtFecha(p.fechaEntrega)}</td>`];
        if (esEvol) {
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.monto)}</td>`);
            cols.push(`<td class="text-end rpt-num rpt-num--ok">${fmtMoney(p.ganancia)}</td>`);
            cols.push(`<td class="text-end">${fmtPct(p.porcGanancia)}</td>`);
        } else if (paraCliente) {
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.monto)}</td>`);
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.haber)}</td>`);
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.saldo)}</td>`);
        } else if (esProv) {
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.monto)}</td>`);
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.haber)}</td>`);
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.saldo)}</td>`);
            cols.push(`<td>${esc(p.cliente || '—')}</td>`);
            cols.push(`<td>${badgeEstado(p.estadoCliente)}</td>`);
            cols.push(`<td class="rpt-col-check no-print" onclick="event.stopPropagation()">
                <input type="checkbox" class="form-check-input chk-pago-prov" data-id="${p.idPedido}" title="Incluir en composición de saldos" />
            </td>`);
            cols.push(`<td class="rpt-col-action no-print" onclick="event.stopPropagation()">
                <a href="/Pedidos/NuevoModif/${p.idPedido}" class="btn btn-rpt-ghost btn-sm rpt-btn-pagar-pedido" target="_blank" rel="noopener"
                   title="Abrir el pedido y cargar el pago en la pestaña Pagos proveedor">
                    <i class="fa fa-external-link"></i> Pagar en pedido
                </a>
            </td>`);
        } else {
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.monto)}</td>`);
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.haber)}</td>`);
            cols.push(`<td class="text-end rpt-num">${fmtMoney(p.saldo)}</td>`);
            cols.push(`<td class="text-end rpt-num rpt-num--ok">${fmtMoney(p.ganancia)}</td>`);
            cols.push(`<td>${esc(p.proveedor || '—')}</td>`);
            cols.push(`<td>${badgeSiNo(p.pagadoProveedor)}</td>`);
        }
        body += filaPedidoConDetalle(p, { cols, colspan });
    });
    if (!body) body = `<tr><td colspan="${colspan}" class="rpt-empty-cell">Sin pedidos</td></tr>`;
    return wrapTable(head, body);
}

function celdaPartida(partida, idPedido) {
    const txt = esc(partida || '—');
    const id = Number(idPedido);
    if (!id) return `<td><strong>${txt}</strong></td>`;
    const url = `/Pedidos/NuevoModif/${id}`;
    return `<td class="rpt-partida-cell">
        <span class="rpt-partida-wrap">
            <strong>${txt}</strong>
            <a href="${url}" class="rpt-pedido-link" target="_blank" rel="noopener noreferrer"
               title="Abrir pedido en nueva pestaña" onclick="event.stopPropagation()">
                <i class="fa fa-eye" aria-hidden="true"></i>
            </a>
        </span>
    </td>`;
}

function tdExpand(idPedido, precioVenta) {
    return `<td class="rpt-col-expand">${btnExpand(idPedido, precioVenta)}</td>`;
}

function filaPedidoConDetalle(p, { cols, colspan }) {
    const id = p.idPedido;
    return `<tr class="rpt-data-row" data-pedido="${id}" tabindex="0" role="row" aria-selected="false">
        ${tdSelect()}${cols.join('')}
    </tr>
    <tr class="rpt-detail-row d-none" data-detail-for="${id}">
        <td colspan="${colspan}"><div class="rpt-detail-inner" id="det-${id}"></div></td>
    </tr>`;
}

function bindAccordion() {
    document.querySelectorAll('.rpt-acc-trigger').forEach(btn => {
        btn.addEventListener('click', () => toggleAccItem(btn.closest('.rpt-acc-item')));
    });
    const plegar = document.getElementById('btnAccPlegar');
    const desplegar = document.getElementById('btnAccDesplegar');
    if (plegar) plegar.onclick = () => document.querySelectorAll('.rpt-acc-item').forEach(i => setAccOpen(i, false));
    if (desplegar) desplegar.onclick = () => document.querySelectorAll('.rpt-acc-item').forEach(i => setAccOpen(i, true));
}

function toggleAccItem(item) {
    if (!item) return;
    setAccOpen(item, !item.classList.contains('is-open'));
}

function setAccOpen(item, open) {
    item.classList.toggle('is-open', open);
    const btn = item.querySelector('.rpt-acc-trigger');
    const icon = item.querySelector('.rpt-acc-chevron i');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (icon) icon.className = open ? 'fa fa-chevron-down' : 'fa fa-chevron-right';
}

function badgeSiNo(texto) {
    const s = String(texto || '').toLowerCase();
    if (s === 'sí' || s === 'si' || s === 'yes') return '<span class="rpt-badge-si">Sí</span>';
    return '<span class="rpt-badge-no">No</span>';
}

function badgeEstado(estado) {
    if (!estado) return '—';
    if (String(estado).toLowerCase() === 'cobrado') return '<span class="rpt-badge-si">Cobrado</span>';
    return '<span class="rpt-badge-debe">Debe</span>';
}

function panelComposicionProveedor() {
    return `<div class="rpt-composicion-panel no-print">
        <div class="d-flex flex-wrap gap-2 align-items-center">
            <button type="button" class="btn btn-rpt-ghost btn-sm" id="btnIrPedidoPago" disabled title="Abrir un pedido marcado con Incluir">
                <i class="fa fa-external-link me-1"></i> Abrir pedido (1 incluido)
            </button>
            <div class="form-check mb-0">
                <input class="form-check-input" type="checkbox" id="chkMostrarCliente" checked />
                <label class="form-check-label" for="chkMostrarCliente">Cliente en composición</label>
            </div>
            <button type="button" class="btn btn-rpt-accent btn-sm" id="btnComposicionProv">
                <i class="fa fa-download me-1"></i> Exportar composición
            </button>
        </div>
    </div>`;
}

function actualizarPanelComposicionProveedor() {
    const btn = document.getElementById('btnIrPedidoPago');
    if (!btn) return;
    const n = pedidosSeleccionadosProveedor.size;
    btn.disabled = n !== 1;
    btn.innerHTML = n === 1
        ? '<i class="fa fa-external-link me-1"></i> Abrir pedido para pagar'
        : `<i class="fa fa-external-link me-1"></i> Abrir pedido (${n === 0 ? 'marcá 1 con Incluir' : 'solo 1 a la vez'})`;
}

function bindComposicionProveedor() {
    document.querySelectorAll('.chk-pago-prov').forEach(chk => {
        chk.addEventListener('change', () => {
            const id = parseInt(chk.dataset.id, 10);
            if (chk.checked) pedidosSeleccionadosProveedor.add(id);
            else pedidosSeleccionadosProveedor.delete(id);
            actualizarPanelComposicionProveedor();
        });
    });
    actualizarPanelComposicionProveedor();
    const btnComp = document.getElementById('btnComposicionProv');
    if (btnComp) btnComp.onclick = () => exportarComposicionProveedor();
    const btnIr = document.getElementById('btnIrPedidoPago');
    if (btnIr) {
        btnIr.onclick = () => {
            if (pedidosSeleccionadosProveedor.size !== 1) return;
            const id = [...pedidosSeleccionadosProveedor][0];
            window.open(`/Pedidos/NuevoModif/${id}`, '_blank', 'noopener');
        };
    }
}

function construirPayloadComposicionProveedor() {
    const mostrarCliente = document.getElementById('chkMostrarCliente')?.checked ?? true;
    const ids = [...pedidosSeleccionadosProveedor];
    const grupos = ultimoResultado || [];
    const hojas = [];

    grupos.forEach(g => {
        const pedidos = (g.pedidos || []).filter(p => ids.includes(p.idPedido));
        if (!pedidos.length) return;

        const headers = ['Partida', 'Fecha entrega', 'Monto', 'Saldo'];
        if (mostrarCliente) headers.push('Cliente');

        const rows = pedidos.map(p => {
            const row = [
                p.partida || '',
                fmtFecha(p.fechaEntrega),
                numExport(p.monto),
                numExport(p.saldo)
            ];
            if (mostrarCliente) row.push(p.cliente || '');
            return row;
        });

        const totalSaldo = pedidos.reduce((a, p) => a + (Number(p.saldo) || 0), 0);
        const totalRow = ['', '', 'Total saldo', numExport(totalSaldo)];
        if (mostrarCliente) totalRow.push('');
        rows.push(totalRow);

        hojas.push({
            nombre: (g.nombre || 'Proveedor').substring(0, 31),
            headers,
            rows
        });
    });

    return {
        titulo: 'Composición de saldos — Proveedor',
        filtros: `${ids.length} pedido${ids.length !== 1 ? 's' : ''} incluido${ids.length !== 1 ? 's' : ''}`
            + (mostrarCliente ? ' · Con columna cliente' : ' · Sin columna cliente'),
        generado: new Date().toLocaleString('es-AR'),
        hojas
    };
}

function exportarComposicionProveedor() {
    if (!pedidosSeleccionadosProveedor.size) {
        if (typeof errorModal === 'function') errorModal('Marcá al menos un pedido con la columna «Incluir».');
        return;
    }

    const payload = construirPayloadComposicionProveedor();
    if (!payload.hojas.length) {
        if (typeof errorModal === 'function') errorModal('No se encontraron pedidos marcados en el reporte actual.');
        return;
    }

    SistemaExport.abrir({
        titulo: 'Composición de saldos',
        subtitulo: 'Proveedor — pedidos marcados con Incluir',
        archivo: 'composicion-proveedor',
        getPayload: () => construirPayloadComposicionProveedor()
    });
}

async function exportarPrint() {
    setExportando(true, 'Preparando impresión…');
    await esperarPintado();
    try {
        window.print();
    } finally {
        setTimeout(() => setExportando(false), 400);
    }
}

function renderPagos(grupos) {
    if (!grupos?.length) return vacio();
    const precioVenta = reporteActivo.id === 'pagos-clientes';
    const esCli = precioVenta;
    let html = toolbarAcordeon() + '<div class="rpt-accordion-list">';
    grupos.forEach(g => {
        const head = `${thSelect()}<th class="rpt-col-expand"></th><th class="text-end">Monto</th><th>Método</th><th>Partida</th>
            ${esCli ? '<th>Cliente</th>' : '<th>Proveedor</th>'}<th>Fecha entrega</th>`;
        const colspan = contarColumnas(head);
        let body = '';
        (g.pagos || []).forEach(p => {
            const id = p.idPedido;
            const cols = [
                id ? tdExpand(id, precioVenta) : '<td class="rpt-col-expand"></td>',
                `<td class="text-end rpt-num"><strong>${fmtMoney(p.monto)}</strong></td>`,
                `<td>${esc(p.metodoPago)}</td>`,
                celdaPartida(p.partida, id),
                esCli ? `<td>${esc(p.cliente || '—')}</td>` : `<td>${esc(p.proveedor || '—')}</td>`,
                `<td>${fmtFecha(p.fechaEntrega)}</td>`
            ];
            if (id) body += filaPedidoConDetalle({ idPedido: id }, { cols, colspan });
            else {
                body += `<tr class="rpt-data-row" tabindex="0">${tdSelect()}${cols.join('')}</tr>`;
            }
        });
        if (!body) body = `<tr><td colspan="${colspan}" class="rpt-empty-cell">Sin pagos</td></tr>`;

        html += `<div class="rpt-acc-item is-open" data-acc>
            <button type="button" class="rpt-acc-trigger" aria-expanded="true">
                <span class="rpt-acc-chevron"><i class="fa fa-chevron-down"></i></span>
                <span class="rpt-acc-title"><i class="fa fa-calendar"></i> ${fmtFecha(g.fechaPago)}</span>
                <span class="rpt-acc-kpis">
                    <span class="rpt-acc-kpi rpt-acc-kpi--accent">Total del día <strong>${fmtMoney(g.totalDia)}</strong></span>
                </span>
                <span class="rpt-acc-count">${(g.pagos || []).length} pago${(g.pagos || []).length !== 1 ? 's' : ''}</span>
            </button>
            <div class="rpt-acc-body">${wrapTable(head, body)}</div>
        </div>`;
    });
    html += '</div>';
    document.getElementById('contenedorResultado').innerHTML = html;
    bindAccordion();
    bindExpandRows(precioVenta);
    bindRowSelection();
}

function variacionInfoClass(variacion) {
    const v = Number(variacion) || 0;
    if (v > 0) return ' rpt-info--up';
    if (v < 0) return ' rpt-info--down';
    return '';
}

function variacionTrendClass(pct) {
    const v = Number(pct);
    if (isNaN(v) || v === 0) return 'rpt-trend--flat';
    return v > 0 ? 'rpt-trend--up' : 'rpt-trend--down';
}

function fmtVariacionPct(pct) {
    const v = Number(pct);
    if (pct == null || isNaN(v)) return '';
    const s = v.toLocaleString('es-AR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
    return `${s}%`;
}

function calcVariacionMes(actual, anterior) {
    const cur = Number(actual) || 0;
    const prev = Number(anterior) || 0;
    if (prev === 0 && cur === 0) return null;
    if (prev === 0) return { pct: null, tag: 'nuevo' };
    return { pct: ((cur - prev) / prev) * 100, tag: null };
}

function badgeVariacionMes(variacion) {
    if (!variacion) return '';
    if (variacion.tag === 'nuevo') {
        return '<span class="rpt-mx-badge rpt-trend--new">Nuevo producto</span>';
    }
    const cls = variacionTrendClass(variacion.pct);
    const txt = fmtVariacionPct(variacion.pct);
    return `<span class="rpt-mx-badge ${cls}">${esc(txt)}</span>`;
}

function celdaMesEvolucionHtml(val, mesIdx, prevVal) {
    const v = Number(val) || 0;
    const has = v > 0;
    const variacion = mesIdx > 0 ? calcVariacionMes(v, prevVal) : null;
    const badge = badgeVariacionMes(variacion);
    const cellCls = has ? ' rpt-cell-has' : '';
    const trendWrap = badge ? `<div class="rpt-mx-trend">${badge}</div>` : '';
    return `<td class="text-end rpt-mx-cell${cellCls}"><div class="rpt-mx-val">${fmtNum(v)}</div>${trendWrap}</td>`;
}

function textoVariacionMesExport(val, mesIdx, prevVal) {
    if (mesIdx === 0) return fmtNum(val);
    const v = calcVariacionMes(val, prevVal);
    if (!v) return fmtNum(val);
    if (v.tag === 'nuevo') return `${fmtNum(val)} (Nuevo producto)`;
    return `${fmtNum(val)} (${fmtVariacionPct(v.pct)})`;
}

function renderInfoEvolucionHtml(fila, data) {
    const desde = fmtFecha(data?.fechaDesde);
    const hasta = fmtFecha(data?.fechaHasta);
    const ini = Number(fila.montoPrimerMes) || 0;
    const fin = Number(fila.montoUltimoMes) || 0;
    const diff = Number(fila.variacionMonto);
    const diffVal = isNaN(diff) ? fin - ini : diff;
    const pct = fila.variacionPorcentaje;
    const trendCls = variacionInfoClass(diffVal).trim() || 'rpt-info--flat';

    if (ini === 0 && fin === 0) {
        return `<div class="rpt-info-block ${trendCls}">
            <span class="rpt-info-dates">Del ${esc(desde)} al ${esc(hasta)}</span>
            <span class="rpt-info-msg">Sin facturación en el primer y último mes.</span>
        </div>`;
    }

    let mov = 'sin cambio';
    let movCls = 'rpt-info-tag--flat';
    if (diffVal > 0) { mov = 'Incremento'; movCls = 'rpt-info-tag--up'; }
    else if (diffVal < 0) { mov = 'Decremento'; movCls = 'rpt-info-tag--down'; }

    const pctBadge = pct != null && !isNaN(Number(pct))
        ? `<span class="rpt-info-badge ${variacionTrendClass(pct)}">${esc(fmtVariacionPct(pct))}</span>`
        : '';

    return `<div class="rpt-info-block ${trendCls}">
        <span class="rpt-info-dates">Del ${esc(desde)} al ${esc(hasta)}</span>
        <div class="rpt-info-head">
            <span class="rpt-info-tag ${movCls}">${esc(mov)}</span>
            ${pctBadge}
            <strong class="rpt-info-money">${esc(fmtMoney(Math.abs(diffVal)))}</strong>
        </div>
        <span class="rpt-info-detail">${esc(fmtMoney(ini))} → ${esc(fmtMoney(fin))}</span>
    </div>`;
}

function textoInformacionEvolucion(fila, data) {
    const desde = fmtFecha(data?.fechaDesde);
    const hasta = fmtFecha(data?.fechaHasta);
    const ini = Number(fila.montoPrimerMes) || 0;
    const fin = Number(fila.montoUltimoMes) || 0;
    const diff = Number(fila.variacionMonto);
    const diffVal = isNaN(diff) ? fin - ini : diff;
    if (ini === 0 && fin === 0) {
        return `Del ${desde} al ${hasta}: sin facturación en el primer y último mes del período.`;
    }
    let mov = 'sin cambio';
    if (diffVal > 0) mov = 'incremento';
    else if (diffVal < 0) mov = 'decremento';
    const pct = fila.variacionPorcentaje;
    const pctTxt = pct != null && !isNaN(Number(pct))
        ? ` (${Number(pct).toLocaleString('es-AR', { maximumFractionDigits: 2, signDisplay: 'exceptZero' })}%)`
        : '';
    return `Del ${desde} al ${hasta}: ${mov} de ${fmtMoney(Math.abs(diffVal))} en facturación ` +
        `(primer mes ${fmtMoney(ini)} → último mes ${fmtMoney(fin)})${pctTxt}.`;
}

function matrixColgroup(meses) {
    const cols = [
        '<col class="rpt-mx-col-select" />',
        '<col class="rpt-mx-col-product" />',
        '<col class="rpt-mx-col-unit" />',
        ...meses.map(() => '<col class="rpt-mx-col-month" />'),
        '<col class="rpt-mx-col-info" />'
    ];
    return `<colgroup>${cols.join('')}</colgroup>`;
}

function renderEvolucionProducto(data) {
    const meses = data.meses || [];
    const filas = data.filas || [];
    if (!filas.length) return vacio();

    const cg = matrixColgroup(meses);
    let head = `${thSelect()}<th class="sticky-col">Producto</th><th>Unidad</th>`;
    meses.forEach(m => { head += `<th class="text-end">${fmtMes(m)}</th>`; });
    head += '<th class="rpt-col-info">Información</th>';

    let body = '';
    filas.forEach(f => {
        const infoCls = variacionInfoClass(f.variacionMonto);
        const infoHtml = renderInfoEvolucionHtml(f, data);
        body += `<tr class="rpt-data-row" tabindex="0">${tdSelect()}<td class="sticky-col"><strong>${esc(f.producto)}</strong></td><td>${esc(f.unidad || '—')}</td>`;
        meses.forEach((m, idx) => {
            const v = f.cantidadesPorMes?.[m] ?? 0;
            const prev = idx > 0 ? (f.cantidadesPorMes?.[meses[idx - 1]] ?? 0) : 0;
            body += celdaMesEvolucionHtml(v, idx, prev);
        });
        body += `<td class="rpt-col-info${infoCls}">${infoHtml}</td></tr>`;
    });

    document.getElementById('contenedorResultado').innerHTML =
        `<div class="rpt-matrix-scroll" data-rpt-matrix-scroll>
            <div class="rpt-hscroll-top">
                <span class="rpt-hscroll-hint"><i class="fa fa-arrows-h"></i> Deslizá para ver más meses</span>
                <div class="rpt-hscroll-track" data-rpt-hscroll>
                    <div class="rpt-hscroll-track-inner"></div>
                </div>
            </div>
            <div class="rpt-matrix-outer" data-rpt-matrix-body>
                <table class="rpt-table rpt-table--matrix">${cg}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
            </div>
        </div>`;
    bindRowSelection();
    bindMatrixHorizontalScroll();
}

function bindMatrixHorizontalScroll() {
    document.querySelectorAll('[data-rpt-matrix-scroll]').forEach(root => {
        if (root.dataset.matrixBound === '1') return;
        root.dataset.matrixBound = '1';

        const outer = root.querySelector('[data-rpt-matrix-body]');
        const track = root.querySelector('[data-rpt-hscroll]');
        const spacer = track?.querySelector('.rpt-hscroll-track-inner');
        const topBar = root.querySelector('.rpt-hscroll-top');
        if (!outer || !track || !spacer) return;

        const medirAnchoTabla = () => {
            const table = outer.querySelector('.rpt-table--matrix');
            return table?.scrollWidth || table?.offsetWidth || 0;
        };

        let syncing = false;
        let anchoTabla = 0;

        const syncScroll = (from, to) => {
            if (!to || syncing) return;
            const left = Math.round(from.scrollLeft);
            if (Math.round(to.scrollLeft) === left) return;
            syncing = true;
            to.scrollLeft = left;
            queueMicrotask(() => { syncing = false; });
        };

        const ajustar = () => {
            const w = medirAnchoTabla();
            if (w <= 0) return;
            if (Math.abs(w - anchoTabla) < 2) return;
            anchoTabla = w;
            spacer.style.width = `${w}px`;
            const need = w > outer.clientWidth + 4;
            if (topBar) topBar.style.display = need ? '' : 'none';
            if (!need) {
                outer.scrollLeft = 0;
                track.scrollLeft = 0;
            }
        };

        outer.scrollLeft = 0;
        track.scrollLeft = 0;
        requestAnimationFrame(() => requestAnimationFrame(ajustar));

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(ajustar, 200);
        });

        track.addEventListener('scroll', () => syncScroll(track, outer), { passive: true });
        outer.addEventListener('scroll', () => syncScroll(outer, track), { passive: true });
    });
}

function btnExpand(idPedido, precioVenta) {
    return `<button type="button" class="rpt-expand-btn" data-expand="${idPedido}" data-pv="${precioVenta ? '1' : '0'}" title="Ver ítems del pedido">
        <i class="fa fa-plus"></i></button>`;
}

function bindExpandRows() {
    document.querySelectorAll('[data-expand]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.expand;
            const detailRow = document.querySelector(`tr.rpt-detail-row[data-detail-for="${id}"]`);
            const box = document.getElementById(`det-${id}`);
            if (!box || !detailRow) return;
            const icon = btn.querySelector('i');
            if (!detailRow.classList.contains('d-none')) {
                detailRow.classList.add('d-none');
                btn.classList.remove('is-open');
                icon.className = 'fa fa-plus';
                return;
            }
            const pv = btn.dataset.pv === '1';
            detailRow.classList.remove('d-none');
            btn.classList.add('is-open');
            icon.className = 'fa fa-minus';
            box.innerHTML = '<div class="rpt-detail-loading"><i class="fa fa-spinner fa-spin"></i> Cargando ítems…</div>';
            try {
                const res = await fetch(`/Reportes/DetallePedido?id=${id}&precioVenta=${pv}`);
                if (!res.ok) throw new Error();
                const det = normDetallePedido(await res.json());
                box.innerHTML = renderDetalleProductos(det, pv);
            } catch {
                box.innerHTML = '<div class="rpt-detail-error">No se pudo cargar el detalle.</div>';
            }
        });
    });
}

function normDetallePedido(d) {
    return {
        partida: val(d, 'partida'),
        cliente: val(d, 'cliente'),
        proveedor: val(d, 'proveedor'),
        productos: (val(d, 'productos') || []).map(p => ({
            producto: val(p, 'producto'),
            unidad: val(p, 'unidad'),
            cantidad: val(p, 'cantidad'),
            cantidadUsadaAcopio: val(p, 'cantidadUsadaAcopio'),
            productoCantidad: val(p, 'productoCantidad'),
            precioCosto: val(p, 'precioCosto'),
            precioVenta: val(p, 'precioVenta'),
            totalLinea: val(p, 'totalLinea')
        }))
    };
}

function factorBultoDetalle(p) {
    const f = Number(p.productoCantidad);
    return f > 0 ? f : 1;
}

function calcImporteLineaDetalle(p, precioVenta) {
    const pr = precioVenta ? (Number(p.precioVenta) || 0) : (Number(p.precioCosto) || 0);
    const cant = (Number(p.cantidad) || 0) + (Number(p.cantidadUsadaAcopio) || 0);
    return pr * cant * factorBultoDetalle(p);
}

function fmtCantidadDetallePedido(p) {
    const cant = Number(p.cantidad) || 0;
    const acopio = Number(p.cantidadUsadaAcopio) || 0;
    let s = fmtNum(cant);
    if (acopio > 0) s += `<br><small class="rpt-detail-sub">+ ${fmtNum(acopio)} acopio</small>`;
    return s;
}

function renderDetalleProductos(det, precioVenta) {
    const col = precioVenta ? 'Precio unit. (ARS)' : 'Precio costo (ARS)';
    const prods = det.productos || [];
    if (!prods.length) return '<div class="rpt-detail-empty">Sin productos en este pedido</div>';

    let meta = '';
    if (det.cliente) meta += `<span><i class="fa fa-user"></i> ${esc(det.cliente)}</span>`;
    if (det.proveedor) meta += `<span><i class="fa fa-truck"></i> ${esc(det.proveedor)}</span>`;

    let body = '';
    let sumImporte = 0;
    prods.forEach(p => {
        const pr = precioVenta ? p.precioVenta : p.precioCosto;
        const factor = factorBultoDetalle(p);
        const imp = calcImporteLineaDetalle(p, precioVenta);
        sumImporte += imp;
        body += `<tr>
            <td>${esc(p.producto)}</td>
            <td>${esc(p.unidad)}</td>
            <td class="text-end">${fmtCantidadDetallePedido(p)}</td>
            <td class="text-end rpt-num">${fmtNum(factor)}</td>
            <td class="text-end rpt-num">${fmtMoney(pr)}</td>
            <td class="text-end rpt-num"><strong>${fmtMoney(imp)}</strong></td>
        </tr>`;
    });
    body += `<tr class="rpt-detail-total-row">
        <td colspan="5" class="text-end"><strong>Total productos</strong></td>
        <td class="text-end rpt-num"><strong>${fmtMoney(sumImporte)}</strong></td>
    </tr>`;

    return `${meta ? `<div class="rpt-detail-header">${meta}</div>` : ''}
        ${wrapTable(
            `<th>Producto</th><th>Unidad</th><th class="text-end">Cantidad</th><th class="text-end">Producto cantidad</th><th class="text-end">${col}</th><th class="text-end">Importe</th>`,
            body
        )}`;
}

function vacio() {
    document.getElementById('contenedorResultado').innerHTML = `
        <div class="rpt-empty">
            <i class="fa fa-inbox"></i>
            <p>No hay datos para los filtros seleccionados.</p>
        </div>`;
}

function initModalExportar() {
    document.getElementById('btnExportar')?.addEventListener('click', abrirModalExportar);
}

function textoCeldaDom(td) {
    if (!td) return '';
    const cl = td.cloneNode(true);
    cl.querySelectorAll('button, input, select, .rpt-expand-btn, .rpt-row-select-mark, .acciones-dropdown').forEach(el => el.remove());
    cl.querySelectorAll('i.fa').forEach(el => el.remove());
    return (cl.textContent || '').replace(/\s+/g, ' ').trim();
}

function thExportable(th) {
    return th && !th.classList.contains('rpt-col-select')
        && !th.classList.contains('rpt-col-expand')
        && !th.classList.contains('rpt-col-check')
        && !th.classList.contains('rpt-col-action');
}

function sanitizarNombreHoja(n) {
    return String(n || 'Hoja').replace(/[\\/*?:\[\]]/g, '').replace(/\s+/g, ' ').trim().substring(0, 31) || 'Hoja';
}

function nombreHojaUnico(base, usados) {
    let n = sanitizarNombreHoja(base);
    let i = 2;
    while (usados.has(n)) {
        n = sanitizarNombreHoja(`${base} ${i}`);
        i++;
    }
    usados.add(n);
    return n;
}

function extraerTablaDom(table, opts = {}) {
    const { soloSeleccion = false } = opts;
    let headerRow = table.querySelector('thead tr');
    const matrixRoot = table.closest('[data-rpt-matrix-scroll]');
    if (!headerRow && matrixRoot) {
        headerRow = matrixRoot.querySelector('.rpt-matrix-head thead tr');
    }
    if (!headerRow) return { headers: [], rows: [] };

    const ths = [...headerRow.querySelectorAll('th')];
    const colMap = [];
    const headers = [];
    ths.forEach((th, i) => {
        if (!thExportable(th)) return;
        colMap.push(i);
        headers.push(textoCeldaDom(th) || `Col ${i + 1}`);
    });
    if (!colMap.length) return { headers: [], rows: [] };

    const rows = [];
    const pushRow = (tr) => {
        const tds = [...tr.querySelectorAll('td')];
        const cells = colMap.map(i => textoCeldaDom(tds[i]));
        if (cells.some(c => c !== '')) rows.push(cells);
    };

    table.querySelectorAll('tbody tr').forEach(tr => {
        if (tr.classList.contains('rpt-detail-row')) return;
        if (tr.querySelector('.rpt-empty-cell')) return;
        if (!tr.classList.contains('rpt-data-row')) return;
        if (soloSeleccion && !tr.classList.contains('is-selected')) return;
        pushRow(tr);
    });

    table.querySelectorAll('tfoot tr').forEach(tr => pushRow(tr));

    return { headers, rows };
}

function hayFilasSeleccionadasEnVista() {
    return !!document.querySelector('#contenedorResultado tr.rpt-data-row.is-selected');
}

/** Exporta lo que el usuario ve: acordeón abierto, filas seleccionadas y detalle expandido */
function construirPayloadDesdeVista() {
    const root = document.getElementById('contenedorResultado');
    if (!root || root.querySelector('.rpt-empty')) {
        throw new Error('No hay resultados visibles para exportar.');
    }

    const soloSeleccion = hayFilasSeleccionadasEnVista();
    const usados = new Set();
    const hojas = [];
    const notas = [obtenerTextoFiltrosExport()];
    if (soloSeleccion) notas.push('Solo filas seleccionadas');
    else notas.push('Secciones desplegadas en pantalla');

    root.querySelectorAll('.rpt-table').forEach(table => {
        if (table.closest('tr.rpt-detail-row')) return;
        if (table.closest('.rpt-matrix-head')) return;

        const acc = table.closest('.rpt-acc-item');
        if (acc && !acc.classList.contains('is-open')) return;

        const { headers, rows } = extraerTablaDom(table, { soloSeleccion });
        if (!headers.length || !rows.length) return;

        let nombre = reporteActivo.titulo;
        if (acc) {
            nombre = acc.querySelector('.rpt-acc-title')?.textContent?.replace(/\s+/g, ' ').trim() || nombre;
        } else {
            const wrap = table.closest('.rpt-table-wrap, .rpt-matrix-wrap');
            const label = wrap?.previousElementSibling;
            if (label?.classList?.contains('rpt-section-label')) {
                nombre = label.textContent.replace(/\s+/g, ' ').trim();
            }
        }

        hojas.push({ nombre: nombreHojaUnico(nombre, usados), headers, rows });
    });

    root.querySelectorAll('tr.rpt-detail-row:not(.d-none) .rpt-table').forEach(table => {
        const detailTr = table.closest('tr.rpt-detail-row');
        const idPedido = detailTr?.dataset?.detailFor || '';
        const mainRow = idPedido
            ? root.querySelector(`tr.rpt-data-row[data-pedido="${idPedido}"]`)
            : null;
        if (soloSeleccion && mainRow && !mainRow.classList.contains('is-selected')) return;

        const { headers, rows } = extraerTablaDom(table, { soloSeleccion: false });
        if (!headers.length || !rows.length) return;

        const partida = mainRow?.querySelector('td strong')?.textContent?.trim()
            || mainRow?.querySelector('td')?.textContent?.trim()
            || idPedido
            || 'pedido';
        hojas.push({
            nombre: nombreHojaUnico(`Detalle ${partida}`, usados),
            headers,
            rows
        });
    });

    return {
        titulo: reporteActivo.titulo,
        filtros: notas.filter(Boolean).join(' · '),
        generado: new Date().toLocaleString('es-AR'),
        contexto: reporteActivo.id,
        hojas
    };
}

function filtrarDiasPedidosParaExportacion() {
    const root = document.getElementById('contenedorResultado');
    if (!root) return ultimoResultado || [];

    const soloSeleccion = hayFilasSeleccionadasEnVista();
    const idsPermitidos = new Set();
    let hayAbierto = false;

    root.querySelectorAll('.rpt-acc-item').forEach(acc => {
        if (!acc.classList.contains('is-open')) return;
        hayAbierto = true;
        acc.querySelectorAll('tr.rpt-data-row[data-pedido]').forEach(tr => {
            if (soloSeleccion && !tr.classList.contains('is-selected')) return;
            const id = parseInt(tr.dataset.pedido, 10);
            if (!isNaN(id)) idsPermitidos.add(id);
        });
    });

    if (soloSeleccion || hayAbierto) {
        if (!idsPermitidos.size) return [];
        return (ultimoResultado || [])
            .map(dia => ({
                ...dia,
                pedidos: (dia.pedidos || []).filter(p => idsPermitidos.has(p.idPedido))
            }))
            .filter(dia => (dia.pedidos || []).length > 0);
    }

    return ultimoResultado || [];
}

async function cargarDetallesPedidosMap(pedidos) {
    const map = new Map();
    const lista = [...pedidos];
    await Promise.all(lista.map(async p => {
        const id = p.idPedido;
        if (!id || map.has(id)) return;
        try {
            const res = await fetch(`/Reportes/DetallePedido?id=${id}&precioVenta=true`);
            if (res.ok) map.set(id, normDetallePedido(await res.json()));
        } catch { /* omitir detalle si falla */ }
    }));
    return map;
}

function varianteExportPedidos(reporteId) {
    if (reporteId === 'pedidos-dia') return 'dia';
    if (reporteId === 'ec-para-cliente') return 'paraCliente';
    if (reporteId === 'ec-proveedores') return 'proveedor';
    if (reporteId === 'evolucion-ventas') return 'evolucion';
    return 'cliente';
}

/** Hoja Excel plana: totales por grupo (con fila de suma general) */
function construirHojaResumenGruposExport(grupos, reporteId) {
    const esEvol = reporteId === 'evolucion-ventas';
    if (esEvol) {
        const rows = [];
        let tf = 0;
        let tg = 0;
        (grupos || []).forEach(g => {
            const fact = Number(g.totalSaldo) || 0;
            const gan = Number(g.totalGanancia) || 0;
            tf += fact;
            tg += gan;
            rows.push([g.nombre || '—', fact, gan, fact > 0 ? gan / fact : 0]);
        });
        return {
            nombre: 'Resumen por grupo',
            layout: 'tabla-plana',
            titulo: 'Resumen por grupo',
            headers: ['Grupo', 'Facturado', 'Ganancia', '% Ganancia'],
            rows,
            footer: ['Total general', tf, tg, tf > 0 ? tg / tf : 0],
            columnTypes: ['text', 'money', 'money', 'pct']
        };
    }

    const rows = [];
    let total = 0;
    (grupos || []).forEach(g => {
        const t = Number(g.totalSaldo) || 0;
        total += t;
        rows.push([g.nombre || '—', g.etiquetaTotal || 'Total', t]);
    });
    return {
        nombre: 'Resumen por grupo',
        layout: 'tabla-plana',
        titulo: 'Resumen por grupo',
        headers: ['Grupo', 'Etiqueta total', 'Total'],
        rows,
        footer: ['Total general', '', total],
        columnTypes: ['text', 'text', 'money']
    };
}

function filaDetallePlanoExport(nombreGrupo, p, variante) {
    const row = [nombreGrupo || '', p.partida || '', p.fechaEntregaIso || p.fechaEntrega];
    if (variante === 'evolucion') {
        row.push(
            Number(p.monto) || 0,
            Number(p.ganancia) || 0,
            Number(p.porcGanancia) || 0
        );
        return { row, columnTypes: ['text', 'text', 'fecha', 'money', 'money', 'pct'] };
    }
    if (variante === 'paraCliente') {
        row.push(Number(p.monto) || 0, Number(p.haber) || 0, Number(p.saldo) || 0);
        return { row, columnTypes: ['text', 'text', 'fecha', 'money', 'money', 'money'] };
    }
    if (variante === 'proveedor') {
        row.push(
            Number(p.monto) || 0, Number(p.haber) || 0, Number(p.saldo) || 0,
            p.cliente || '', p.estadoCliente || ''
        );
        return { row, columnTypes: ['text', 'text', 'fecha', 'money', 'money', 'money', 'text', 'text'] };
    }
    if (variante === 'dia') {
        row.push(
            p.cliente || '', p.proveedor || '',
            Number(p.monto) || 0, Number(p.costo) || 0, Number(p.ganancia) || 0
        );
        return { row, columnTypes: ['text', 'text', 'fecha', 'text', 'text', 'money', 'money', 'money'] };
    }
    row.push(
        Number(p.monto) || 0, Number(p.haber) || 0, Number(p.saldo) || 0,
        Number(p.ganancia) || 0, p.proveedor || '', p.pagadoProveedor || ''
    );
    return {
        row,
        columnTypes: ['text', 'text', 'fecha', 'money', 'money', 'money', 'money', 'text', 'text']
    };
}

function construirHojaDetallePlanoExport(grupos, detallesMap, variante) {
    const headersPorVariante = {
        evolucion: ['Grupo', 'Partida', 'Fecha entrega', 'Facturado', 'Ganancia', '% Ganancia'],
        paraCliente: ['Grupo', 'Partida', 'Fecha entrega', 'Monto', 'Haber', 'Saldo'],
        proveedor: ['Grupo', 'Partida', 'Fecha entrega', 'Monto', 'Haber', 'Saldo', 'Cliente', 'Estado cliente'],
        dia: ['Grupo', 'Partida', 'Fecha entrega', 'Cliente', 'Proveedor', 'Facturado', 'Costo', 'Ganancia'],
        cliente: ['Grupo', 'Partida', 'Fecha entrega', 'Monto', 'Haber', 'Saldo', 'Ganancia', 'Proveedor', 'Pagado prov.']
    };
    const headers = headersPorVariante[variante] || headersPorVariante.cliente;
    const rows = [];
    let columnTypes = null;

    (grupos || []).forEach(g => {
        const pedidos = (g.pedidos || []).map(p =>
            pedidoABloqueExport(p, detallesMap.get(p.idPedido), variante)
        );
        pedidos.forEach(p => {
            const { row, columnTypes: tipos } = filaDetallePlanoExport(g.nombre, p, variante);
            rows.push(row);
            columnTypes = tipos;
        });
    });

    return {
        nombre: 'Detalle pedidos',
        layout: 'tabla-plana',
        titulo: 'Detalle pedidos',
        headers,
        rows,
        columnTypes: columnTypes || headers.map(() => 'text')
    };
}

function pedidoABloqueExport(p, det, variante) {
    const prods = (det?.productos || []).map(pr => ({
        producto: pr.producto || '',
        unidad: pr.unidad || '',
        cantidad: Number(pr.cantidad) || 0,
        cantidadUsadaAcopio: Number(pr.cantidadUsadaAcopio) || 0,
        productoCantidad: Number(pr.productoCantidad) || 1,
        precioVenta: Number(pr.precioVenta) || 0,
        precioCosto: Number(pr.precioCosto) || 0,
        importe: calcImporteLineaDetalle(pr, true)
    }));
    return {
        partida: p.partida || '',
        fechaEntrega: fmtFecha(p.fechaEntrega),
        fechaEntregaIso: fechaSoloDia(p.fechaEntrega),
        cliente: p.cliente || '',
        proveedor: p.proveedor || '',
        monto: Number(p.monto) || 0,
        costo: Number(p.costo) || 0,
        ganancia: Number(p.ganancia) || 0,
        haber: Number(p.haber) || 0,
        saldo: Number(p.saldo) || 0,
        porcGanancia: Number(p.porcGanancia) || 0,
        estadoCliente: textoEstadoExport(p.estadoCliente),
        pagadoProveedor: textoSiNoExport(p.pagadoProveedor),
        variante: variante || 'dia',
        productos: prods
    };
}

function filtrarGruposParaExportacion() {
    const root = document.getElementById('contenedorResultado');
    if (!root) return ultimoResultado || [];

    const soloSeleccion = hayFilasSeleccionadasEnVista();
    const idsPermitidos = new Set();
    let hayAbierto = false;

    root.querySelectorAll('.rpt-acc-item').forEach(acc => {
        if (!acc.classList.contains('is-open')) return;
        hayAbierto = true;
        acc.querySelectorAll('tr.rpt-data-row[data-pedido]').forEach(tr => {
            if (soloSeleccion && !tr.classList.contains('is-selected')) return;
            const id = parseInt(tr.dataset.pedido, 10);
            if (!isNaN(id)) idsPermitidos.add(id);
        });
    });

    if (soloSeleccion || hayAbierto) {
        if (!idsPermitidos.size) return [];
        return (ultimoResultado || [])
            .map(g => ({
                ...g,
                pedidos: (g.pedidos || []).filter(p => idsPermitidos.has(p.idPedido))
            }))
            .filter(g => (g.pedidos || []).length > 0);
    }

    return ultimoResultado || [];
}

function notasExportacionPedidos() {
    const notas = [obtenerTextoFiltrosExport()];
    if (hayFilasSeleccionadasEnVista()) notas.push('Solo filas seleccionadas');
    else if (document.querySelector('#contenedorResultado .rpt-acc-item.is-open')) {
        notas.push('Secciones desplegadas en pantalla');
    } else {
        notas.push('Todos los pedidos del período');
    }
    notas.push('Diseño con encabezado de pedido y detalle de productos');
    return notas.filter(Boolean).join(' · ');
}

/** Exportación estructurada: una sola hoja, diseño tipo pantalla (día/grupo → pedido → productos) */
async function construirPayloadExportacionPedidosEstructurado(opciones = {}) {
    const usarVista = opciones.desdeVista !== false;
    const id = reporteActivo.id;
    const variante = varianteExportPedidos(id);
    const bloques = [];
    let tf = 0, tc = 0, tg = 0, tp = 0;

    if (id === 'pedidos-dia') {
        const dias = usarVista ? filtrarDiasPedidosParaExportacion() : (ultimoResultado || []);
        if (!dias.length) {
            throw new Error('Desplegá al menos un día, seleccioná pedidos o generá el reporte nuevamente.');
        }

        const resumenRows = [];
        dias.forEach(d => {
            resumenRows.push([
                fmtFecha(d.fecha),
                String(d.cantidadPedidos ?? 0),
                fmtMoney(d.totalFacturado),
                fmtMoney(d.totalCosto),
                fmtMoney(d.totalGanancia)
            ]);
            tp += Number(d.cantidadPedidos) || 0;
            tf += Number(d.totalFacturado) || 0;
            tc += Number(d.totalCosto) || 0;
            tg += Number(d.totalGanancia) || 0;
        });

        bloques.push({
            tipo: 'resumen-tabla',
            titulo: 'Resumen del período',
            headers: ['Fecha', 'Pedidos', 'Facturado', 'Costo', 'Ganancia'],
            rows: resumenRows,
            footer: ['Total período', String(tp), fmtMoney(tf), fmtMoney(tc), fmtMoney(tg)],
            columnTypes: ['fecha', 'text', 'money', 'money', 'money']
        });

        const todosPedidos = [];
        dias.forEach(d => (d.pedidos || []).forEach(p => todosPedidos.push(p)));
        if (!todosPedidos.length) {
            throw new Error('No hay pedidos para exportar con los filtros actuales.');
        }
        const detallesMap = await cargarDetallesPedidosMap(todosPedidos);

        for (const dia of dias) {
            const pedidos = (dia.pedidos || []).map(p =>
                pedidoABloqueExport(p, detallesMap.get(p.idPedido), variante)
            );
            if (!pedidos.length) continue;
            bloques.push({
                tipo: 'dia',
                titulo: fmtFecha(dia.fecha),
                fecha: fmtFecha(dia.fecha),
                fechaIso: fechaSoloDia(dia.fecha),
                cantidadPedidos: dia.cantidadPedidos,
                totalFacturado: dia.totalFacturado,
                totalCosto: dia.totalCosto,
                totalGanancia: dia.totalGanancia,
                pedidos
            });
        }

        bloques.push({
            tipo: 'total-periodo',
            cantidadPedidos: tp,
            totalFacturado: tf,
            totalCosto: tc,
            totalGanancia: tg
        });
    } else {
        const grupos = usarVista ? filtrarGruposParaExportacion() : (ultimoResultado || []);
        if (!grupos.length) {
            throw new Error('Desplegá al menos un grupo, seleccioná pedidos o generá el reporte nuevamente.');
        }

        const todosPedidos = [];
        grupos.forEach(g => (g.pedidos || []).forEach(p => todosPedidos.push(p)));
        if (!todosPedidos.length) {
            throw new Error('No hay pedidos para exportar con los filtros actuales.');
        }
        const detallesMap = await cargarDetallesPedidosMap(todosPedidos);

        const resumenHoja = construirHojaResumenGruposExport(grupos, id);
        const hojas = [
            resumenHoja,
            construirHojaDetallePlanoExport(grupos, detallesMap, variante)
        ];

        bloques.unshift({
            tipo: 'resumen-tabla',
            titulo: resumenHoja.titulo,
            headers: resumenHoja.headers,
            rows: resumenHoja.rows.map(r => r.map((c, i) => {
                const t = resumenHoja.columnTypes[i];
                if (t === 'money') return fmtMoney(c);
                if (t === 'pct') return fmtPct(c);
                return c;
            })),
            footer: resumenHoja.footer?.map((c, i) => {
                const t = resumenHoja.columnTypes[i];
                if (t === 'money') return fmtMoney(c);
                if (t === 'pct') return fmtPct(c);
                return c;
            })
        });

        for (const g of grupos) {
            const pedidos = (g.pedidos || []).map(p =>
                pedidoABloqueExport(p, detallesMap.get(p.idPedido), variante)
            );
            if (!pedidos.length) continue;
            bloques.push({
                tipo: 'grupo',
                nombre: g.nombre || '—',
                etiquetaTotal: g.etiquetaTotal || 'Total',
                totalSaldo: g.totalSaldo,
                totalGanancia: g.totalGanancia,
                pedidos
            });
        }

        const nombreDetalle = id === 'evolucion-ventas'
            ? 'Detalle por grupo'
            : reporteActivo.titulo.substring(0, 31);
        hojas.push({
            nombre: nombreDetalle,
            layout: 'estructurado',
            bloques
        });

        return {
            titulo: reporteActivo.titulo,
            filtros: notasExportacionPedidos(),
            metaFiltros: obtenerFilasMetaExport(),
            generado: new Date().toLocaleString('es-AR'),
            contexto: id,
            hojas
        };
    }

    return {
        titulo: reporteActivo.titulo,
        filtros: notasExportacionPedidos(),
        metaFiltros: obtenerFilasMetaExport(),
        generado: new Date().toLocaleString('es-AR'),
        contexto: id,
        hojas: [{
            nombre: reporteActivo.titulo.substring(0, 31),
            layout: 'estructurado',
            bloques
        }]
    };
}

async function obtenerPayloadExportacionReportes() {
    if (REPORTES_EXPORT_PEDIDOS.includes(reporteActivo.id)) {
        return construirPayloadExportacionPedidosEstructurado({ desdeVista: true });
    }

    const vista = construirPayloadDesdeVista();
    if (vista.hojas.length) return vista;
    const completo = construirPayloadExportacion();
    if (completo.hojas.length) {
        completo.filtros = [completo.filtros, 'Datos completos del reporte (sin filtro de vista)'].filter(Boolean).join(' · ');
        return completo;
    }
    throw new Error('Desplegá al menos una sección, seleccioná filas o generá el reporte nuevamente.');
}

function abrirModalExportar() {
    const subtituloPedidos = REPORTES_EXPORT_PEDIDOS.includes(reporteActivo.id)
        ? 'Excel con agrupación por día/cliente, estilos y detalle de productos (como plantilla Reportes AGS MAT)'
        : 'Exportar lo visible en pantalla (secciones abiertas y filas seleccionadas)';
    SistemaExport.abrir({
        titulo: reporteActivo.titulo,
        subtitulo: subtituloPedidos,
        archivo: `reporte-${reporteActivo.id}`,
        validar: () => {
            if (!ultimoResultado) return 'Generá un reporte antes de exportar.';
            const root = document.getElementById('contenedorResultado');
            if (root?.querySelector('.rpt-empty')) return 'No hay datos para exportar.';
            if (!root?.querySelector('.rpt-table')) return 'No hay tablas en pantalla.';
            return null;
        },
        getPayload: async () => {
            if (REPORTES_EXPORT_PEDIDOS.includes(reporteActivo.id)) {
                if (typeof SistemaExport?.setProcesando === 'function') {
                    SistemaExport.setProcesando(true, 'Preparando pedidos y productos…');
                }
            }
            return obtenerPayloadExportacionReportes();
        }
    });
}

/** Filas superiores del Excel (como plantilla: Fecha desde / hasta, etc.) */
function obtenerFilasMetaExport() {
    const f = obtenerFiltro();
    const filas = [];
    if (f.fechaDesde || f.fechaHasta) {
        filas.push(['Fecha desde', f.fechaDesde || '—', '', 'Fecha hasta', f.fechaHasta || '—']);
    }
    const nombresCheck = (key, items) => {
        const ids = obtenerIdsFiltroCheck(key);
        if (!ids.length) return null;
        const wrap = document.querySelector(`[data-check-filtro="${key}"]`);
        if (wrap?.closest('.d-none')) return null;
        return ids.map(id => items.find(x => x.id === id)?.nombre || `#${id}`).join(', ');
    };
    const cli = nombresCheck('cliente', catalogos.clientes);
    if (cli) filas.push(['Clientes', cli]);
    const prov = nombresCheck('proveedor', catalogos.proveedores);
    if (prov) filas.push(['Proveedores', prov]);
    const prod = nombresCheck('producto', checkFiltroItems.producto);
    if (prod) filas.push(['Productos', prod]);
    if (document.getElementById('filtroSoloSaldo')?.checked) {
        filas.push(['Filtro', 'Solo con saldo']);
    }
    filas.push(['Generado', new Date().toLocaleString('es-AR')]);
    return filas;
}

function obtenerTextoFiltrosExport() {
    const f = obtenerFiltro();
    const parts = [];
    if (f.fechaDesde) parts.push(`Desde ${f.fechaDesde}`);
    if (f.fechaHasta) parts.push(`Hasta ${f.fechaHasta}`);

    const agregarCheck = (key, label, items) => {
        const ids = obtenerIdsFiltroCheck(key);
        if (!ids.length) return;
        const wrap = document.querySelector(`[data-check-filtro="${key}"]`);
        if (wrap?.closest('.d-none')) return;
        const nombres = ids.map(id => items.find(x => x.id === id)?.nombre || `#${id}`);
        parts.push(`${label}: ${nombres.join(', ')}`);
    };
    agregarCheck('cliente', 'Clientes', catalogos.clientes);
    agregarCheck('proveedor', 'Proveedores', catalogos.proveedores);
    agregarCheck('producto', 'Productos', checkFiltroItems.producto);
    if (reporteActivo.filtros?.includes('tipoEvolucion')) {
        const tipo = document.getElementById('filtroTipo')?.value || '';
        const items = tipo === 'Cliente' ? catalogos.clientes : catalogos.proveedores;
        agregarCheck('entidad', tipo, items);
    }
    if (document.getElementById('filtroSoloSaldo')?.checked) parts.push('Solo con saldo');
    return parts.join(' · ') || 'Sin filtros adicionales';
}

function textoEstadoExport(estado) {
    if (!estado) return '—';
    return String(estado);
}

function textoSiNoExport(texto) {
    const s = String(texto || '').toLowerCase();
    if (s === 'sí' || s === 'si' || s === 'yes') return 'Sí';
    return 'No';
}

function construirPayloadExportacion() {
    const id = reporteActivo.id;
    const meta = {
        titulo: reporteActivo.titulo,
        filtros: obtenerTextoFiltrosExport(),
        generado: new Date().toLocaleString('es-AR')
    };
    const hojas = [];

    if (id === 'pedidos-dia') {
        // Ver construirPayloadExportacionPedidosDia (exportación async, una sola hoja)
    } else if (id === 'evolucion-producto') {
        const meses = ultimoResultado.meses || [];
        const hoja = {
            nombre: 'Evolución producto',
            headers: ['Producto', 'Unidad', ...meses.map(fmtMes), 'Información'],
            rows: []
        };
        (ultimoResultado.filas || []).forEach(f => {
            hoja.rows.push([
                f.producto || '', f.unidad || '',
                ...meses.map((m, idx) => {
                    const v = f.cantidadesPorMes?.[m] ?? 0;
                    const prev = idx > 0 ? (f.cantidadesPorMes?.[meses[idx - 1]] ?? 0) : 0;
                    return textoVariacionMesExport(v, idx, prev);
                }),
                f.informacion || textoInformacionEvolucion(f, ultimoResultado)
            ]);
        });
        hojas.push(hoja);
    } else if (id === 'pagos-clientes' || id === 'pagos-proveedores') {
        const esCli = id === 'pagos-clientes';
        const hoja = {
            nombre: esCli ? 'Pagos clientes' : 'Pagos proveedores',
            headers: ['Fecha pago', 'Monto', 'Método', 'Partida', 'Fecha entrega', esCli ? 'Cliente' : 'Proveedor'],
            rows: []
        };
        (ultimoResultado || []).forEach(g => {
            (g.pagos || []).forEach(p => {
                hoja.rows.push([
                    fmtFecha(g.fechaPago), numExport(p.monto), p.metodoPago || '',
                    p.partida || '', fmtFecha(p.fechaEntrega),
                    esCli ? (p.cliente || '') : (p.proveedor || '')
                ]);
            });
        });
        hojas.push(hoja);
    } else {
        const esProv = id === 'ec-proveedores';
        const esEvol = id === 'evolucion-ventas';
        const paraCliente = id === 'ec-para-cliente';

        const resumen = {
            nombre: 'Resumen por grupo',
            headers: ['Grupo', 'Etiqueta total', 'Total'],
            rows: []
        };

        let headersDetalle = ['Grupo', 'Partida', 'Fecha entrega'];
        if (esEvol) headersDetalle.push('Facturado', 'Ganancia', '% Ganancia');
        else if (paraCliente) headersDetalle.push('Monto', 'Haber', 'Saldo');
        else if (esProv) headersDetalle.push('Monto', 'Haber', 'Saldo', 'Cliente', 'Estado cliente');
        else headersDetalle.push('Monto', 'Haber', 'Saldo', 'Ganancia', 'Proveedor', 'Pagado proveedor');

        const detalle = { nombre: 'Detalle pedidos', headers: headersDetalle, rows: [] };

        (ultimoResultado || []).forEach(g => {
            resumen.rows.push([g.nombre || '', g.etiquetaTotal || 'Total', numExport(g.totalSaldo)]);
            (g.pedidos || []).forEach(p => {
                const row = [g.nombre || '', p.partida || '', fmtFecha(p.fechaEntrega)];
                if (esEvol) {
                    row.push(numExport(p.monto), numExport(p.ganancia), numExport((Number(p.porcGanancia) || 0) * 100));
                } else if (paraCliente) {
                    row.push(numExport(p.monto), numExport(p.haber), numExport(p.saldo));
                } else if (esProv) {
                    row.push(numExport(p.monto), numExport(p.haber), numExport(p.saldo),
                        p.cliente || '', textoEstadoExport(p.estadoCliente));
                } else {
                    row.push(numExport(p.monto), numExport(p.haber), numExport(p.saldo),
                        numExport(p.ganancia), p.proveedor || '', textoSiNoExport(p.pagadoProveedor));
                }
                detalle.rows.push(row);
            });
        });
        hojas.push(resumen, detalle);
    }

    return { ...meta, contexto: reporteActivo.id, hojas };
}

function numExport(n) {
    const v = Number(n);
    return isNaN(v) ? 0 : v;
}

function fmtMoney(n) {
    const v = Number(n) || 0;
    return '$ ' + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n) {
    return (Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 4 });
}

function fmtPct(n) {
    return ((Number(n) || 0) * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' %';
}

/** Normaliza fechas API (.NET: 7 decimales en ISO) para que moment las parsee */
function normalizarFechaApi(val) {
    if (val == null || val === '') return null;
    if (typeof val === 'string' && val.startsWith('0001-01-01')) return null;
    if (typeof val === 'object' && !(val instanceof Date)) {
        if (val.year != null && val.month != null && val.day != null) {
            const y = val.year;
            const m = String(val.month).padStart(2, '0');
            const d = String(val.day).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return null;
    }
    if (typeof val === 'string') {
        return val.replace(/(\.\d{3})\d+/, '$1');
    }
    return val;
}

/** Fecha calendario YYYY-MM-DD sin desfase por zona horaria (exportación y vista) */
function fechaSoloDia(val) {
    const n = normalizarFechaApi(val);
    if (!n) return null;
    if (n instanceof Date && !isNaN(n.getTime())) {
        const y = n.getFullYear();
        const m = String(n.getMonth() + 1).padStart(2, '0');
        const d = String(n.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(n).trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const ar = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (ar) {
        const d = String(ar[1]).padStart(2, '0');
        const m = String(ar[2]).padStart(2, '0');
        return `${ar[3]}-${m}-${d}`;
    }
    return null;
}

function fmtFecha(val) {
    const iso = fechaSoloDia(val);
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function fmtMes(ym) {
    if (!ym || ym.length < 7) return ym;
    const [y, m] = ym.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(m, 10) - 1]} ${y}`;
}

function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
