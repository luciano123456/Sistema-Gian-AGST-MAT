/* ==========================================================
 * clientes.js — FULL (ARG-TZ & Saldos mejorado)
 *  - Mantiene tu lógica original (DataTable, inline edit, filtros, SignalR)
 *  - Saldos:
 *      · Modal unificado (si existe) con Historial / Nuevo / Editar
 *      · Totales (Ingresos / Egresos / Saldo) correctos y se actualizan con filtro
 *      · Fecha por defecto y persistente usando hora de Argentina
 *      · Íconos FA 4.7 para editar / eliminar
 *      · FIX: “Invalid date” (parser tolerante)
 *      · Filtro Observaciones funcionando (#filtroObservaciones)
 *      · Tabs bloqueadas mientras estás en “Editar”
 *  - Todas las fechas se muestran y envían en horario de Argentina
 * ========================================================== */

let gridClientes;
let isEditing = false;

const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'select', fetchDataFunc: listaProvinciasFilter },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Telefono: "",
    Direccion: "",
    IdProvincia: 1,
    Localidad: "",
    DNI: "",
};

/* =========================
   Helpers DOM / API
   ========================= */
function _$(q, c = document) { return c.querySelector(q); }
function _$$(q, c = document) { return Array.from(c.querySelectorAll(q)); }
async function _apiGet(url) {
    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}
async function _apiSend(url, method, body) {
    const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}
function _esc(s) {
    return (s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
/* ==== FECHAS — Argentina (moment/moment-timezone) ==== */
// === PARSE seguro de inputs <input type="datetime-local"> en zona AR ===
const AR_TZ = 'America/Argentina/Buenos_Aires';
if (typeof moment !== 'undefined' && moment.tz) moment.tz.setDefault(AR_TZ);

// Convierte el valor de un input (o un string) a "YYYY-MM-DDTHH:mm:ssZ" en AR.
// Si está vacío o inválido, devuelve la fecha/hora actual de AR.
function argOffsetFromLocal(val) {
    // permitir pasar el selector del input directamente
    if (typeof val === 'string' && val.startsWith('#')) {
        const el = document.querySelector(val);
        val = el ? el.value : '';
    }

    // val típico del input: "YYYY-MM-DDTHH:mm"
    if (val && typeof val === 'string') val = val.trim();

    if (typeof moment !== 'undefined' && moment.tz) {
        let m = val ? moment.tz(val, 'YYYY-MM-DDTHH:mm', AR_TZ) : moment.tz(AR_TZ);
        if (!m.isValid() && val) {
            // intenta otros formatos por las dudas
            m = moment.tz(val, AR_TZ);
        }
        if (!m.isValid()) m = moment.tz(AR_TZ); // fallback ahora
        return m.format('YYYY-MM-DDTHH:mm:ssZ');
    } else {
        // sin moment-timezone: tratá el valor como local y forzá offset -03:00
        let m = val ? moment(val, 'YYYY-MM-DDTHH:mm', true) : moment();
        if (!m.isValid() && val) m = moment(val);
        if (!m.isValid()) m = moment(); // fallback ahora
        // forzamos -03:00 (Argentina sin DST)
        m = m.utcOffset(-180, true);
        return m.format('YYYY-MM-DDTHH:mm:ssZ');
    }
}

// Devuelve string "YYYY-MM-DDTHH:mm" (para setear en el input) siempre en AR.
function nowLocalDatetimeAR() {
    if (typeof moment !== 'undefined' && moment.tz) return moment.tz(AR_TZ).format('YYYY-MM-DDTHH:mm');
    return moment().utcOffset(-180).format('YYYY-MM-DDTHH:mm');
}

function mArg(val) {
    if (typeof moment !== 'undefined' && moment.tz) return val ? moment.tz(val, AR_TZ) : moment.tz(AR_TZ);
    return val ? moment(val).utcOffset(-180, true) : moment().utcOffset(-180);
}

// Reemplazar por completo esta función
function parseToMoment(val) {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'string' && val.startsWith('0001-01-01')) return null; // default SQL

    // /Date(1730689260000)/
    if (typeof val === 'string') {
        const ms = /\/Date\((\d+)\)\//.exec(val);
        if (ms) return mArg(parseInt(ms[1], 10));
    }
    if (val instanceof Date) return mArg(val);
    if (typeof val === 'number') return mArg(val);

    // Formatos SIN zona (tratar como hora local de Argentina)
    const fmtsLocal = [
        'YYYY-MM-DDTHH:mm',
        'YYYY-MM-DDTHH:mm:ss',
        'YYYY-MM-DDTHH:mm:ss.SSS',
        'YYYY-MM-DD HH:mm',
        'YYYY-MM-DD HH:mm:ss',
        'DD/MM/YYYY HH:mm',
        'DD/MM/YYYY'
    ];

    // ¿trae offset/Z al final?
    const hasOffset = (typeof val === 'string') && /([Zz]|[+\-]\d{2}:?\d{2})$/.test(val);

    if (typeof moment !== 'undefined' && moment.tz) {
        let m;
        if (!hasOffset && typeof val === 'string') {
            // sin offset → parsear como tiempo local de AR
            m = moment.tz(val, fmtsLocal, true, AR_TZ);
            if (m.isValid()) return m;
        }
        // con offset o último intento (ISO)
        m = moment(val, [moment.ISO_8601].concat(fmtsLocal), true);
        if (m.isValid()) return m.tz(AR_TZ);
        return null;
    } else {
        // Sin moment-timezone: forzar -03:00
        let m = moment(val, fmtsLocal, true);
        if (!m.isValid()) m = moment(val);
        if (!m.isValid()) return null;
        return m.utcOffset(-180, true);
    }
}

// devuelve la PRIMER fecha disponible con nombres típicos del server
function pickFechaMovimiento(obj) {
    return obj?.Fecha ?? obj?.fecha ?? obj?.FechaMovimiento ?? obj?.fechaMovimiento ?? obj?.CreatedAt ?? obj?.createdAt ?? null;
}

// para inputs datetime-local (en AR)
function nowLocalDatetime() { return mArg().format('YYYY-MM-DDTHH:mm'); }
function toLocalInputDatetime(val) { const m = parseToMoment(val) || mArg(); return m.format('YYYY-MM-DDTHH:mm'); }

function pickFechaMovimiento(obj) {
    return obj?.Fecha
        ?? obj?.fecha
        ?? obj?.FechaMovimiento
        ?? obj?.fechaMovimiento
        ?? obj?.CreatedAt
        ?? obj?.createdAt
        ?? obj?.FechaAlta
        ?? obj?.fechaAlta
        ?? obj?.Date
        ?? obj?.date
        ?? null;
}

// Devuelve 'DD/MM/YYYY HH:mm' en AR o '-' si no se puede parsear
function formatFechaCorta(val, conHora = true) {
    const m = parseToMoment(val);
    if (!m) return '-';
    return conHora ? m.format('DD/MM/YYYY HH:mm') : m.format('DD/MM/YYYY');
}


/* =========================
   Ready
   ========================= */
$(document).ready(() => {
    listaClientes();

    if (typeof inicializarSonidoNotificacion === 'function') inicializarSonidoNotificacion();

    document.addEventListener("touchstart", desbloquearAudio, { once: true });
    document.addEventListener("click", desbloquearAudio, { once: true });

    $('#txtNombre').on('input', function () { validarCampos(); });

    // Conectar modal unificado de Saldos si está en la vista
    wireModalSaldosSiExiste();
});

/* =========================
   Alta / edición general
   ========================= */
function guardarCambios() {
    if (validarCampos()) {
        const idCliente = $("#txtId").val();
        const nuevoModelo = {
            "Id": idCliente !== "" ? idCliente : 0,
            "Nombre": $("#txtNombre").val(),
            "Telefono": $("#txtTelefono").val(),
            "Direccion": $("#txtDireccion").val(),
            "IdProvincia": $("#Provincias").val(),
            "Localidad": $("#txtLocalidad").val(),
            "Dni": $("#txtDni").val()
        };

        const url = idCliente === "" ? "Clientes/Insertar" : "Clientes/Actualizar";
        const method = idCliente === "" ? "POST" : "PUT";

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(_ => {
                const mensaje = idCliente === "" ? "Cliente registrado correctamente" : "Cliente modificado correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal("✔ " + mensaje);
                listaClientes();
            })
            .catch(error => {
                console.error('Error:', error);
                errorModal('Ocurrió un error al guardar.');
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}

function validarCampos() {
    const nombre = $("#txtNombre").val();
    const camposValidos = nombre !== "";

    $("#lblNombre").css("color", camposValidos ? "" : "red");
    $("#txtNombre").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}

function nuevoCliente() {
    limpiarModal();
    listaProvincias();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Cliente");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
}

async function mostrarModal(modelo) {
    const campos = ["Id", "Nombre", "Telefono", "Direccion", "IdProvincia", "Localidad", "Dni"];
    campos.forEach(campo => { $(`#txt${campo}`).val(modelo[campo]); });

    await listaProvincias();
    document.getElementById("Provincias").value = modelo.IdProvincia;

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Cliente");
    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
}

function limpiarModal() {
    const campos = ["Id", "Nombre", "Telefono", "Direccion", "IdProvincia", "Localidad", "DNI"];
    campos.forEach(campo => { $(`#txt${campo}`).val(""); });
    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}

/* =========================
   Listas / Provincias
   ========================= */
async function listaClientes() {
    let paginaActual = gridClientes != null ? gridClientes.page() : 0;
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
    if (paginaActual > 0) gridClientes.page(paginaActual).draw('page');
}

async function obtenerProvincias() {
    const response = await fetch('/Clientes/ListaProvincias');
    const provincias = await response.json();
    return provincias;
}

async function listaProvincias() {
    const data = await obtenerProvincias();
    $('#Provincias option').remove();

    const selectProvincias = document.getElementById("Provincias");
    for (let i = 0; i < data.length; i++) {
        const option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);
    }
}

async function listaProvinciasFilter() {
    const data = await obtenerProvincias();
    return data.map(provincia => ({ Id: provincia.Id, Nombre: provincia.Nombre }));
}

const editarCliente = id => {
    fetch("Clientes/EditarInfo?id=" + id)
        .then(response => {
            if (!response.ok) throw new Error("Ha ocurrido un error.");
            return response.json();
        })
        .then(dataJson => {
            if (dataJson !== null) {
                mostrarModal(dataJson);
            } else {
                throw new Error("Ha ocurrido un error.");
            }
        })
        .catch(_ => { errorModal("Ha ocurrido un error."); });
};

/* ==========================================================
   *** SALDOS — MODAL UNIFICADO (si existe) + FALLBACK ***
   ========================================================== */
let _SALDOS_modal, _SALDOS_tblBody, _SALDOS_idCliente = 0, _SALDOS_nombre = '';
let _SALDOS_historialAll = []; // para filtro
let _SALDOS_lockTabs = false;  // bloqueo de tabs en edición

function wireModalSaldosSiExiste() {
    _SALDOS_modal = _$('#modalSaldos');
    if (!_SALDOS_modal) return; // no existe en la vista

    _SALDOS_tblBody = _$('#tblHistorialSaldos tbody');

    _$('#btnCrearMovimiento')?.addEventListener('click', _SALDOS_crearMovimiento);
    _$('#btnGuardarEdicion')?.addEventListener('click', _SALDOS_guardarEdicion);
    _$('#btnCancelarEdicion')?.addEventListener('click', () => _SALDOS_irTab('historial'));

    // Filtro observaciones (en vivo)
    const inp = _$('#filtroObservaciones');
    if (inp) inp.addEventListener('input', _SALDOS_filtrarYRender);

    _SALDOS_wireTabClickGuards();
}

// Guards de tabs (no cambiar de pestaña cuando estás editando)
function _SALDOS_disableTab(sel) {
    const el = _$(sel);
    if (!el) return;
    el.classList.add('disabled');
    el.setAttribute('aria-disabled', 'true');
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.5';
}
function _SALDOS_enableTab(sel) {
    const el = _$(sel);
    if (!el) return;
    el.classList.remove('disabled');
    el.removeAttribute('aria-disabled');
    el.style.pointerEvents = '';
    el.style.opacity = '';
}
function _SALDOS_wireTabClickGuards() {
    ['#tab-historial-tab', '#tab-nuevo-tab'].forEach(sel => {
        const el = _$(sel);
        if (!el || el._guarded) return;
        el._guarded = true;
        el.addEventListener('click', (e) => {
            if (_SALDOS_lockTabs) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof toastr !== 'undefined') {
                    toastr.info('Terminá o cancelá la edición para cambiar de pestaña.', 'Edición en curso', {
                        timeOut: 2500, positionClass: "toast-bottom-right"
                    });
                }
            }
        });
    });
}

// Navegar tabs + lock cuando edita
function _SALDOS_irTab(nombre) {
    const map = { historial: '#tab-historial-tab', nuevo: '#tab-nuevo-tab', editar: '#tab-editar-tab' };
    const btn = _$(map[nombre]);
    if (!btn) return;

    // Mostrar/ocultar la pestaña "Editar" solo cuando se usa
    const editLi = _$('#tab-editar-tab')?.closest('li');
    if (editLi) editLi.classList.toggle('d-none', nombre !== 'editar');

    if (nombre === 'editar') {
        _SALDOS_lockTabs = true;
        _SALDOS_disableTab('#tab-historial-tab');
        _SALDOS_disableTab('#tab-nuevo-tab');
    } else {
        _SALDOS_lockTabs = false;
        _SALDOS_enableTab('#tab-historial-tab');
        _SALDOS_enableTab('#tab-nuevo-tab');
    }

    const tab = new bootstrap.Tab(btn);
    tab.show();
}

const agregarSaldoModal = id => {
    // ¿Existe modal unificado?
    if (_SALDOS_modal) {
        let nombreCli = '';
        try {
            const idx = gridClientes
                ?.rows()
                ?.indexes()
                ?.toArray()
                ?.find(i => gridClientes.row(i).data().Id === id);
            if (idx !== undefined) nombreCli = gridClientes.row(idx).data().Nombre || '';
        } catch { /* ignore */ }

        abrirModalSaldos_Unificado(id, nombreCli);
        return;
    }

    // ==== Flujo anterior ====
    $("#txtIdClienteSaldo").val(id);
    $("#txtSaldo").val("$ 0,00");
    $("#modalSaldo").modal('show');
};

async function agregarSaldo() {
    var idCliente = $("#txtIdClienteSaldo").val();
    var saldo = parseFloat(convertirMonedaAFloat($("#txtSaldo").val()));
    var observaciones = $("#txtObservaciones").val();

    try {
        const queryString = new URLSearchParams({
            idCliente: idCliente,
            Saldo: saldo,
            Observaciones: observaciones,
        }).toString();

        const response = await fetch(`/Clientes/SumarSaldo?${queryString}`, { method: 'POST' });

        if (response.ok) {
            listaClientes();
            exitoModal("Saldo agregado correctamente");
        } else {
            errorModal('Ha ocurrido un error al guardar los datos...');
        }

        $("#modalSaldo").modal('hide');
    } catch (error) {
        console.error('Error de red:', error);
        errorModal('Error de red');
    }
}

async function verHistorialSaldo(idCliente) {
    if (_SALDOS_modal) {
        let nombreCli = '';
        try {
            const idx = gridClientes?.rows()?.indexes()?.toArray()?.find(i => gridClientes.row(i).data().Id === idCliente);
            if (idx !== undefined) nombreCli = gridClientes.row(idx).data().Nombre || '';
        } catch { }
        abrirModalSaldos_Unificado(idCliente, nombreCli, true);
        return;
    }

    // ======== Fallback: tu modal viejo ========
    const tbody = document.getElementById("tablaHistorialBody");
    const tfoot = document.getElementById("tablaHistorialFooter");

    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Cargando...</td></tr>`;
    tfoot.innerHTML = "";

    $("#modalHistorialSaldo").modal("show");

    try {
        const response = await fetch(`/Clientes/ObtenerHistorial?idCliente=${idCliente}`);
        if (!response.ok) throw new Error("Error en la respuesta del servidor");
        const data = await response.json();

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">No hay movimientos registrados.</td></tr>`;
            return;
        }

        let rows = "";
        let totalIngresos = 0;
        let totalEgresos = 0;

        data.forEach(item => {
            const fecha = formatFechaCorta(item.Fecha);
            const ingreso = item.Ingreso ? `<span class="text-success fw-bold"><i class="fa fa-arrow-up"></i> ${formatNumber(item.Ingreso)}</span>` : "-";
            const egreso = item.Egreso ? `<span class="text-danger fw-bold"><i class="fa fa-arrow-down"></i> ${formatNumber(item.Egreso)}</span>` : "-";

            totalIngresos += item.Ingreso || 0;
            totalEgresos += item.Egreso || 0;

            let obsTexto = item.Observaciones || "";
            const maxLen = 200;
            const obsMostrada = obsTexto.length > maxLen ? obsTexto.substring(0, maxLen) + "..." : obsTexto;

            rows += `
              <tr>
                <td class="text-center">${fecha}</td>
                <td class="text-center">${ingreso}</td>
                <td class="text-center">${egreso}</td>
                <td><span class="observacion-texto" title="${_esc(obsTexto)}">${_esc(obsMostrada)}</span></td>
              </tr>`;
        });

        tbody.innerHTML = rows;

        const saldoFinal = totalIngresos - totalEgresos;
        tfoot.innerHTML = `
            <tr>
                <td colspan="4" class="text-end small">
                    <div class="d-flex justify-content-end gap-4">
                        <div><strong>Total Ingresos:</strong> <span class="text-success">${formatNumber(totalIngresos)}</span></div>
                        <div><strong>Total Egresos:</strong> <span class="text-danger">${formatNumber(totalEgresos)}</span></div>
                        <div><strong>Saldo:</strong> <span class="${saldoFinal >= 0 ? 'text-success' : 'text-danger'}">${formatNumber(saldoFinal)}</span></div>
                    </div>
                </td>
            </tr>`;
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Ocurrió un error al cargar el historial.</td></tr>`;
        tfoot.innerHTML = "";
    }
}

async function abrirModalSaldos(idCliente, nombreCliente) {
    _SALDOS_setModo('hist');             // modo historial
    _SALDOS_bindFiltroObservaciones();   // vincula el input
    await _SALDOS_cargarHistorial(idCliente); // carga y normaliza __FechaFmt
    _SALDOS_filtrarYRender();            // pinta con (o sin) filtro aplicado
}

/* ======= Unificado ======= */
async function abrirModalSaldos_Unificado(idCliente, nombreCliente, forzarHistorial = false) {
    _SALDOS_idCliente = idCliente;
    _SALDOS_nombre = nombreCliente || '';

    _$('#lblClienteSaldos').textContent = _SALDOS_nombre;
    _$('#saldoIdCliente') && (_$('#saldoIdCliente').value = _SALDOS_idCliente);

    // Setear fecha por defecto (si está vacío) en hora de Argentina
    const inpNuevo = document.querySelector('#movFecha');
    if (inpNuevo && !inpNuevo.value) inpNuevo.value = nowLocalDatetimeAR();

    await _SALDOS_cargarHistorial(_SALDOS_idCliente);

    _SALDOS_irTab(forzarHistorial ? 'historial' : 'nuevo');
    bootstrap.Modal.getOrCreateInstance(_SALDOS_modal).show();
}

async function _SALDOS_cargarHistorial(idCliente) {
    if (!_SALDOS_tblBody) return;
    _SALDOS_tblBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">Cargando...</td></tr>`;

    try {
        const data = await _apiGet(`/Clientes/ObtenerHistorial?idCliente=${idCliente}`);
        _SALDOS_historialAll = Array.isArray(data) ? data : [];

        _SALDOS_filtrarYRender(); // render con filtro aplicado

        const bdg = _$('#badgeCountHistorial');
        if (bdg) {
            if (!_SALDOS_historialAll.length) { bdg.style.display = 'none'; }
            else { bdg.textContent = _SALDOS_historialAll.length; bdg.style.display = 'inline-block'; }
        }
    } catch (e) {
        console.error(e);
        _SALDOS_tblBody.innerHTML = `<tr><td colspan="5" class="text-danger text-center py-4">Error al cargar historial</td></tr>`;
        _SALDOS_actualizarTotales([]);
    }
}

function _SALDOS_filtrarYRender() {
    // Aplica filtro por Observaciones (y, de yapa, por Fecha formateada)
    const lista = (_SALDOS_historialAll || []).filter(x => {
        if (!_SALDOS_term) return true;
        const obs = _norm(x.Observaciones || x.observaciones || '');
        const f = _norm(x.__FechaFmt || ''); // si la normalizaste antes
        return obs.includes(_SALDOS_term) || f.includes(_SALDOS_term);
    });

    _SALDOS_renderHistorial(lista);    // tu renderer de filas
    _SALDOS_actualizarTotales(lista);  // tus totales de ingresos/egresos/saldo
}

function _SALDOS_renderHistorial(lista) {
    _SALDOS_tblBody.innerHTML = '';

    if (!lista || lista.length === 0) {
        _SALDOS_tblBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">Sin movimientos.</td></tr>`;
        return;
    }

    const rows = document.createDocumentFragment();

    lista.forEach(item => {
        const tr = document.createElement('tr');
        const fecha = formatFechaCorta(item.Fecha || item.fecha); // SIEMPRE AR
        const ingreso = Number(item.Ingreso || item.ingreso || 0);
        const egreso = Number(item.Egreso || item.egreso || 0);
        const obs = item.Observaciones || item.observaciones || '';
        const idMov = item.Id || item.id;

        tr.setAttribute('data-id', idMov);

        tr.innerHTML = `
            <td class="text-center">${_esc(fecha)}</td>
            <td class="text-end text-success">$ ${ingreso.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td class="text-end text-danger">$ ${egreso.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td>${_esc(obs)}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-primary" data-act="edit" title="Editar">
                    <i class="fa fa-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" data-act="del" title="Eliminar">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        `;
        rows.appendChild(tr);
    });

    _SALDOS_tblBody.appendChild(rows);

    _$$('[data-act="edit"]', _SALDOS_tblBody).forEach(btn => btn.addEventListener('click', _SALDOS_onEditarClick));
    _$$('[data-act="del"]', _SALDOS_tblBody).forEach(btn => btn.addEventListener('click', _SALDOS_onEliminarClick));
}

function _SALDOS_actualizarTotales(lista) {
    let totalIng = 0, totalEgr = 0;
    (lista || []).forEach(m => {
        totalIng += Number(m.Ingreso || m.ingreso || 0);
        totalEgr += Number(m.Egreso || m.egreso || 0);
    });
    const saldo = totalIng - totalEgr;

    const fmt = n => `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

    _$('#sumIngresos') && (_$('#sumIngresos').innerText = fmt(totalIng));
    _$('#sumEgresos') && (_$('#sumEgresos').innerText = fmt(totalEgr));
    _$('#sumSaldo') && (_$('#sumSaldo').innerText = fmt(saldo));
    _$('#saldoHeaderValue') && (_$('#saldoHeaderValue').innerText = fmt(saldo));
}

function _SALDOS_limpiarNuevo(preservarFecha = true) {
    _$('#movTipo') && (_$('#movTipo').value = 'Ingreso');
    _$('#movMonto') && (_$('#movMonto').value = '');
    _$('#movObs') && (_$('#movObs').value = '');
    const inpFecha = _$('#movFecha');
    if (inpFecha && !preservarFecha) inpFecha.value = nowLocalDatetime(); // AR
}

function _SALDOS_onEditarClick(ev) {
    const tr = ev.currentTarget.closest('tr');
    const idMov = Number(tr?.getAttribute('data-id') || 0);
    if (!idMov) return;
    _SALDOS_cargarMovimientoEnEdicion(idMov);
}

async function _SALDOS_cargarMovimientoEnEdicion(idMovimiento) {
    try {
        const mov = await _apiGet(`/Clientes/ObtenerMovimientoSaldo?idMovimiento=${idMovimiento}`);
        _$('#movEditId').value = mov.id ?? mov.Id;

        const ingreso = mov.Ingreso ?? mov.ingreso ?? 0;
        const egreso = mov.Egreso ?? mov.egreso ?? 0;

        _$('#movEditTipo').value = (ingreso && ingreso > 0) ? 'Ingreso' : 'Egreso';
        _$('#movEditMonto').value = (ingreso && ingreso > 0) ? ingreso : egreso;
        _$('#movEditObs').value = mov.Observaciones ?? mov.observaciones ?? '';

        const fechaVal = mov.Fecha ?? mov.fecha ?? null;
        document.querySelector('#movEditFecha').value = nowLocalDatetimeAR();

        _SALDOS_irTab('editar');
    } catch (e) {
        console.error(e);
        errorModal('No se pudo cargar el movimiento');
    }
}

async function _SALDOS_onEliminarClick(ev) {
    const tr = ev.currentTarget.closest('tr');
    const idMov = Number(tr?.getAttribute('data-id') || 0);
    if (!idMov) return;

    if (!confirm('¿Eliminar este movimiento? Esta acción revertirá su impacto en el saldo.')) return;

    try {
        const res = await _apiSend(`/Clientes/EliminarMovimientoSaldo?idMovimiento=${idMov}`, 'DELETE');
        if (res?.valor) {
            exitoModal('Movimiento eliminado');
            await _SALDOS_cargarHistorial(_SALDOS_idCliente);
            listaClientes(); // refrescar grilla (SaldoAfavor)
        } else {
            errorModal('No se pudo eliminar');
        }
    } catch (e) {
        console.error(e);
        errorModal('Error al eliminar movimiento');
    }
}

async function _SALDOS_crearMovimiento() {
    const tipo = _$('#movTipo')?.value;
    const monto = Number(_$('#movMonto')?.value || 0);
    const obs = _$('#movObs')?.value || '';
    const fechaVal = _$('#movFecha')?.value; // yyyy-MM-ddTHH:mm (AR)

    if (!tipo || !monto || monto <= 0) {
        errorModal('Completá tipo y un monto válido');
        return;
    }

    // Serializamos con offset -03:00 (o el que corresponda si usás tz)
    //const fechaIsoOffset = mArg(fechaVal).format('YYYY-MM-DDTHH:mm:ssZ');
    const fechaIsoOffset = argOffsetFromLocal('#movFecha');

    try {
        const payload = { IdCliente: _SALDOS_idCliente, Monto: monto, Tipo: tipo, Observaciones: obs, Fecha: fechaIsoOffset };
        const res = await _apiSend('/Clientes/CrearMovimientoSaldo', 'POST', payload);
        if (res?.valor) {
            exitoModal('Movimiento creado');
            _SALDOS_limpiarNuevo(true);              // no tocar la fecha para cargar varios seguidos
            await _SALDOS_cargarHistorial(_SALDOS_idCliente);
            _SALDOS_irTab('historial');
            listaClientes();                         // refrescar grilla (SaldoAfavor)
        } else {
            errorModal('No se pudo crear movimiento');
        }
    } catch (e) {
        console.error(e);
        errorModal('Error al crear movimiento');
    }
}

async function _SALDOS_guardarEdicion() {
    const id = Number(_$('#movEditId')?.value || 0);
    const tipo = _$('#movEditTipo')?.value;
    const monto = Number(_$('#movEditMonto')?.value || 0);
    const obs = _$('#movEditObs')?.value || '';
    const fechaVal = _$('#movEditFecha')?.value; // yyyy-MM-ddTHH:mm (AR)

    if (!id || !tipo || !monto || monto <= 0) {
        errorModal('Completá tipo y un monto válido');
        return;
    }

    const fechaIsoOffset = argOffsetFromLocal('#movFecha');

    try {
        const payload = { IdMovimiento: id, Monto: monto, Tipo: tipo, Observaciones: obs, Fecha: fechaIsoOffset };
        const res = await _apiSend('/Clientes/ActualizarMovimientoSaldo', 'PUT', payload);
        if (res?.valor) {
            exitoModal('Movimiento actualizado');
            await _SALDOS_cargarHistorial(_SALDOS_idCliente);
            _SALDOS_irTab('historial');             // desbloquea tabs
            listaClientes();                        // refrescar grilla
        } else {
            errorModal('No se pudo actualizar');
        }
    } catch (e) {
        console.error(e);
        errorModal('Error al actualizar movimiento');
    }
}

/* =========================
   Eliminar Cliente
   ========================= */
async function eliminarCliente(id) {
    let resultado = window.confirm("¿Desea eliminar el Cliente?");

    if (resultado) {
        try {
            const response = await fetch("Clientes/Eliminar?id=" + id, { method: "DELETE" });
            if (!response.ok) throw new Error("Error al eliminar el cliente.");

            const dataJson = await response.json();
            if (dataJson.valor) {
                listaClientes();
                exitoModal("Cliente eliminado correctamente");
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
            errorModal('No se pudo eliminar el cliente.');
        }
    }
}

/* =========================
   DataTable
   ========================= */
async function configurarDataTable(data) {
    if (!gridClientes) {
        $('#grd_clientes thead tr').clone(true).addClass('filters').appendTo('#grd_clientes thead');
        gridClientes = $('#grd_clientes').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data, _t, row) {
                        return `
                <div class="acciones-menu" data-id="${data}">
                    <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                        <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                    </button>
                    <div class="acciones-dropdown" style="display: none;">
                        <button class='btn btn-sm btneditar' type='button' onclick='agregarSaldoModal(${data})' title='Agregar Saldo'>
                            <i class='fa fa-money fa-lg text-success' aria-hidden='true'></i> Agregar Saldo
                        </button>
                        <button class='btn btn-sm btneditar' type='button' onclick='editarCliente(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarCliente(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre', width: "25%" },
                { data: 'Telefono', width: "20" },
                {
                    data: function (row) {
                        return row.Direccion && row.Direccion.trim() !== ""
                            ? '<div class="location-cell"><i title="Ir a Google Maps" class="fa fa-map-marker fa-2x text-warning"></i> ' + row.Direccion + '</div>'
                            : row.Direccion;
                    }
                },
                { data: 'Provincia', width: "22%" },
                { data: 'Localidad', width: "18%" },
                { data: 'Dni', width: "14%" },
                {
                    data: null,
                    render: function (_d, _t, row) {
                        return `
            <div class="d-flex align-items-center justify-content-center">
                <span>${formatNumber(row.SaldoAfavor)}</span>
                <i class="fa fa-eye text-primary ms-2" title="Ver Historial" style="cursor:pointer;"
                   onclick="verHistorialSaldo(${row.Id})"></i>
            </div>`;
                    }
                },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Clientes',
                    title: '',
                    exportOptions: { columns: [0, 1, 2, 3, 4, 5] },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Clientes',
                    title: '',
                    exportOptions: { columns: [0, 1, 2, 3, 4, 5] },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [0, 1, 2, 3, 4, 5] },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,
            columnDefs: [
                { render: function (data) { return formatNumber(data); }, targets: [7] },
                { targets: 0, width: '1%' },
            ],
            initComplete: async function () {
                var api = this.api();

                columnConfig.forEach(async (config) => {
                    var cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        var select = $('<select id="filter' + config.index + '"><option value="">Seleccionar Provincia</option></select>')
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                var val = $(this).val();
                                var selectedText = $(this).find('option:selected').text();
                                await api.column(config.index).search(val ? '^' + selectedText + '$' : '', true, false).draw();
                            });

                        var data = await config.fetchDataFunc();
                        data.forEach(function (item) {
                            select.append('<option value="' + item.Id + '">' + item.Nombre + '</option>');
                        });

                    } else if (config.filterType === 'text') {
                        var input = $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off('keyup change')
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                var regexr = '({search})';
                                var cursorPosition = this.selectionStart;
                                api.column(config.index)
                                    .search(this.value !== '' ? regexr.replace('{search}', '(((' + this.value + ')))') : '', this.value !== '', this.value == '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                });

                var firstColIdx = 0;
                $('.filters th').eq(firstColIdx).html('');

                configurarOpcionesColumnas();

                setTimeout(function () { gridClientes.columns.adjust(); }, 10);

                $('body').on('mouseenter', '#grd_clientes .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });

                $('body').on('click', '#grd_clientes .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' ');
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });

                $('#grd_clientes tbody').on('dblclick', 'td', async function () {
                    var cell = gridClientes.cell(this);
                    var originalData = cell.data();
                    var colIndex = cell.index().column;
                    var rowData = gridClientes.row($(this).closest('tr')).data();

                    if (colIndex == 7) return;
                    if (isEditing == true) { return; } else { isEditing = true; }

                    if ($(this).hasClass('blinking')) $(this).removeClass('blinking');
                    if ($(this).find('input').length > 0 || $(this).find('select').length > 0) return;

                    if (colIndex === 4) {
                        var select = $('<select class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                            .appendTo($(this).empty());

                        var provincias = await obtenerProvincias();
                        provincias.forEach(function (provincia) {
                            select.append('<option value="' + provincia.Id + '">' + provincia.Nombre + '</option>');
                        });

                        select.val(rowData.IdProvincia);

                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            var selectedValue = select.val();
                            var selectedText = select.find('option:selected').text();
                            saveEdit(colIndex, gridClientes.row($(this).closest('tr')).data(), selectedText, selectedValue, $(this).closest('tr'));
                        });
                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);
                        $(this).append(saveButton).append(cancelButton);
                        select.focus();

                    } else if (colIndex === 7) {
                        var valueToDisplay = originalData ? originalData.toString().replace(/[^\d.-]/g, '') : '';
                        var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                            .val(formatoMoneda.format(valueToDisplay))
                            .on('input', function () {
                                var saveBtn = $(this).siblings('.fa-check');
                                if ($(this).val().trim() === "") {
                                    $(this).css('border-bottom', '2px solid red');
                                    saveBtn.css('opacity', '0.5'); saveBtn.prop('disabled', true);
                                } else {
                                    $(this).css('border-bottom', '2px solid green');
                                    saveBtn.css('opacity', '1'); saveBtn.prop('disabled', false);
                                }
                            });
                        input.on('blur', function () {
                            var rawValue = $(this).val().replace(/[^0-9,-]/g, '');
                            $(this).val(formatoMoneda.format(parseDecimal(rawValue)));
                        })
                            .on('keydown', function (e) {
                                if (e.key === 'Enter') {
                                    saveEdit(colIndex, gridClientes.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                            });

                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) {
                                saveEdit(colIndex, gridClientes.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            }
                        });
                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);
                        $(this).empty().append(input).append(saveButton).append(cancelButton);
                        input.focus();
                    } else {
                        var valueToDisplay = (originalData && originalData.toString().trim() !== "")
                            ? originalData.toString().replace(/<[^>]+>/g, "")
                            : originalData || "";
                        var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                            .val(valueToDisplay)
                            .on('input', function () {
                                var saveBtn = $(this).siblings('.fa-check');
                                if (colIndex === 0) {
                                    if ($(this).val().trim() === "") {
                                        $(this).css('border-bottom', '2px solid red');
                                        saveBtn.css('opacity', '0.5'); saveBtn.prop('disabled', true);
                                    } else {
                                        $(this).css('border-bottom', '2px solid green');
                                        saveBtn.css('opacity', '1'); saveBtn.prop('disabled', false);
                                    }
                                }
                            })
                            .on('keydown', function (e) {
                                if (e.key === 'Enter') {
                                    saveEdit(colIndex, gridClientes.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                            });

                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) {
                                saveEdit(colIndex, gridClientes.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            }
                        });
                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);
                        $(this).empty().append(input).append(saveButton).append(cancelButton);
                        input.focus();
                    }

                    function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                        var celda = $(trElement).find('td').eq(colIndex);
                        var originalText = gridClientes.cell(trElement, colIndex).data();

                        if (colIndex === 3) {
                            var tempDiv = document.createElement('div');
                            tempDiv.innerHTML = originalText;
                            originalText = tempDiv.textContent.trim();
                            newText = newText.trim();
                        }

                        if (originalText === newText) {
                            cancelEdit();
                            return;
                        }

                        if (colIndex === 3) {
                            rowData.Direccion = newText;
                        } else if (colIndex === 4) {
                            rowData.IdProvincia = newValue;
                            rowData.Provincia = newText;
                        } else if (colIndex === 6) {
                            rowData.Dni = newText;
                        } else if (colIndex === 7) {
                            rowData.SaldoAfavor = parseFloat(convertirMonedaAFloat(newText));
                        } else {
                            rowData[gridClientes.column(colIndex).header().textContent] = newText;
                        }

                        gridClientes.row(trElement).data(rowData).draw();

                        if (originalText !== newText) celda.addClass('blinking');

                        guardarCambiosFila(rowData);
                        isEditing = false;
                        setTimeout(function () { celda.removeClass('blinking'); }, 3000);
                    }

                    function cancelEdit() {
                        gridClientes.cell(cell.index()).data(originalData).draw();
                        isEditing = false;
                    }
                });
            },
        });
    } else {
        gridClientes.clear().rows.add(data).draw();
    }
}

function configurarOpcionesColumnas() {
    const grid = $('#grd_clientes').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = `Clientes_Columnas`;

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};
    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;
            grid.column(index).visible(isChecked);
            const columnName = index != 3 ? col.data : "Direccion";

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

$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide();
    }
});

async function guardarCambiosFila(rowData) {
    try {
        const response = await fetch('/Clientes/Actualizar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rowData)
        });
        if (!response.ok) errorModal('Ha ocurrido un error al guardar los datos...');
    } catch (error) {
        console.error('Error de red:', error);
    }
}

document.getElementById('txtSaldo')?.addEventListener('blur', function () {
    this.value = formatMoneda(convertirMonedaAFloat(this.value));
});

/* =========================
   SignalR
   ========================= */
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/notificacionesHub")
    .build();

connection.on("ActualizarSignalR", function (data) {
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    if (data.idUsuario !== userSession.Id) {
        if (typeof reproducirSonidoNotificacion === 'function') reproducirSonidoNotificacion();

        const tipo = data.tipo?.toLowerCase();
        const paginaActual = gridClientes.page();
        gridClientes.page(paginaActual).draw('page');

        let idEditando = null;
        let colEditando = null;

        if (isEditing) {
            const cell = gridClientes.cell('td:has(input), td:has(select)');
            const rowData = gridClientes.row(cell.index().row).data();
            idEditando = rowData?.Id;
            colEditando = cell.index().column;

            isEditing = false;
            gridClientes.cell(cell.index()).data(cell.data()).draw();
        }

        listaClientes().then(() => {
            setTimeout(async () => {
                if (idEditando !== null && colEditando !== null) {
                    const rowIndex = gridClientes.rows().indexes().toArray()
                        .find(i => gridClientes.row(i).data().Id === idEditando);

                    if (rowIndex !== undefined) {
                        const cellNode = gridClientes.cell(rowIndex, colEditando).node();
                        $(cellNode).trigger('dblclick');
                    }
                }

                if (typeof marcarFilaCambio === "function") {
                    const tipoAnimacion = tipo === "creado" ? "nueva" : "actualizada";
                    marcarFilaCambio(gridClientes, data.id, tipoAnimacion);
                }
            }, 300);
        });

        let mensaje = `#${data.usuarioModificado} ${data.tipo} por ${data.usuario}.`;
        const opciones = {
            timeOut: 5000,
            positionClass: "toast-bottom-right",
            progressBar: true,
            toastClass: "toastr ancho-personalizado"
        };

        if (tipo === "eliminado") {
            toastr.error(mensaje, "Clientes", opciones);
        } else if (tipo === "actualizado") {
            toastr.warning(mensaje, "Clientes", opciones);
        } else {
            toastr.success(mensaje, "Clientes", opciones);
        }
    }
});

connection.start()
    .then(() => console.log("✅ SignalR conectado"))
    .catch(err => console.error(err.toString()));



let _SALDOS_modo = 'hist'; // 'hist' | 'nuevo' | 'edit'
let _SALDOS_term = ''; // término de búsqueda actual

function _SALDOS_setModo(m) {
    _SALDOS_modo = m;
    const i = document.getElementById('saldosFiltroObs'); // input del buscador
    if (i) {
        const disabled = (m === 'edit'); // en editar, bloquear filtro
        i.disabled = disabled;
        i.classList.toggle('disabled', disabled);
    }
}

function _SALDOS_bindFiltroObservaciones() {
    const i = document.getElementById('saldosFiltroObs');
    if (!i || i.dataset.bound === '1') return;

    // Guarda/recupera último término
    const KEY = 'Clientes_Saldos_FiltroObs';
    const last = localStorage.getItem(KEY) || '';
    if (last && !i.value) i.value = last;

    const onChange = () => {
        _SALDOS_term = _norm(i.value);
        localStorage.setItem(KEY, i.value);
        _SALDOS_filtrarYRender();
    };

    i.addEventListener('input', onChange);
    i.addEventListener('change', onChange);
    i.dataset.bound = '1';

    // inicial
    _SALDOS_term = _norm(i.value);
}
