let gridHistorial;
const precioInput = document.getElementById('txtPrecio');

/** PascalCase o camelCase según serialización del API */
function histVal(obj, name) {
    if (!obj || !name) return undefined;
    if (obj[name] !== undefined && obj[name] !== null) return obj[name];
    const camel = name.charAt(0).toLowerCase() + name.slice(1);
    return obj[camel];
}

function normalizarHistorialLista(data) {
    if (!Array.isArray(data)) return [];
    const lista = data.map(row => ({
        Id: histVal(row, 'Id'),
        IdProducto: histVal(row, 'IdProducto'),
        IdProveedor: histVal(row, 'IdProveedor'),
        IdCliente: histVal(row, 'IdCliente'),
        Producto: histVal(row, 'Producto'),
        Fecha: histVal(row, 'Fecha'),
        PCostoNuevo: Number(histVal(row, 'PCostoNuevo')) || 0,
        PCostoAnterior: Number(histVal(row, 'PCostoAnterior')) || 0,
        PVentaNuevo: Number(histVal(row, 'PVentaNuevo')) || 0,
        PVentaAnterior: Number(histVal(row, 'PVentaAnterior')) || 0
    }));
    lista.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
    return lista;
}

function formatFechaHistorial(valor, type) {
    if (valor == null || valor === '') {
        return type === 'sort' || type === 'type' ? 0 : '';
    }

    const fecha = typeof valor === 'string' ? valor : (valor instanceof Date ? valor.toISOString() : String(valor));

    if (type === 'sort' || type === 'type') {
        const t = Date.parse(fecha);
        return isNaN(t) ? 0 : t;
    }

    if (typeof moment === 'function') {
        const m = moment(fecha);
        if (m.isValid()) return m.format('DD/MM/YYYY HH:mm');
    }

    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Telefono: "",
    Direccion: "",
}

$(document).ready(() => {
    const init = async () => {
        // Obtener la fecha de 4 días atrás
        const fechaDesde = moment().add(-30, 'days').format('YYYY-MM-DD');
        document.getElementById("txtFechaDesde").value = fechaDesde; // Fecha 4 días atrás
        document.getElementById("txtFechaHasta").value = moment().format('YYYY-MM-DD');

        if (document.getElementById('clientesfiltro')) {
            await listaClientesFiltro();
        }
        await listaProveedoresFiltro(-1);

        initToggleFiltrosPersistente();
        configurarDataTable(null);
    };

    init().catch(err => {
        console.error('HistorialPrecios init:', err);
        errorModal?.('Error al cargar filtros del historial de precios.');
    });

    const selectsFiltro = '#Productosfiltro, #Proveedoresfiltro, #clientesfiltro';
    if ($(selectsFiltro).length) {
        $(selectsFiltro).select2({
            placeholder: 'Selecciona una opción',
            allowClear: false
        });
    }

    document.getElementById('btnAplicarFiltrosHist')?.addEventListener('click', (e) => {
        e.preventDefault();
        aplicarFiltros();
    });
    document.getElementById('btnLimpiarFiltrosHist')?.addEventListener('click', (e) => {
        e.preventDefault();
        limpiarFiltros();
    });

    $('#grd_Historial').on('click', '.hist-btn-revertir', async function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = Number(this.dataset.id);
        const tipo = this.dataset.tipo;
        if (id > 0 && tipo) await revertirPrecioHistorial(id, tipo);
    });
});

$('#clientesfiltro').on('change', async function () {
    const idCliente = parseInt(this.value, 10) || -1;
    await listaProveedoresFiltro(idCliente);
    $('#Productosfiltro').empty().append(new Option('-', -1));
});

$("#Proveedoresfiltro").on("change", async function () {
    const idProveedor = parseInt($(this).val(), 10) || -1;
    await listaProductosFiltro(idProveedor);
});


async function aplicarFiltros() {
    $('#labelIncrementoDecremento').text("");
    const idCliente = document.getElementById("clientesfiltro")?.value ?? -1;
    listaHistorial(
        document.getElementById("Productosfiltro").value,
        document.getElementById("Proveedoresfiltro").value,
        idCliente,
        document.getElementById("txtFechaDesde").value,
        document.getElementById("txtFechaHasta").value
    );
}

function limpiarFiltros() {
    const fechaDesde = moment().add(-30, 'days').format('YYYY-MM-DD');
    document.getElementById("txtFechaDesde").value = fechaDesde;
    document.getElementById("txtFechaHasta").value = moment().format('YYYY-MM-DD');
    $('#clientesfiltro').val(-1).trigger('change');
}


async function listaHistorial(idProducto, idProveedor, idCliente, fechaDesde, fechaHasta) {
    const url = `/HistorialPrecios/Lista?idProducto=${idProducto}&idProveedor=${idProveedor}&idCliente=${idCliente}&FechaDesde=${encodeURIComponent(fechaDesde)}&FechaHasta=${encodeURIComponent(fechaHasta)}`;


    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Error en la solicitud:', response.statusText);
            return;
        }

        const data = normalizarHistorialLista(await response.json());
        await configurarDataTable(data);
    } catch (error) {
        console.error('Error en la solicitud:', error);
    }
}


function renderCeldaPrecioConRevertir(data, type, row, meta, tipoRevertir, campoNuevo, campoAnterior) {
    if (type !== 'display') return data;

    const actual = Number(data) || 0;
    const prevRow = meta.row > 0 ? gridHistorial.row(meta.row - 1).data() : null;
    let arrow = '';
    let percentageChange = '';

    if (prevRow) {
        const prevValue = Number(histVal(prevRow, campoNuevo)) || 0;
        const diff = actual - prevValue;
        if (diff !== 0 && prevValue !== 0) {
            if (diff > 0) {
                const percentage = ((diff / prevValue) * 100).toFixed(2);
                arrow = '<i class="fa fa-arrow-up" style="color: green;"></i>';
                percentageChange = `<span style="color: green;"> (+${percentage} %)</span>`;
            } else {
                const percentage = ((Math.abs(diff) / prevValue) * 100).toFixed(2);
                arrow = '<i class="fa fa-arrow-down" style="color: red;"></i>';
                percentageChange = `<span style="color: red;"> (-${percentage} %)</span>`;
            }
        }
    }

    const anterior = Number(histVal(row, campoAnterior)) || 0;
    const puedeRevertir = anterior !== actual;
    const idHist = histVal(row, 'Id');
    const btn = puedeRevertir && idHist
        ? `<button type="button" class="hist-btn-revertir" data-id="${idHist}" data-tipo="${tipoRevertir}" title="Volver al ${tipoRevertir === 'costo' ? 'costo' : 'precio de venta'} anterior (${formatNumber(anterior)})"><i class="fa fa-undo"></i> Anterior</button>`
        : '';

    return `${formatNumber(data)} ${arrow} ${percentageChange}${btn}`;
}

async function configurarDataTable(data) {
    if (!gridHistorial) {
        $('#grd_Historial thead tr').clone(true).addClass('filters').appendTo('#grd_Historial thead');
        gridHistorial = $('#grd_Historial').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                { data: 'Producto', title: 'Producto' },
                { data: 'Fecha', title: 'Fecha' },
                {
                    data: 'PCostoNuevo',
                    title: 'Precio de Costo',
                    render: (data, type, row, meta) => renderCeldaPrecioConRevertir(data, type, row, meta, 'costo', 'PCostoNuevo', 'PCostoAnterior')
                },
                {
                    data: 'PVentaNuevo',
                    title: 'Precio de Venta',
                    render: (data, type, row, meta) => renderCeldaPrecioConRevertir(data, type, row, meta, 'venta', 'PVentaNuevo', 'PVentaAnterior')
                },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return `
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarHistorial(${row.Id})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
                </button>`;
                    },
                    orderable: true,
                    searchable: true,
                },
            ],
            dom: 'Bfrtip',
            buttons: SistemaExport.botonesDataTable({
                titulo: 'Historial de precios',
                archivo: 'historial-precios',
                columnas: (idx) => idx < 4
            }),
            order: [[1, 'desc']],
            columnDefs: [
                {
                    targets: 1,
                    render: function (data, type) {
                        return formatFechaHistorial(data, type);
                    }
                },
                {
                    targets: 2,
                    render: function (data, type) {
                        if (type === 'display') return formatNumber(data);
                        return data;
                    }
                },
                {
                    targets: 3,
                    render: function (data, type) {
                        if (type === 'display') return formatNumber(data);
                        return data;
                    }
                }
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {

                // Ahora que gridHistorial está inicializado, configuramos las opciones de columnas
                 

                var api = this.api();

                // Iterar sobre las columnas y aplicar la configuración de filtros
                columnConfig.forEach(async (config) => {
                    var cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        var select = $('<select id="filter' + config.index + '"><option value="">Seleccionar</option></select>')
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                var val = $(this).val();
                                var selectedText = $(this).find('option:selected').text(); // Obtener el texto del nombre visible
                                await api.column(config.index).search(val ? '^' + selectedText + '$' : '', true, false).draw(); // Buscar el texto del nombre
                            });

                        var data = await config.fetchDataFunc(); // Llamada a la función para obtener los datos
                        data.forEach(function (item) {
                            select.append('<option value="' + item.Id + '">' + item.Nombre + '</option>');
                        });

                    } else if (config.filterType === 'none') {
                        cell.empty();
                    } else if (config.filterType === 'text') {
                        var input = $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off('keyup change') // Desactivar manejadores anteriores
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                var regexr = '({search})';
                                var cursorPosition = this.selectionStart;
                                api.column(config.index)
                                    .search(this.value != '' ? regexr.replace('{search}', '(((' + this.value + ')))') : '', this.value != '', this.value == '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                });


                setTimeout(function () {
                    gridHistorial.columns.adjust();
                }, 10);

                actualizarKpis(data);

                $('.filters th').eq(4).html('');

                configurarOpcionesColumnas();

                // Agregar eventos al marcador
                $('body').on('mouseenter', '#grd_Historial .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });
                $('body').on('click', '#grd_Historial .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });
            },

            drawCallback: function () {
                calcularCambioPorcentual();
            },

        });


    } else {
        gridHistorial.clear().rows.add(data).order([1, 'desc']).draw();
        actualizarKpis(data);
    }
}

// Función para calcular el cambio porcentual entre el primer y el último registro
function calcularCambioPorcentual() {
    // Verificamos si hay datos en la tabla
    const data = gridHistorial.rows().data();
    if (data.length === 0) return;

    // Obtenemos el primer y último registro
    const firstRow = data[0];
    const lastRow = data[data.length - 1];

    // Obtenemos el nombre del producto y proveedor seleccionados
    const proveedor = $('#Proveedoresfiltro').find('option:selected').text();
    const producto = $('#Productosfiltro').find('option:selected').text();
    const cliente = $('#clientesfiltro').find('option:selected').text();
    const clienteTxt = cliente && cliente !== '-' ? ` del cliente <span style="color: yellow;">${cliente}</span>` : '';

    if (firstRow && lastRow) {
        const diffCosto = lastRow.PCostoNuevo - firstRow.PCostoNuevo;
        const diffVenta = lastRow.PVentaNuevo - firstRow.PVentaNuevo;

        const porcentajeCosto = ((diffCosto / firstRow.PCostoNuevo) * 100).toFixed(2);
        const porcentajeVenta = ((diffVenta / firstRow.PVentaNuevo) * 100).toFixed(2);

        // Determinar si es incremento o decremento
        let incrementoDecrementoCosto = '';
        let incrementoDecrementoVenta = '';
        let colorCosto = 'green';
        let colorVenta = 'green';

        if (diffCosto < 0) {
            incrementoDecrementoCosto = 'decremento';
            colorCosto = 'red';
        } else {
            incrementoDecrementoCosto = 'incremento';
        }

        if (diffVenta < 0) {
            incrementoDecrementoVenta = 'decremento';
            colorVenta = 'red';
        } else {
            incrementoDecrementoVenta = 'incremento';
        }

        const fechaDesde = document.getElementById("txtFechaDesde").value;
        const fechaHasta = document.getElementById("txtFechaHasta").value

        // Crear la frase con colores aplicados a las partes relevantes
        const labelText = `
            El producto <span style="color: yellow;">${producto}</span> del proveedor <span style="color: yellow;">${proveedor}</span>${clienteTxt} ha tenido un 
            <span style="color: ${colorCosto};">${incrementoDecrementoCosto}</span> 
            de <span style="color: ${colorCosto};">${porcentajeCosto}%</span> en el precio de costo y un 
            <span style="color: ${colorVenta};">${incrementoDecrementoVenta}</span> 
            de <span style="color: ${colorVenta};">${porcentajeVenta}%</span> en el precio de venta, 
            desde <span style="color: yellow;">${moment(fechaDesde, 'YYYY-MM-DD').format('DD/MM/YYYY')}</span> 
            hasta <span style="color: yellow;">${moment(fechaHasta, 'YYYY-MM-DD').format('DD/MM/YYYY')}</span>.
        `;

        // Actualizamos el label en la interfaz
        $('#labelIncrementoDecremento').html(labelText);
    }
}


function formatNumber(number) {
    return '$' + number.toLocaleString('es-AR');
}

function configurarOpcionesColumnas() {
    const grid = $('#grd_Historial').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Historial_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = col.title

            // Ahora agregamos el checkbox, asegurándonos de que se marque solo si 'isChecked' es 'true'
            container.append(`
                <li>
                    <label class="dropdown-item">
                        <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                        ${columnName}
                    </label>
                </li>
            `);
        }
    });

    // Asocia el evento para ocultar/mostrar columnas
    $('.toggle-column').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
    });
}

async function listaClientesFiltro() {
    const response = await fetch('/Clientes/Lista');
    if (!response.ok) return;

    const data = await response.json();
    const selectClientes = document.getElementById('clientesfiltro');
    if (!selectClientes) return;

    $('#clientesfiltro option').remove();
    selectClientes.appendChild(new Option('-', -1));

    for (let i = 0; i < data.length; i++) {
        selectClientes.appendChild(new Option(data[i].Nombre, data[i].Id));
    }
}

async function listaProveedoresFiltro(idCliente) {
    const id = parseInt(idCliente, 10);
    const url = id > 0 ? `/Proveedores/ListaPorCliente?IdCliente=${id}` : '/Proveedores/Lista';
    const response = await fetch(url);
    if (!response.ok) return;

    const data = await response.json();
    const selectProveedores = document.getElementById('Proveedoresfiltro');
    if (!selectProveedores) return;

    $('#Proveedoresfiltro option').remove();
    selectProveedores.appendChild(new Option('-', -1));

    for (let i = 0; i < data.length; i++) {
        selectProveedores.appendChild(new Option(data[i].Nombre, data[i].Id));
    }
}
async function listaProductosFiltro(idproveedor) {
    const url = `/Productos/ListaProductosProveedor?IdProveedor=${idproveedor}`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Productosfiltro option').remove();

    selectProductos = document.getElementById("Productosfiltro");

    option = document.createElement("option");
    option.value = -1;
    option.text = "-";
    selectProductos.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Descripcion;
        selectProductos.appendChild(option);

    }
}


async function revertirPrecioHistorial(id, tipo) {
    const etiqueta = tipo === 'costo' ? 'precio de costo' : 'precio de venta';
    const fila = gridHistorial?.rows().data().toArray().find(r => Number(histVal(r, 'Id')) === Number(id));
    if (!fila) {
        errorModal('No se encontró el registro del historial.');
        return;
    }

    const valorActual = tipo === 'costo' ? histVal(fila, 'PCostoNuevo') : histVal(fila, 'PVentaNuevo');
    const valorAnterior = tipo === 'costo' ? histVal(fila, 'PCostoAnterior') : histVal(fila, 'PVentaAnterior');

    const mensaje = `¿Restaurar el ${etiqueta} a ${formatNumber(valorAnterior)}? (valor actual en este registro: ${formatNumber(valorActual)})`;
    const confirmado = await confirmarModal(mensaje);
    if (!confirmado) return;

    try {
        const response = await fetch(`/HistorialPrecios/RevertirPrecio?id=${id}&tipo=${encodeURIComponent(tipo)}`, {
            method: 'POST'
        });

        if (!response.ok) {
            let msg = 'No se pudo revertir el precio.';
            try {
                const err = await response.json();
                if (err.mensaje) msg = err.mensaje;
            } catch { /* ignore */ }
            errorModal(msg);
            return;
        }

        exitoModal(`Se restauró el ${etiqueta} al valor anterior.`);
        await aplicarFiltros();
    } catch {
        errorModal('Error al revertir el precio.');
    }
}

async function eliminarHistorial(id) {
    let resultado = await confirmarModal("¿Desea eliminar el registro?");

    if (resultado) {
        try {
            const response = await fetch(`HistorialPrecios/Eliminar?id=${id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Producto.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                aplicarFiltros();
                exitoModal("Registro eliminado correctamente")
            }
        } catch (error) {
            errorModal("Ha ocurrido un error al eliminar el registro");
        }
    }
}

// -------- Persistencia de Filtros (mostrar/ocultar) --------
function initToggleFiltrosPersistente() {
    const btn = document.getElementById('btnToggleFiltros');
    const icon = document.getElementById('iconFiltros');
    const panel = document.getElementById('formFiltrosHistorial');
    const STORAGE_KEY = 'Historial_FiltrosVisibles';

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


function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    const el = document.getElementById('kpiCantRegistros');
    if (el) el.textContent = cant;
}