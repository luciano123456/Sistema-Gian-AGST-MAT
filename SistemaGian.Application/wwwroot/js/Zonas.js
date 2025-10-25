let gridZonas;
const precioInput = document.getElementById('txtPrecio'); // 👈 no se cambia
var selectedZonas = [];
let isEditing = false;

// -------- Helpers de formato / debounce --------
function formatNumber(number) {
    // soporta "$1.234,56" input -> normaliza con toLocale
    const n = (typeof number === 'number') ? number : parseFloat(String(number).replace(/[^\d.,-]/g, '').replace('.', '').replace(',', '.')) || 0;
    return '$' + n.toLocaleString('es-AR');
}
const debounce = (fn, wait = 0) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };

// --------- INIT ---------
$(document).ready(() => {
    inicializarSonidoNotificacion();
    document.addEventListener("touchstart", desbloquearAudio, { once: true });
    document.addEventListener("click", desbloquearAudio, { once: true });

    listaZonas(-1);
    listaClientesFiltro();
    listaZonasFiltro();
    initToggleFiltrosPersistenteZonas();

    $("#Clientes").select2({
        dropdownParent: $("#modalClientes"),
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });

    $("#clientesfiltro, #zonasfiltro").select2({
        placeholder: "Selecciona una opción",
        allowClear: false
    });

    $('#txtNombre').on('input', validarCampos);
});

// --------- Validaciones / CRUD básicos (igual a lo tuyo) ---------
function validarCampos() {
    const nombre = $("#txtNombre").val();
    const ok = nombre !== "";
    $("#lblNombre").css("color", ok ? "" : "red");
    $("#txtNombre").css("border-color", ok ? "" : "red");
    return ok;
}

function nuevaZona() {
    limpiarModal();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nueva Zona");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
    document.getElementById('txtPrecio').value = "$0.00";
}

async function mostrarModal(modelo) {
    let idCliente = $("#clientesfiltro").val();

    ["Id", "Nombre", "Precio"].forEach(c => {
        if (c === "Precio") $("#txtPrecio").val(formatNumber(modelo[c]));
        else $(`#txt${c}`).val(modelo[c]);
    });

    if (idCliente > 0) { $("#txtNombre").attr("disabled", true); }
    else { $("#txtNombre").attr("disabled", false); }

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Zona");
    $('#lblNombre, #txtNombre').css({ color: '', borderColor: '' });
}

function limpiarModal() {
    ["Id", "Nombre", "Precio"].forEach(c => $(`#txt${c}`).val(""));
    $("#lblNombre, #txtNombre").css({ color: '', borderColor: '' });
}

function guardarCambios() {
    if (!validarCampos()) { errorModal('Debes completar los campos requeridos'); return; }

    const idZona = $("#txtId").val();
    const idCliente = $("#clientesfiltro").val();
    const zona = $("#txtNombre").val();
    const cliente = $("#clientesfiltro option:selected").text();

    const nuevoModelo = {
        "Id": idZona !== "" ? idZona : 0,
        "Nombre": zona,
        "Precio": formatoNumero($("#txtPrecio").val()),
        "IdCliente": idCliente,
    };

    const url = idZona === "" ? "Zonas/Insertar" : "Zonas/Actualizar";
    const method = idZona === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(nuevoModelo)
    })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(() => {
            const msg = idZona === ""
                ? "Zona registrada correctamente."
                : (idCliente > 0 ? ` ${zona} del cliente ${cliente} modificada correctamente` : "Zona modificada correctamente.");
            $('#modalEdicion').modal('hide');
            exitoModal(msg);
            listaZonas($("#clientesfiltro").val());
        })
        .catch(console.error);
}

const editarZona = id => {
    let idCliente = $("#clientesfiltro").val();
    fetch(`Zonas/EditarInfo?id=${id}&idCliente=${idCliente}`)
        .then(r => { if (!r.ok) throw new Error("Ha ocurrido un error."); return r.json(); })
        .then(d => { if (d) mostrarModal(d); else throw new Error("Ha ocurrido un error."); })
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarZona(id) {
    if (!confirm("¿Desea eliminar la Zona?")) return;
    var idCliente = document.getElementById("clientesfiltro").value;

    try {
        const r = await fetch(`Zonas/Eliminar?id=${id}&idCliente=${idCliente}`, { method: "DELETE" });
        if (!r.ok) throw new Error("Error al eliminar la Zona.");
        const j = await r.json();
        if (j.valor) { aplicarFiltros(); exitoModal("Zona eliminada correctamente"); }
    } catch (e) { console.error("Ha ocurrido un error:", e); }
}

// --------- DataTable + filtros sincronizados + KPI ---------
async function listaZonas(idCliente) {
    let paginaActual = gridZonas ? gridZonas.page() : 0;

    document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
    selectedZonas = [];

    const url = `/Zonas/Lista?IdCliente=${idCliente}`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);

    if (paginaActual > 0) gridZonas.page(paginaActual).draw('page');
}

// construir (o actualizar) grilla
async function configurarDataTable(data) {
    if (!gridZonas) {
        gridZonas = $('#grd_Zonas').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: "100px",
            scrollCollapse: true,
            pageLength: 100,
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Reporte Zonas', title: '',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const colVisible = $(node).is(':visible');
                            return colVisible && idx > 0; // evita la col de acciones
                        }
                    },
                    className: 'btn-exportar-excel'
                },
                {
                    extend: 'pdfHtml5', text: 'Exportar PDF', filename: 'Reporte Zonas', title: '',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const colVisible = $(node).is(':visible');
                            return colVisible && idx > 0;
                        }
                    },
                    className: 'btn-exportar-pdf'
                },
                {
                    extend: 'print', text: 'Imprimir', title: '',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const colVisible = $(node).is(':visible');
                            return colVisible && idx > 0;
                        }
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    orderable: false,
                    searchable: false,
                    render: function (data, type, row) {
                        if (type !== 'display') return data;
                        return `
    <div class="acciones-menu" data-id="${data}">
        <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
            <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
        </button>
        <div class="acciones-dropdown" style="display: none;">
            <button class='btn btn-sm btneditar' type='button' onclick='editarZona(${data})' title='Editar'>
                <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
            </button>
            <button class='btn btn-sm btneliminar' type='button' onclick='eliminarZona(${data})' title='Eliminar'>
                <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
            </button>
        </div>

        <!-- CHIP como en Productos -->
        <button type="button" class="btn btn-sm chip-select btnacciones" data-id="${data}" aria-pressed="false" title="Seleccionar">
            <i class="fa fa-square-o"></i> <span>Elegir</span>
        </button>
    </div>`;
                    }
                },
                { data: 'Nombre', title: 'Nombre' },
                { data: 'Cliente', title: 'Cliente', defaultContent: '', visible: false }, // visible ON solo cuando corresponde
                {
                    data: 'Precio', title: 'Precio', className: 'text-end',
                    render: (d, t) => (t === 'display' ? formatNumber(d) : d)
                }
            ],

            initComplete: async function () {
                const api = this.api();

                // construir filtros sincronizados al header visible
                await rebuildFiltersZonas(api);

                // KPI inicial
                $('#kpiCantZonas').text(gridZonas.rows({ search: 'applied' }).count());

                // Bind de selección por checkbox custom
                $('#grd_Zonas').off('click.chk').on('click.chk', '.custom-checkbox', handleCheckboxClick);

                // KPI on draw
                $('#grd_Zonas').off('draw.dt.kpi').on('draw.dt.kpi', function () {
                    $('#kpiCantZonas').text(gridZonas.rows({ search: 'applied' }).count());
                });

                // Menú de columnas con persistencia + rebuild filtros
                configurarOpcionesColumnasZonas(api);
            }
        });
    } else {
        gridZonas.clear().rows.add(data).draw();
    }
}

// -------- Filtros sincronizados (como en Productos) --------
function getFilterThead(api) {
    const $c = $(api.table().container());
    return $c.find('.dataTables_scrollHead thead').length
        ? $c.find('.dataTables_scrollHead thead')
        : $(api.table().header());
}

function ensureFiltersRow(api) {
    const $thead = getFilterThead(api);
    let $filters = $thead.find('tr.filters');
    if (!$filters.length) {
        const visibleCount = $thead.find('tr').first().children('th:visible').length;
        const ths = Array.from({ length: visibleCount }, () => '<th></th>').join('');
        $filters = $(`<tr class="filters">${ths}</tr>`);
        $thead.append($filters);
    }
    return $filters;
}

function getFilterCell(api, colIndex) {
    const $thead = getFilterThead(api);
    const $filters = $thead.find('tr.filters');
    const visIdx = api.column(colIndex).index('visible');
    if (visIdx == null || visIdx < 0) return $();
    return $filters.find('th').eq(visIdx);
}

function generarColumnConfigZonas() {
    const cfg = [];
    const api = gridZonas;

    api.columns().every(function () {
        const i = this.index();
        const src = this.dataSrc();
        if (!src) return;
        if (src === 'Id') return; // col de acciones

        // todas texto simple
        cfg.push({ index: i, filterType: 'text' });
    });

    return cfg;
}

async function buildFiltersZonas(api) {
    const $filters = ensureFiltersRow(api);
    $filters.find('th').each(function () { $(this).empty().show(); });

    // sin filtro en la primera col (acciones)
    const visIdxAcc = api.column(0).index('visible');
    if (visIdxAcc >= 0) $filters.find('th').eq(visIdxAcc).empty();

    const cfgs = generarColumnConfigZonas();
    for (const cfg of cfgs) {
        if (!api.column(cfg.index).visible()) continue;
        const $cell = getFilterCell(api, cfg.index);
        if (!$cell.length) continue;

        $('<input type="text" placeholder="Buscar..." />')
            .appendTo($cell)
            .on('keyup change', function (e) {
                e.stopPropagation();
                const rx = this.value ? '(((' + this.value + ')))' : '';
                const cur = this.selectionStart || 0;
                api.column(cfg.index).search(rx, !!this.value, !this.value).draw();
                $(this).focus()[0].setSelectionRange(cur, cur);
            });
    }
}

async function rebuildFiltersZonas(api) {
    const $thead = getFilterThead(api);
    $thead.find('tr.filters').remove();
    $(api.table().header()).find('tr.filters').remove();

    const visIdxs = api.columns(':visible').indexes().toArray();
    const ths = visIdxs.map(() => '<th></th>').join('');
    const $filters = $(`<tr class="filters">${ths}</tr>`);
    $thead.append($filters);

    // vaciar filtro col acciones si está visible
    if (visIdxs.length) $filters.find('th').eq(0).empty();

    await buildFiltersZonas(api);
    api.columns.adjust().draw(false);
}

// -------- Config de columnas (persistencia por dataSrc + rebuild filtros) --------
function findColIndexByDataSrc(api, dataSrc) {
    const idx = api.columns().indexes().toArray().find(i => api.column(i).dataSrc() === dataSrc);
    return (idx === undefined ? null : idx);
}

function configurarOpcionesColumnasZonas(api) {
    const grid = api;
    const $menu = $('#configColumnasMenu');
    const STORAGE_KEY = 'Zonas_Columnas_v2';

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    $menu.empty();

    grid.columns().every(function () {
        const i = this.index();
        const dataSrc = this.dataSrc();
        const title = $(this.header()).text().trim();

        if (!dataSrc) return;
        if (dataSrc === 'Id') return; // no listar acciones

        const visible = (saved[dataSrc] !== undefined) ? !!saved[dataSrc] : this.visible();
        this.visible(visible, false);

        const idChk = `colchk_${dataSrc}`;
        $menu.append(`
            <li>
              <label class="dropdown-item" for="${idChk}">
                <input type="checkbox" id="${idChk}" class="toggle-column" data-dsrc="${dataSrc}" ${visible ? 'checked' : ''}>
                ${title || dataSrc}
              </label>
            </li>
        `);
    });

    $menu.off('change.cfgCols').on('change.cfgCols', '.toggle-column', async function () {
        const dataSrc = $(this).data('dsrc');
        const checked = $(this).is(':checked');
        const curIdx = findColIndexByDataSrc(grid, dataSrc);
        if (curIdx === null) return;

        grid.column(curIdx).visible(checked, false);
        saved[dataSrc] = checked;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

        await rebuildFiltersZonas(grid);
    });

    grid.columns.adjust().draw(false);
}

// -------- Visibilidad “Cliente” según filtros (manteniendo tus IDs) --------
async function actualizarVisibilidadCliente(visible) {
    const columnIndex = 2; // Cliente
    const column = gridZonas.column(columnIndex);
    column.visible(visible, false);
    await rebuildFiltersZonas(gridZonas);
}

// -------- Filtros/aplicar/limpiar --------
async function listaClientesFiltro() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#clientesfiltro option').remove();
    const selectClientes = document.getElementById("clientesfiltro");
    let option = document.createElement("option");
    option.value = -1; option.text = "-";
    selectClientes.appendChild(option);

    for (let i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectClientes.appendChild(option);
    }
}

async function listaZonasFiltro(preserveSelection = true) {
    const idCliente = $("#clientesfiltro").val() !== "" ? $("#clientesfiltro").val() : -1;

    // guardar selección actual (si queremos preservarla)
    const prev = preserveSelection ? $("#zonasfiltro").val() : null;

    const url = `/Zonas/Lista?IdCliente=${idCliente}`;
    const response = await fetch(url);
    const data = await response.json();

    const $select = $('#zonasfiltro');
    $select.find('option').remove();

    // opción por defecto
    $select.append(new Option('-', -1));

    // opciones dinámicas
    for (let i = 0; i < data.length; i++) {
        $select.append(new Option(data[i].Nombre, data[i].Id));
    }

    // restaurar selección si existe esa opción
    if (preserveSelection && prev !== null && $select.find(`option[value="${prev}"]`).length) {
        $select.val(prev);
    } else {
        // sino, mantener -1 como default
        $select.val('-1');
    }

    // refrescar Select2 si está activo
    if ($select.data('select2')) {
        $select.trigger('change.select2');
    } else {
        $select.trigger('change');
    }
}

async function aplicarFiltros() {
    const idCliente = parseInt(document.getElementById("clientesfiltro").value || "-1", 10);
    const idZona = parseInt(document.getElementById("zonasfiltro").value || "-1", 10);

    // ocultar acciones masivas por defecto
    document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
    document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");

    selectedZonas = [];

    let url = "";

    if (idCliente === -1 && idZona > 0) {
        // solo zona -> mostrar columna Cliente
        await actualizarVisibilidadCliente(true);
        url = `/Zonas/ListaFiltro?IdCliente=-1&IdZona=${idZona}`;
    } else {
        // por cliente (y opcionalmente zona)
        await actualizarVisibilidadCliente(false);
        // si querés además filtrar por zona del lado servidor:
        // url = `/Zonas/ListaFiltro?IdCliente=${idCliente}&IdZona=${idZona}`;
        // si no, mantené la lista por cliente:
        url = `/Zonas/Lista?IdCliente=${idCliente}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(response.statusText);
        const dataJson = await response.json();
        await configurarDataTable(dataJson);
    } catch (err) {
        console.error(err);
    }

    // 🔁 repoblá el combo “Zona” preservando lo que el usuario eligió
    await listaZonasFiltro(true);
}
function resetFiltrosZonas() {
    const empty = $('#clientesfiltro option[value="-1"]').length ? '-1' : '';
    ['clientesfiltro', 'zonasfiltro'].forEach(id => {
        const $el = $('#' + id);
        if ($el.data('select2')) { $el.val(empty).trigger('change'); }
        else { $el.val(empty); }
    });
    aplicarFiltros();
}

// -------- Selección múltiple / botones masivos --------
$('#selectAllCheckbox').on('change', function () {
    const checked = $(this).is(':checked');
    selectedZonas = [];

    $('.custom-checkbox').each(function () {
        const icon = $(this).find('.fa');
        const id = $(this).data('id');

        if (checked) {
            icon.addClass('checked fa-check-square').removeClass('fa-square-o');
            if (!selectedZonas.includes(id)) selectedZonas.push(id);
        } else {
            icon.removeClass('checked fa-check-square').addClass('fa-square-o');
        }
    });
    actualizarBotonesAccion();
});

function handleCheckboxClick(e) {
    const checkbox = $(e.target).closest('.custom-checkbox');
    const zonaId = checkbox.data('id');
    if (zonaId === undefined) return;

    const icon = checkbox.find('.fa');
    icon.toggleClass('checked');

    if (icon.hasClass('checked')) {
        icon.removeClass('fa-square-o').addClass('fa-check-square');
        if (!selectedZonas.includes(zonaId)) selectedZonas.push(zonaId);
    } else {
        icon.removeClass('fa-check-square').addClass('fa-square-o');
        const ix = selectedZonas.indexOf(zonaId);
        if (ix !== -1) selectedZonas.splice(ix, 1);
    }

    actualizarBotonesAccion();
}

function desmarcarCheckboxes() {
    const checkboxes = gridZonas?.cells('.custom-checkbox').nodes() || [];
    for (let i = 0; i < checkboxes.length; i++) {
        const icon = $(checkboxes[i]).find('.fa');
        icon.removeClass('fa-check-square checked').addClass('fa-square-o');
    }
    selectedZonas = [];
    document.getElementById("btnAsignarCliente").removeAttribute("hidden");
}

function actualizarBotonesAccion() {
    const idClienteFiltro = $("#clientesfiltro").val();

    if (selectedZonas.length > 0 && idClienteFiltro <= 0) {
        document.getElementById("btnAsignarCliente").removeAttribute("hidden");
    } else {
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
    }

    if (selectedZonas.length > 0) {
        document.getElementById("btnAumentarPrecios").removeAttribute("hidden");
        document.getElementById("btnBajarPrecios").removeAttribute("hidden");
    } else {
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");
    }
}

// -------- Asignar cliente / Aumentar / Bajar (tuyo, intacto) --------
function abrirmodalClientes() { listaClientes(); $("#modalClientes").modal("show"); }
async function listaClientes() {
    const r = await fetch('/Clientes/Lista'); const d = await r.json();
    $('#Clientes').empty();
    const s = document.getElementById("Clientes");
    d.forEach(x => { const o = document.createElement("option"); o.value = x.Id; o.text = x.Nombre; s.appendChild(o); });
}
function asignarCliente() {
    const nuevoModelo = {
        zonas: JSON.stringify(selectedZonas),
        idCliente: document.getElementById("Clientes").value
    };
    fetch("Zonas/InsertarZonaCliente", {
        method: "POST", headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(nuevoModelo)
    })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(ok => {
            if (ok != null) exitoModal("Cliente asignado correctamente");
            else errorModal("Ha ocurrido un error al asignar el proveedor");
            $("#modalClientes").modal("hide");
        })
        .catch(console.error);
}

function abrirmodalAumentarPrecios() { $("#txtAumentoPrecio").val("0"); $("#modalAumentar").modal("show"); }
function abrirmodalBajarPrecios() { $("#txtBajaPrecio").val("0"); $("#modalBajar").modal("show"); }

function validarCamposAumentar() {
    const v = $("#txtAumentoPrecio").val();
    const ok = v !== "";
    $("#lblAumentoPrecio").css("color", ok ? "" : "red");
    $("#txtAumentoPrecio").css("border-color", ok ? "" : "red");
    return ok;
}
function validarCamposBajar() {
    const v = $("#txtBajaPrecio").val();
    const ok = v !== "";
    $("#lblBajaPrecio").css("color", ok ? "" : "red");
    $("#txtBajaPrecio").css("border-color", ok ? "" : "red");
    return ok;
}

function aumentarPrecios() {
    if (!validarCamposAumentar()) { errorModal('Debes completar los campos requeridos'); return; }
    const idClienteFiltro = $("#clientesfiltro").val();
    const nuevoModelo = {
        zonas: JSON.stringify(selectedZonas),
        idCliente: idClienteFiltro,
        Porcentaje: document.getElementById("txtAumentoPrecio").value
    };
    fetch("Zonas/AumentarPrecios", {
        method: "POST", headers: { 'Content-Type': 'application/json;charset=utf-8' }, body: JSON.stringify(nuevoModelo)
    }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(() => { exitoModal("Precios aumentados correctamente"); $("#modalAumentar").modal("hide"); aplicarFiltros(); })
        .catch(console.error);
}

function bajarPrecios() {
    if (!validarCamposBajar()) { errorModal('Debes completar los campos requeridos'); return; }
    const idClienteFiltro = $("#clientesfiltro").val();
    const nuevoModelo = {
        zonas: JSON.stringify(selectedZonas),
        idCliente: idClienteFiltro,
        Porcentaje: document.getElementById("txtBajaPrecio").value
    };
    fetch("Zonas/BajarPrecios", {
        method: "POST", headers: { 'Content-Type': 'application/json;charset=utf-8' }, body: JSON.stringify(nuevoModelo)
    }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(() => { exitoModal("Precios bajados correctamente"); $("#modalBajar").modal("hide"); aplicarFiltros(); })
        .catch(console.error);
}

// -------- Precio input: formateo on blur --------
if (precioInput) {
    precioInput.addEventListener('blur', function () {
        const raw = this.value.replace(/[^0-9.,-]/g, '').replace('.', '').replace(',', '.');
        const val = parseFloat(raw) || 0;
        this.value = formatNumber(val);
    });
}

// -------- Toggle menú Acciones + cerrar fuera --------
function toggleAcciones(id) {
    const $m = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);
    $('.acciones-dropdown').not($m).hide();
    $m.toggle();
}
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});

// -------- Persistencia de Filtros (mostrar/ocultar) --------
function initToggleFiltrosPersistenteZonas() {
    const btn = document.getElementById('btnToggleFiltros');
    const icon = document.getElementById('iconFiltros');
    const panel = document.getElementById('formFiltrosZonas');
    const STORAGE_KEY = 'Zonas_FiltrosVisibles';

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
    });
}

// -------- SignalR (tu lógica, respetada) --------
const connection = new signalR.HubConnectionBuilder().withUrl("/notificacionesHub").build();

connection.on("ActualizarSignalR", async function (data) {
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    if (data.idUsuario === userSession.Id) return;

    reproducirSonidoNotificacion?.();

    const filaEnEdicion = document.querySelector('#grd_Zonas input, #grd_Zonas select');
    const tr = filaEnEdicion ? filaEnEdicion.closest('tr') : null;
    const idEditando = tr ? gridZonas.row(tr).data()?.Id : null;
    const estabaEditando = !!filaEnEdicion;

    if (estabaEditando) {
        const cell = gridZonas.cell(filaEnEdicion.closest('td'));
        const valorOriginal = cell.data();
        cell.data(valorOriginal).draw(false);
    }

    if (typeof aplicarFiltros === "function") await aplicarFiltros();

    setTimeout(() => {
        if (typeof marcarFilaCambio === "function") {
            marcarFilaCambio(gridZonas, data.id, data.tipo?.toLowerCase());
        }
        if (estabaEditando && idEditando === data.id) {
            const rowIdx = gridZonas.rows().indexes().toArray().find(idx => gridZonas.row(idx).data()?.Id === idEditando);
            if (rowIdx !== undefined) {
                const rowNode = gridZonas.row(rowIdx).node();
                const firstEditableCell = rowNode.querySelector('td:not(:first-child)');
                if (firstEditableCell) firstEditableCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
            }
        }
    }, 500);

    const tipo = data.tipo?.toLowerCase();
    let mensaje = `#${data.nombre} ${data.tipo} por ${data.usuario}.`;
    if ((tipo === "actualizada" || tipo === "eliminada") && data.cliente) {
        mensaje = `#${data.nombre} del cliente ${data.cliente} ${data.tipo} por ${data.usuario}.`;
    }
    const opciones = { timeOut: 5000, positionClass: "toast-bottom-right", progressBar: true, toastClass: "toastr ancho-personalizado" };
    if (tipo === "eliminada") toastr.error(mensaje, "Zonas", opciones);
    else if (tipo === "actualizada") toastr.warning(mensaje, "Zonas", opciones);
    else toastr.success(mensaje, "Zonas", opciones);
});

connection.start().then(() => console.log("✅ SignalR conectado [zonas.js]")).catch(err => console.error("❌ Error SignalR:", err.toString()));


function handleChipSelectClick(btn) {
    const $btn = $(btn);
    const id = Number($btn.data('id')) || 0;

    const selected = !$btn.hasClass('is-selected');
    $btn.toggleClass('is-selected', selected).attr('aria-pressed', selected);

    const $icon = $btn.find('.fa');
    const $txt = $btn.find('span');

    if (selected) {
        $icon.removeClass('fa-square-o').addClass('fa-check-square');
        $txt.text('Seleccionado');
        if (!selectedZonas.includes(id)) selectedZonas.push(id);
    } else {
        $icon.removeClass('fa-check-square').addClass('fa-square-o');
        $txt.text('Elegir');
        const ix = selectedZonas.indexOf(id);
        if (ix > -1) selectedZonas.splice(ix, 1);
    }

    actualizarBotonesAccion();
}

function desmarcarChipSelects() {
    selectedZonas = [];
    $('.chip-select').removeClass('is-selected').attr('aria-pressed', false)
        .each(function () {
            $(this).find('.fa').removeClass('fa-check-square').addClass('fa-square-o');
            $(this).find('span').text('Elegir');
        });
    $('#selectAllCheckbox').prop('checked', false);
    actualizarBotonesAccion();
}


$('#selectAllCheckbox').off('change.selAll').on('change.selAll', function () {
    const checkAll = $(this).is(':checked');
    selectedZonas = [];

    $('.chip-select').each(function () {
        const $btn = $(this);
        const id = Number($btn.data('id')) || 0;

        if (checkAll) {
            $btn.addClass('is-selected').attr('aria-pressed', true);
            $btn.find('.fa').removeClass('fa-square-o').addClass('fa-check-square');
            $btn.find('span').text('Seleccionado');
            if (!selectedZonas.includes(id)) selectedZonas.push(id);
        } else {
            $btn.removeClass('is-selected').attr('aria-pressed', false);
            $btn.find('.fa').removeClass('fa-check-square').addClass('fa-square-o');
            $btn.find('span').text('Elegir');
        }
    });

    actualizarBotonesAccion();
});

$(document).off('click', '.chip-select').on('click', '.chip-select', function (e) {
    e.preventDefault();
    handleChipSelectClick(this);
});