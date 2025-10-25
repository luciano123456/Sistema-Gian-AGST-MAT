let gridpedidos;
let ultimoPedidoActualizadoId = null;


const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' }, // Columna con un filtro de selección (de provincias)
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'text' },
    { index: 9, filterType: 'text' },
    { index: 10, filterType: 'text' },
    { index: 11, filterType: 'text' },
    { index: 12, filterType: 'text' },
];


let audioNotificacion = null;


var userSession = JSON.parse(localStorage.getItem('userSession'));

$(document).ready(() => {
    // Usando Moment.js para obtener la fecha actual
    const hoy = moment();

    inicializarSonidoNotificacion();

    document.addEventListener("touchstart", desbloquearAudio, { once: true });
    document.addEventListener("click", desbloquearAudio, { once: true });


    initToggleFiltrosPersistentePedidos();


    localStorage.removeItem('EditandoPedidoDesdeVenta'); //POR SI LAS DUDAS

    // Obtener la fecha de 4 días atrás
    const fechaDesde = moment().add(-4, 'days').format('YYYY-MM-DD');

    // Establecer las fechas en los campos correspondientes
    document.getElementById("txtFechaDesde").value = fechaDesde; // Fecha 4 días atrás
    document.getElementById("txtFechaHasta").value = moment().format('YYYY-MM-DD');
    listaClientesFiltro();
    listaProveedoresFiltro();

    listapedidos(document.getElementById("txtFechaDesde").value, document.getElementById("txtFechaHasta").value, -1, -1)

    $("#clientesfiltro, #Proveedoresfiltro").select2({
        placeholder: "Selecciona una opción",
        allowClear: false
    });



})

async function aplicarFiltros() {
    let paginaActual = gridpedidos != null ? gridpedidos.page() : 0;
    await listapedidos(document.getElementById("txtFechaDesde").value, document.getElementById("txtFechaHasta").value, document.getElementById("Proveedoresfiltro").value, document.getElementById("clientesfiltro").value);
    if (paginaActual > 0) gridpedidos.page(paginaActual).draw('page');
}


async function listapedidos(fechaDesde, fechaHasta, idProveedor, idCliente) {

  

    // Construir la URL con los parámetros como query string
    const url = `/Pedidos/Lista?FechaDesde=${encodeURIComponent(fechaDesde)}&FechaHasta=${encodeURIComponent(fechaHasta)}&IdProveedor=${idProveedor}&IdCliente=${idCliente}`;

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

        const data = await response.json();
        await configurarDataTable(data);
    } catch (error) {
        console.error('Error en la solicitud:', error);
    }
}



async function listaProvinciasFilter() {
    const url = `/pedidos/ListaProvincias`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(provincia => ({
        Id: provincia.Id,
        Nombre: provincia.Nombre
    }));

}


async function eliminarPedido(id) {
    let resultado = window.confirm("¿Desea eliminar el Pedido?");

    if (resultado) {
        try {
            const response = await fetch("/Pedidos/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el pedido.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                aplicarFiltros();
                exitoModal("Pedido eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {

    if (!gridpedidos) {
        $('#grd_pedidos thead tr').clone(true).addClass('filters').appendTo('#grd_pedidos thead');
        gridpedidos = $('#grd_pedidos').DataTable({
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
                    width: "1%", // Ancho fijo para la columna
                    render: function (data) {
                        return `
                            <div class="acciones-menu" data-id="${data}">
                                <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                                    <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                                </button>
                                <div class="acciones-dropdown" style="display: none;">
                                    <button class='btn btn-sm btneditar' type='button' onclick='editarPedido(${data})' title='Editar'>
                                        <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                                    </button>
                                    <button class='btn btn-sm btneliminar' type='button' onclick='eliminarPedido(${data})' title='Eliminar'>
                                        <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                                    </button>
                                </div>
                            </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Fecha' },
                { data: 'FechaEntrega' },
                { data: 'Cliente' },
                { data: 'Proveedor' },
                { data: 'TotalCliente' },
                { data: 'RestanteCliente' },
                { data: 'TotalProveedor' },
                { data: 'RestanteProveedor' },
                { data: 'TotalGanancia' },
                {
                    data: 'PorcGanancia',
                    render: function (data) {
                        if (data !== null && !isNaN(data)) {
                            return `${data}%`; // Añadir el símbolo de porcentaje al final
                        }
                        return 0; // Retornar el valor original si no es válido
                    }
                },
                { data: 'Estado' },
                { data: 'Observacion' },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Pedidos',
                    title: '',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const columnasPermitidas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                            return columnasPermitidas.includes(idx) && $(node).is(':visible');
                        }
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte pedidos',
                    title: '',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const columnasPermitidas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                            return columnasPermitidas.includes(idx) && $(node).is(':visible');
                        }
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const columnasPermitidas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                            return columnasPermitidas.includes(idx) && $(node).is(':visible');
                        }
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

            "columnDefs": [
                {
                    "render": function (data, type, row) {
                        if (data) {
                            const date = new Date(data); // Convierte la cadena en un objeto Date
                            return date.toLocaleDateString('es-ES'); // Formato: 'DD/MM/YYYY'
                        }
                    },
                    "targets": [1, 2] // Índices de las columnas de fechas
                },
                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [5, 6, 7, 8, 9] // Índices de las columnas de números
                },
                {
                    "targets": [11], // Índice de la columna 'Estado'
                    "createdCell": function (cell, cellData, rowData, rowIndex, colIndex) {
                        if (cellData === "Pendiente") {
                            $(cell).css('color', 'yellow');
                        }
                    }
                }
            ],

            initComplete: async function () {
                var api = this.api();

                actualizarSumaDeudas(gridpedidos);

                // Iterar sobre las columnas y aplicar la configuración de filtros
                columnConfig.forEach(async (config) => {
                    var cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'text') {
                        var input = $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off('keyup change')
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

                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                

                configurarOpcionesColumnas();

                // Condicional para ocultar columnas si ModoVendedor == 1
                if (userSession.ModoVendedor == 1) {
                    gridpedidos.column(9).visible(false); // Ocultar la columna PorcGanancia
                    gridpedidos.column(10).visible(false); // Ocultar la columna TotalGanancia
                }


                
                setTimeout(function () {
                    gridpedidos.columns.adjust();
                }, 10);

                // Cambiar el cursor a 'pointer' cuando pase sobre cualquier fila o columna
                $('#grd_pedidos tbody').on('mouseenter', 'tr', function () {
                    $(this).css('cursor', 'pointer');
                });

                // Doble clic para ejecutar la función editarPedido(id)
                $('#grd_pedidos tbody').on('dblclick', 'tr', function () {
                    var id = gridpedidos.row(this).data().Id; // Obtener el ID de la fila seleccionada
                    editarPedido(id); // Llamar a la función de editar
                });

                let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
                $('#grd_pedidos tbody').on('click', 'tr', function () {
                    // Remover la clase de la fila anteriormente seleccionada
                    if (filaSeleccionada) {
                        $(filaSeleccionada).removeClass('seleccionada');
                        $('td', filaSeleccionada).removeClass('seleccionada');

                    }

                    // Obtener la fila actual
                    filaSeleccionada = $(this);

                    // Agregar la clase a la fila actual
                    $(filaSeleccionada).addClass('seleccionada');
                    $('td', filaSeleccionada).addClass('seleccionada');

                });
            },
        });
    } else {
        gridpedidos.clear().rows.add(data).draw();
        actualizarSumaDeudas(gridpedidos);
    }
}


async function nuevoPedido() {
    window.location.href = "/Pedidos/NuevoModif";
}

async function listaProveedoresFiltro() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Proveedoresfiltro option').remove();

    selectProveedores = document.getElementById("Proveedoresfiltro");

    option = document.createElement("option");
    option.value = -1;
    option.text = "-";
    selectProveedores.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProveedores.appendChild(option);

    }
}

async function listaClientesFiltro() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#clientesfiltro option').remove();

    selectClientes = document.getElementById("clientesfiltro");

    option = document.createElement("option");
    option.value = -1;
    option.text = "-";
    selectClientes.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectClientes.appendChild(option);

    }
}

function editarPedido(id) {
    // Redirige a la vista 'PedidoNuevoModif' con el parámetro id
    window.location.href = '/Pedidos/NuevoModif/' + id;
}

function configurarOpcionesColumnas() {
    const grid = $('#grd_pedidos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Pedidos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id" && (userSession.ModoVendedor == 1 && col.data != "PorcGanancia" && col.data != "TotalGanancia" || userSession.ModoVendedor == 0)) { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = col.data;

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




$(document).on('click', function (e) {
    // Verificar si el clic está fuera de cualquier dropdown
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
});

function actualizarSumaDeudas(table) {
    let totalCliente = 0;
    let totalProveedor = 0;

    table.rows({ search: 'applied' }).every(function () {
        const data = this.data();

        // Usar índices: columna 5 (Restante Cliente), columna 6 (Restante Proveedor)
        const deudaCliente = parseFloat((data.RestanteCliente || "0").toString().replace(/[\$.]/g, '').replace(',', '.')) || 0;
        const deudaProveedor = parseFloat((data.RestanteProveedor || "0").toString().replace(/[\$.]/g, '').replace(',', '.')) || 0;

        totalCliente += deudaCliente;
        totalProveedor += deudaProveedor;
    });

    document.getElementById('sumaCliente').innerText = totalCliente.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    document.getElementById('sumaProveedor').innerText = totalProveedor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}



const connection = new signalR.HubConnectionBuilder()
    .withUrl("/notificacionesHub")
    .build();

connection.on("PedidoActualizado", function (data) {
    const userSession = JSON.parse(localStorage.getItem('userSession'));

    if (data.idUsuario !== userSession.Id) {
        reproducirSonidoNotificacion();

        const tipo = data.tipo?.toLowerCase();
        const paginaActual = gridpedidos.page();

        // Guardar celda en edición
        let idEditando = null;
        let colEditando = null;

        if (isEditing) {
            const cell = gridpedidos.cell('td:has(input), td:has(select)');
            const rowData = gridpedidos.row(cell.index().row).data();
            idEditando = rowData?.Id;
            colEditando = cell.index().column;

            isEditing = false;
            gridpedidos.cell(cell.index()).data(cell.data()).draw();
        }

        if (typeof aplicarFiltros === "function") {
            aplicarFiltros().then(() => {
                setTimeout(() => {
                    gridpedidos.page(paginaActual).draw('page');

                    if (idEditando !== null && colEditando !== null) {
                        const rowIndex = gridpedidos.rows().indexes().toArray().find(i => gridpedidos.row(i).data().Id === idEditando);

                        if (rowIndex !== undefined) {
                            const cellNode = gridpedidos.cell(rowIndex, colEditando).node();
                            $(cellNode).trigger('dblclick');
                        }
                    }

                    if (typeof marcarFilaCambio === "function") {
                        const tipoAnimacion = tipo === "creado" ? "nueva" : "actualizada";
                        marcarFilaCambio(gridpedidos, data.idPedido, tipoAnimacion);
                    }
                }, 300);
            });
        }

        // Notificación
        let mensaje = `#${data.idPedido} ${data.tipo} por ${data.usuario}.`;
        const opciones = {
            timeOut: 5000,
            positionClass: "toast-bottom-right",
            progressBar: true,
            toastClass: "toastr ancho-personalizado"
        };

        if (tipo === "eliminado") {
            toastr.error(mensaje, "Pedidos", opciones);
        } else if (tipo === "actualizado") {
            toastr.warning(mensaje, "Pedidos", opciones);
        } else {
            toastr.success(mensaje, "Pedidos", opciones);
        }
    }
});


connection.start()
    .then(() => console.log("✅ SignalR conectado"))
    .catch(err => console.error(err.toString()));


function marcarFilaCambio(idPedido) {
 
    gridpedidos.rows({ page: 'current' }).every(function () {
        const data = this.data();
        if (data && data.Id === idPedido) {
            const rowNode = this.node();

            $(rowNode).addClass('zoom-green-highlight');

            setTimeout(() => {
                $(rowNode).removeClass('zoom-green-highlight');
            }, 3000);
        }
    });
}


function initToggleFiltrosPersistentePedidos() {
    const btn = document.getElementById('btnToggleFiltros');
    const icon = document.getElementById('iconFiltros');
    // Prioriza el nuevo form; si no existe, usa el legacy #Filtros
    const panel = document.getElementById('formFiltrosPedidos') || document.getElementById('Filtros');
    const STORAGE_KEY = 'Pedidos_FiltrosVisibles';

    if (!btn || !icon || !panel) return;

    // Evita múltiples binds si re-llaman init
    if (btn.dataset.boundToggle === 'true') return;

    const saved = localStorage.getItem(STORAGE_KEY);
    const visible = (saved === null) ? true : (saved === 'true');

    panel.classList.toggle('d-none', !visible);
    icon.classList.toggle('fa-arrow-down', !visible);
    icon.classList.toggle('fa-arrow-up', visible);
    btn.setAttribute('aria-expanded', String(visible));

    btn.addEventListener('click', () => {
        const hide = panel.classList.toggle('d-none');
        const nowVisible = !hide;

        icon.classList.toggle('fa-arrow-down', hide);
        icon.classList.toggle('fa-arrow-up', nowVisible);
        btn.setAttribute('aria-expanded', String(nowVisible));

        localStorage.setItem(STORAGE_KEY, String(nowVisible));
    });

    btn.dataset.boundToggle = 'true';
}

function limpiarFiltrosPedidos () {
    // Obtener la fecha de 4 días atrás
    const fechaDesde = moment().add(-4, 'days').format('YYYY-MM-DD');

    // Establecer las fechas en los campos correspondientes
    document.getElementById("txtFechaDesde").value = fechaDesde; // Fecha 4 días atrás

    document.getElementById("txtFechaHasta").value = moment().format('YYYY-MM-DD');
    // Selects (con soporte Select2 si está aplicado)
    const selects = ['Proveedoresfiltro', 'clientesfiltro', 'Productosfiltro'];
    selects.forEach(id => {
        const $el = $('#' + id);
        if (!$el.length) return;

        // Preferí -1 si existe esa opción; si no, dejá vacío
        const hasMinusOne = $el.find('option[value="-1"]').length > 0;
        const resetVal = hasMinusOne ? '-1' : '';

        if ($el.data('select2')) {
            $el.val(resetVal).trigger('change.select2');
        } else {
            $el.val(resetVal).trigger('change');
        }
    });

    // Si tenés otros inputs de texto en la barra de filtros, limpiarlos aquí
    // $('#OtroInput').val('');

    // Volver a cargar con filtros limpios
    if (typeof aplicarFiltros === 'function') {
        aplicarFiltros();
    }
}