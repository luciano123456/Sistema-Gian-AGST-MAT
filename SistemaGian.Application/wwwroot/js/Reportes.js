/* Reportes AGS MAT — UI + datos (compatible PascalCase / camelCase API) */

const REPORTES = [
    { id: 'pedidos-dia', titulo: 'Pedidos por día', icon: 'fa-calendar', desc: 'Resumen por fecha de entrega (no por fecha de carga del pedido), con detalle de partidas y productos.', endpoint: 'PedidosPorDia', filtros: ['fechas'] },
    { id: 'ec-clientes', titulo: 'Estado de cuenta — Clientes', icon: 'fa-users', desc: 'Agrupado por cliente: monto, cobrado, saldo, ganancia y proveedor. Expandí cada partida.', endpoint: 'EstadoCuentaClientes', filtros: ['fechas', 'cliente', 'soloSaldo'] },
    { id: 'ec-para-cliente', titulo: 'Para cliente', icon: 'fa-file-text-o', desc: 'Versión para entregar al cliente (sin ganancia ni proveedor).', endpoint: 'EstadoCuentaParaCliente', filtros: ['fechas', 'cliente', 'soloSaldo'] },
    { id: 'ec-proveedores', titulo: 'Estado de cuenta — Proveedores', icon: 'fa-truck', desc: 'Deuda con proveedores. Usá «Pagar en pedido» para registrar el pago; «Incluir» para armar la composición de saldos.', endpoint: 'EstadoCuentaProveedores', filtros: ['fechas', 'proveedor', 'soloSaldo'], composicion: true },
    { id: 'evolucion-ventas', titulo: 'Evolución de ventas', icon: 'fa-line-chart', desc: 'Facturado y % ganancia por cliente o proveedor.', endpoint: 'EvolucionVentas', filtros: ['fechas', 'tipoEvolucion'] },
    { id: 'evolucion-producto', titulo: 'Evolución por producto', icon: 'fa-cubes', desc: 'Cantidades por mes según fecha de entrega del pedido (no fecha de carga), con variación % y filtros por cliente, proveedor y productos.', endpoint: 'EvolucionProducto', filtros: ['fechas', 'cliente', 'proveedor', 'producto'] },
    { id: 'pagos-clientes', titulo: 'Pagos clientes', icon: 'fa-money', desc: 'Pagos recibidos por fecha, método y detalle.', endpoint: 'PagosClientes', filtros: ['fechas', 'cliente'] },
    { id: 'pagos-proveedores', titulo: 'Pagos proveedores', icon: 'fa-credit-card', desc: 'Pagos realizados a proveedores con detalle.', endpoint: 'PagosProveedores', filtros: ['fechas', 'proveedor'] }
];

const SELECT_IDS = '#filtroCliente, #filtroProveedor, #filtroEntidad';
let filtroProductoCheckBound = false;

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
let productosEvolucionCache = [];
let ultimoResultado = null;
let pedidosSeleccionadosProveedor = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof $ === 'undefined') {
        console.error('jQuery requerido para Reportes');
        return;
    }
    initFechasDefault();
    renderNavReportes();
    initSelect2();
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
        llenarSelect('#filtroCliente', catalogos.clientes, true);
        llenarSelect('#filtroProveedor', catalogos.proveedores, true);
        onCambioTipoEvolucion();
        if (reporteActivo.id === 'evolucion-producto') {
            initFiltroProductoEvolucion();
            actualizarCatalogoProductosEvolucion();
        }
    } catch (e) {
        console.error(e);
        if (typeof errorModal === 'function') errorModal('No se pudieron cargar clientes, proveedores y productos.');
    }
}

function llenarSelect(sel, items, conTodos) {
    const $el = $(sel);
    if ($el.data('select2')) $el.select2('destroy');
    $el.empty();
    if (conTodos) $el.append(new Option('— Todos —', '-1', true, true));
    (items || []).forEach(x => {
        if (x.id != null && x.nombre) $el.append(new Option(x.nombre, String(x.id)));
    });
    initSelect2One(sel);
}

function initSelect2() {
    $(SELECT_IDS).each(function () { initSelect2One(this); });
    $('#filtroTipo').select2({
        width: '100%',
        minimumResultsForSearch: Infinity,
        dropdownParent: $('#panelFiltrosReportes')
    });
}

function initSelect2One(sel) {
    const $el = $(sel);
    if (!$el.length) return;
    if ($el.data('select2')) $el.select2('destroy');
    $el.select2({
        width: '100%',
        placeholder: '— Todos —',
        allowClear: false,
        dropdownParent: $('#panelFiltrosReportes')
    });
}

function configurarFiltrosVisibles() {
    const f = reporteActivo.filtros || [];
    const esEvolProd = reporteActivo.id === 'evolucion-producto';
    document.querySelector('.filtro-cliente').classList.toggle('d-none', !f.includes('cliente'));
    document.querySelector('.filtro-proveedor').classList.toggle('d-none', !f.includes('proveedor'));
    document.querySelector('.filtro-producto').classList.toggle('d-none', !f.includes('producto'));
    document.querySelector('.filtro-tipo').classList.toggle('d-none', !f.includes('tipoEvolucion'));
    document.querySelector('.filtro-entidad').classList.toggle('d-none', !f.includes('tipoEvolucion'));
    document.querySelector('.filtro-solo-saldo').classList.toggle('d-none', !f.includes('soloSaldo'));
    document.getElementById('reporteDescripcion').textContent = reporteActivo.desc || '';
    actualizarEtiquetasFiltroFechas();

    teardownFiltroProductoEvolucion();
    if (esEvolProd) {
        initFiltroProductoEvolucion();
        actualizarCatalogoProductosEvolucion();
    }

    if (f.includes('tipoEvolucion')) onCambioTipoEvolucion();
    setTimeout(() => $(SELECT_IDS).trigger('change.select2'), 50);
}

function teardownFiltroProductoEvolucion() {
    $('#filtroCliente, #filtroProveedor').off('change.evolProd');
    cerrarDropProductosCheck();
}

function initFiltroProductoEvolucion() {
    bindFiltroProductoCheckEvents();
    $('#filtroCliente, #filtroProveedor').off('change.evolProd')
        .on('change.evolProd', () => actualizarCatalogoProductosEvolucion());
}

function bindFiltroProductoCheckEvents() {
    if (filtroProductoCheckBound) return;
    filtroProductoCheckBound = true;

    const btn = document.getElementById('btnFiltroProductoToggle');
    const drop = document.getElementById('dropFiltroProducto');
    const lista = document.getElementById('listaFiltroProductoCheck');
    const buscar = document.getElementById('buscarFiltroProducto');

    btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const abierto = btn.getAttribute('aria-expanded') === 'true';
        if (abierto) cerrarDropProductosCheck();
        else abrirDropProductosCheck();
    });

    document.getElementById('btnProdCheckTodos')?.addEventListener('click', (e) => {
        e.preventDefault();
        lista?.querySelectorAll('.rpt-prod-check__item:not(.is-hidden) input[type="checkbox"]')
            .forEach(cb => { cb.checked = true; });
        actualizarResumenProductosCheck();
    });

    document.getElementById('btnProdCheckNinguno')?.addEventListener('click', (e) => {
        e.preventDefault();
        lista?.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
        actualizarResumenProductosCheck();
    });

    buscar?.addEventListener('input', () => filtrarListaProductosCheck(buscar.value));

    lista?.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) actualizarResumenProductosCheck();
    });

    document.addEventListener('click', (e) => {
        if (!drop || drop.hidden) return;
        const wrap = document.getElementById('wrapFiltroProductoCheck');
        if (wrap && !wrap.contains(e.target)) cerrarDropProductosCheck();
    });
}

function posicionarDropProductosCheck() {
    const btn = document.getElementById('btnFiltroProductoToggle');
    const drop = document.getElementById('dropFiltroProducto');
    const wrap = document.getElementById('wrapFiltroProductoCheck');
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

function onReposicionarDropProductosCheck() {
    posicionarDropProductosCheck();
}

function abrirDropProductosCheck() {
    const btn = document.getElementById('btnFiltroProductoToggle');
    const drop = document.getElementById('dropFiltroProducto');
    const wrap = document.getElementById('wrapFiltroProductoCheck');
    if (!btn || !drop) return;
    drop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    wrap?.classList.add('is-open');
    posicionarDropProductosCheck();
    window.addEventListener('resize', onReposicionarDropProductosCheck);
    window.addEventListener('scroll', onReposicionarDropProductosCheck, true);
    document.getElementById('buscarFiltroProducto')?.focus();
}

function cerrarDropProductosCheck() {
    const btn = document.getElementById('btnFiltroProductoToggle');
    const drop = document.getElementById('dropFiltroProducto');
    const wrap = document.getElementById('wrapFiltroProductoCheck');
    if (!btn || !drop) return;
    drop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('is-open');
    wrap?.classList.remove('is-open');
    window.removeEventListener('resize', onReposicionarDropProductosCheck);
    window.removeEventListener('scroll', onReposicionarDropProductosCheck, true);
    drop.style.top = '';
    drop.style.left = '';
    drop.style.width = '';
    drop.style.maxHeight = '';
    const lista = drop.querySelector('.rpt-prod-check__list');
    if (lista) lista.style.maxHeight = '';
    const buscar = document.getElementById('buscarFiltroProducto');
    if (buscar) buscar.value = '';
    filtrarListaProductosCheck('');
}

function filtrarListaProductosCheck(q) {
    const term = (q || '').trim().toLowerCase();
    document.querySelectorAll('#listaFiltroProductoCheck .rpt-prod-check__item').forEach(row => {
        const nombre = (row.dataset.nombre || '').toLowerCase();
        row.classList.toggle('is-hidden', term.length > 0 && !nombre.includes(term));
    });
}

function renderListaProductosCheck(productos, idsSeleccionados) {
    const lista = document.getElementById('listaFiltroProductoCheck');
    if (!lista) return;
    const sel = new Set((idsSeleccionados || []).map(String));

    if (!productos?.length) {
        lista.innerHTML = '<p class="rpt-prod-check__empty">No hay productos para el cliente/proveedor elegido.</p>';
        actualizarResumenProductosCheck();
        return;
    }

    lista.innerHTML = productos.map(p => {
        const id = String(p.id);
        const checked = sel.has(id) ? ' checked' : '';
        const nombreRaw = p.nombre || '';
        const nombreAttr = nombreRaw.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        return `<label class="rpt-prod-check__item" data-nombre="${nombreAttr}" data-id="${id}">
            <input type="checkbox" class="form-check-input" value="${id}"${checked} />
            <span class="rpt-prod-check__name">${esc(nombreRaw)}</span>
        </label>`;
    }).join('');

    filtrarListaProductosCheck(document.getElementById('buscarFiltroProducto')?.value || '');
    actualizarResumenProductosCheck();
}

function actualizarResumenProductosCheck() {
    const resumen = document.getElementById('filtroProductoResumen');
    if (!resumen) return;
    const ids = obtenerIdsProductosSeleccionados();
    const total = productosEvolucionCache.length;
    if (!total) {
        resumen.textContent = 'Sin productos';
        return;
    }
    if (!ids.length) {
        resumen.textContent = 'Todos los productos';
        return;
    }
    if (ids.length === 1) {
        const p = productosEvolucionCache.find(x => x.id === ids[0]);
        resumen.textContent = p?.nombre || '1 producto';
        return;
    }
    if (ids.length === total) {
        resumen.textContent = 'Todos los productos';
        return;
    }
    resumen.textContent = `${ids.length} productos seleccionados`;
}

async function actualizarCatalogoProductosEvolucion() {
    if (reporteActivo.id !== 'evolucion-producto') return;
    const idCliente = parseInt(document.getElementById('filtroCliente').value, 10) || -1;
    const idProveedor = parseInt(document.getElementById('filtroProveedor').value, 10) || -1;
    const prev = obtenerIdsProductosSeleccionados();

    try {
        const res = await fetch(`/Reportes/ProductosEvolucion?idCliente=${idCliente}&idProveedor=${idProveedor}`);
        if (!res.ok) throw new Error(await res.text());
        const raw = await res.json();
        productosEvolucionCache = (Array.isArray(raw) ? raw : []).map(normItem);
        const valid = new Set(productosEvolucionCache.map(x => x.id));
        const restore = prev.filter(id => valid.has(id));
        renderListaProductosCheck(productosEvolucionCache, restore);
    } catch (e) {
        console.error(e);
        productosEvolucionCache = [];
        renderListaProductosCheck([], []);
    }
}

function obtenerIdsProductosSeleccionados() {
    const lista = document.getElementById('listaFiltroProductoCheck');
    if (!lista) return [];
    return Array.from(lista.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => parseInt(cb.value, 10))
        .filter(n => n > 0);
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
    document.getElementById('lblFiltroEntidad').textContent = 'Nombres';
    llenarSelect('#filtroEntidad', esCliente ? catalogos.clientes : catalogos.proveedores, true);
}

function obtenerFiltro() {
    const tipo = document.getElementById('filtroTipo').value;
    const entidad = parseInt(document.getElementById('filtroEntidad').value, 10);
    const base = {
        fechaDesde: document.getElementById('filtroDesde').value || null,
        fechaHasta: document.getElementById('filtroHasta').value || null,
        idCliente: parseInt(document.getElementById('filtroCliente').value, 10) || -1,
        idProveedor: parseInt(document.getElementById('filtroProveedor').value, 10) || -1,
        idProducto: -1,
        idProductos: obtenerIdsProductosSeleccionados(),
        tipo,
        soloConSaldo: document.getElementById('filtroSoloSaldo').checked
    };
    if (reporteActivo.filtros?.includes('tipoEvolucion')) {
        if (tipo === 'Cliente') base.idCliente = entidad;
        else base.idProveedor = entidad;
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
                    `<td><strong>${esc(p.partida)}</strong></td>`,
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
        const cols = [tdExpand(p.idPedido, precioVenta), `<td><strong>${esc(p.partida)}</strong></td>`, `<td>${fmtFecha(p.fechaEntrega)}</td>`];
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
        <p class="rpt-desc mb-2"><strong>Registrar pago:</strong> usá el botón <em>Pagar en pedido</em> en cada fila (pestaña «Pagos proveedor» del pedido).<br/>
        <strong>Composición de saldos:</strong> marcá <em>Incluir</em> en los pedidos que entren en el listado y exportá en Excel o PDF.</p>
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
                `<td>${esc(p.partida || '—')}</td>`,
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

function fmtCantidadDetallePedido(p) {
    let s = fmtNum(p.cantidad);
    const acopio = Number(p.cantidadUsadaAcopio) || 0;
    const factor = Number(p.productoCantidad);
    if (acopio > 0) s += `<br><small class="rpt-detail-sub">+ ${fmtNum(acopio)} acopio</small>`;
    if (factor > 0 && factor !== 1) s += `<br><small class="rpt-detail-sub">× ${fmtNum(factor)} bulto</small>`;
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
        const imp = Number(p.totalLinea) || 0;
        sumImporte += imp;
        body += `<tr>
            <td>${esc(p.producto)}</td>
            <td>${esc(p.unidad)}</td>
            <td class="text-end">${fmtCantidadDetallePedido(p)}</td>
            <td class="text-end rpt-num">${fmtMoney(pr)}</td>
            <td class="text-end rpt-num"><strong>${fmtMoney(imp)}</strong></td>
        </tr>`;
    });
    body += `<tr class="rpt-detail-total-row">
        <td colspan="4" class="text-end"><strong>Total productos</strong></td>
        <td class="text-end rpt-num"><strong>${fmtMoney(sumImporte)}</strong></td>
    </tr>`;

    const nota = precioVenta
        ? '<p class="rpt-detail-note mb-2"><i class="fa fa-info-circle"></i> El importe coincide con el guardado en el pedido (incluye bulto y acopio cuando aplica).</p>'
        : '';

    return `${meta ? `<div class="rpt-detail-header">${meta}</div>` : ''}${nota}
        ${wrapTable(
            `<th>Producto</th><th>Unidad</th><th class="text-end">Cantidad</th><th class="text-end">${col}</th><th class="text-end">Importe</th>`,
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

function obtenerPayloadExportacionReportes() {
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
    SistemaExport.abrir({
        titulo: reporteActivo.titulo,
        subtitulo: 'Exportar lo visible en pantalla (secciones abiertas y filas seleccionadas)',
        archivo: `reporte-${reporteActivo.id}`,
        validar: () => {
            if (!ultimoResultado) return 'Generá un reporte antes de exportar.';
            const root = document.getElementById('contenedorResultado');
            if (root?.querySelector('.rpt-empty')) return 'No hay datos para exportar.';
            if (!root?.querySelector('.rpt-table')) return 'No hay tablas en pantalla.';
            return null;
        },
        getPayload: () => obtenerPayloadExportacionReportes()
    });
}

function obtenerTextoFiltrosExport() {
    const f = obtenerFiltro();
    const parts = [];
    if (f.fechaDesde) parts.push(`Desde ${f.fechaDesde}`);
    if (f.fechaHasta) parts.push(`Hasta ${f.fechaHasta}`);

    const selTxt = (id, label) => {
        const el = document.getElementById(id);
        if (!el || el.closest('.d-none')) return;
        const v = el.value;
        if (!v || v === '-1') return;
        const opt = el.options[el.selectedIndex];
        if (opt?.text) parts.push(`${label}: ${opt.text.trim()}`);
    };
    selTxt('filtroCliente', 'Cliente');
    selTxt('filtroProveedor', 'Proveedor');
    if (reporteActivo.id === 'evolucion-producto') {
        const ids = obtenerIdsProductosSeleccionados();
        if (ids.length) {
            const nombres = ids.map(id => {
                const p = productosEvolucionCache.find(x => x.id === id)
                    || catalogos.productos.find(x => x.id === id);
                return p?.nombre || `#${id}`;
            });
            parts.push(`Productos: ${nombres.join(', ')}`);
        }
    }
    if (reporteActivo.filtros?.includes('tipoEvolucion')) {
        const tipo = document.getElementById('filtroTipo')?.value || '';
        const ent = document.getElementById('filtroEntidad');
        if (ent?.value && ent.value !== '-1') {
            parts.push(`${tipo}: ${ent.options[ent.selectedIndex]?.text?.trim() || ent.value}`);
        }
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
        const resumen = {
            nombre: 'Resumen por día',
            headers: ['Fecha', 'Pedidos', 'Facturado', 'Costo', 'Ganancia'],
            rows: []
        };
        const detalle = {
            nombre: 'Pedidos del período',
            headers: ['Fecha día', 'Partida', 'Fecha entrega', 'Cliente', 'Proveedor', 'Facturado', 'Costo', 'Ganancia'],
            rows: []
        };
        let tp = 0, tf = 0, tc = 0, tg = 0;
        (ultimoResultado || []).forEach(r => {
            resumen.rows.push([
                fmtFecha(r.fecha), r.cantidadPedidos, numExport(r.totalFacturado),
                numExport(r.totalCosto), numExport(r.totalGanancia)
            ]);
            tp += Number(r.cantidadPedidos) || 0;
            tf += Number(r.totalFacturado) || 0;
            tc += Number(r.totalCosto) || 0;
            tg += Number(r.totalGanancia) || 0;
            (r.pedidos || []).forEach(p => {
                detalle.rows.push([
                    fmtFecha(r.fecha), p.partida || '', fmtFecha(p.fechaEntrega),
                    p.cliente || '', p.proveedor || '',
                    numExport(p.monto), numExport(p.costo), numExport(p.ganancia)
                ]);
            });
        });
        resumen.rows.push(['Total período', tp, numExport(tf), numExport(tc), numExport(tg)]);
        hojas.push(resumen, detalle);
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

function fmtFecha(val) {
    const n = normalizarFechaApi(val);
    if (!n) return '—';
    if (typeof formatearFechaParaVista === 'function') {
        const s = formatearFechaParaVista(n);
        return s || '—';
    }
    if (typeof moment !== 'undefined') {
        const m = moment(n, [moment.ISO_8601, 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DDTHH:mm:ss.SSS', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
        return m.isValid() ? m.format('DD/MM/YYYY') : '—';
    }
    const d = new Date(n);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR');
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
