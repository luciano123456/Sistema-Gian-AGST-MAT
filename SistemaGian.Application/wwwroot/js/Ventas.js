let gridventas;

const columnConfig = [
    { index: 0, filterType: 'text' },
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

var userSession = JSON.parse(localStorage.getItem('userSession'));


$(document).ready(() => {
    // Usando Moment.js para obtener la fecha actual
    const hoy = moment();

    // Obtener la fecha de 4 días atrás
    const fechaDesde = moment().add(-15, 'days').format('YYYY-MM-DD');

    inicializarSonidoNotificacion();

    document.addEventListener("touchstart", desbloquearAudio, { once: true });
    document.addEventListener("click", desbloquearAudio, { once: true });


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
    let paginaActual = gridventas != null ? gridventas.page() : 0;
    await listapedidos(document.getElementById("txtFechaDesde").value, document.getElementById("txtFechaHasta").value, document.getElementById("Proveedoresfiltro").value, document.getElementById("clientesfiltro").value);
    if (paginaActual > 0) gridventas.page(paginaActual).draw('page');
}


async function listapedidos(fechaDesde, fechaHasta, idProveedor, idCliente) {
    // Construir la URL con los parámetros como query string
    const url = `/Pedidos/ListaEntregados?FechaDesde=${encodeURIComponent(fechaDesde)}&FechaHasta=${encodeURIComponent(fechaHasta)}&IdProveedor=${idProveedor}&IdCliente=${idCliente}`;

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

async function eliminarPedido(id) {
    let resultado = window.confirm("¿Desea eliminar el Pedido?");

    if (resultado) {
        try {
            const response = await fetch("Pedidos/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el pedido.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                aplicarFiltros();
                exitoModal("Venta eliminada correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridventas) {
        $('#grd_ventas thead tr').clone(true).addClass('filters').appendTo('#grd_ventas thead');
        gridventas = $('#grd_ventas').DataTable({
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
                        // Formatear fecha desde el formato ISO
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
                    "targets": [5, 6,7,8,9] // Índices de las columnas de números
                },
                {
                    "targets": [11], // Índice de la columna 'Estado'
                    "createdCell": function (cell, cellData, rowData, rowIndex, colIndex) {
                        // Si el estado es "Entregado", pintar de verde
                        if (cellData === "Entregado") {
                            $(cell).css('color', 'green'); // Cambiar el fondo a verde y el texto a blanco
                        }
                    }
                }
            ],


            initComplete: async function () {
                var api = this.api();

                actualizarSumaDeudas(gridventas);

                // Iterar sobre las columnas y aplicar la configuración de filtros
                columnConfig.forEach(async (config) => {
                    var cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'text') {
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

                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario


                configurarOpcionesColumnas();

                // Condicional para ocultar columnas si ModoVendedor == 1
                if (userSession.ModoVendedor == 1) {
                    gridventas.column(1).visible(false); // Ocultar la columna PorcGanancia
                    gridventas.column(4).visible(false); // Ocultar la columna PorcGanancia
                    gridventas.column(7).visible(false); // Ocultar la columna PorcGanancia
                    gridventas.column(8).visible(false); // Ocultar la columna PorcGanancia
                    gridventas.column(9).visible(false); // Ocultar la columna PorcGanancia
                    gridventas.column(10).visible(false); // Ocultar la columna TotalGanancia
                }

                setTimeout(function () {
                    gridventas.columns.adjust();
                }, 10);

                // Cambiar el cursor a 'pointer' cuando pase sobre cualquier fila o columna
                $('#grd_ventas tbody').on('mouseenter', 'tr', function () {
                    $(this).css('cursor', 'pointer');
                });

                // Doble clic para ejecutar la función editarPedido(id)
                $('#grd_ventas tbody').on('dblclick', 'tr', function () {
                    var id = gridventas.row(this).data().Id; // Obtener el ID de la fila seleccionada
                    editarPedido(id); // Llamar a la función de editar
                });

             
                let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
                $('#grd_ventas tbody').on('click', 'tr', function () {
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
        gridventas.clear().rows.add(data).draw();
        actualizarSumaDeudas(gridventas);
    }
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
    localStorage.setItem('EditandoPedidoDesdeVenta', true);
    window.location.href = '/Pedidos/NuevoModif/' + id;
}

function configurarOpcionesColumnas() {
    const grid = $('#grd_ventas').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Ventas_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id" && (userSession.ModoVendedor == 1 && col.data != "PorcGanancia" && col.data != "TotalGanancia" && col.data != "TotalProveedor" && col.data != "RestanteProveedor" && col.data != "Fecha" && col.data != "Proveedor"  || userSession.ModoVendedor == 0)) { // Solo agregar columnas que no sean "Id"
        // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
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
    if (!$(e.target).closest('.acciones-menu, #navbarDropdown, .dropdown-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
});


const connection = new signalR.HubConnectionBuilder()
    .withUrl("/notificacionesHub")
    .build();

connection.on("PedidoActualizado", function (data) {
    if (data.idUsuario !== userSession.Id) {

        reproducirSonidoNotificacion();

        if (typeof aplicarFiltros === "function") {
            aplicarFiltros().then(() => {
                setTimeout(() => {
                    marcarFilaCambio(gridventas, data.idPedido, tipo);
                }, 500);
            });
        }

        // Mostrar notificación según tipo
        const tipo = data.tipo?.toLowerCase();

        let mensaje = `Venta #${data.idPedido} ${data.tipo} por ${data.usuario}.`;
        let opciones = {
            timeOut: 5000,
            positionClass: "toast-bottom-right",
            progressBar: true,
            toastClass: "toastr ancho-personalizado"
        };

        if (tipo === "eliminado") {
            toastr.error(mensaje, "Ventas", opciones);
        } else if (tipo === "actualizado") {
            toastr.warning(mensaje, "Ventas", opciones);
        } else {
            toastr.success(mensaje, "Ventas", opciones);
        }
    }
});



connection.start()
    .then(() => console.log("✅ SignalR conectado"))
    .catch(err => console.error(err.toString()));

