let gridpedidos;

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


$(document).ready(() => {
    // Usando Moment.js para obtener la fecha actual
    const hoy = moment();

    localStorage.removeItem('EditandoPedidoDesdeVenta'); //POR SI LAS DUDAS

    // Obtener la fecha de 4 días atrás
    const fechaDesde = moment().add(-4, 'days').format('YYYY-MM-DD');

    // Establecer las fechas en los campos correspondientes
    document.getElementById("txtFechaDesde").value = fechaDesde; // Fecha 4 días atrás
    document.getElementById("txtFechaHasta").value = moment().format('YYYY-MM-DD');
    listaClientesFiltro();
    listaProveedoresFiltro();

    listapedidos(document.getElementById("txtFechaDesde").value, document.getElementById("txtFechaHasta").value, -1, -1)

})

async function aplicarFiltros() {
    listapedidos(document.getElementById("txtFechaDesde").value, document.getElementById("txtFechaHasta").value, document.getElementById("Proveedoresfiltro").value, document.getElementById("clientesfiltro").value);
}


async function listapedidos(fechaDesde, fechaHasta, idProveedor, idCliente) {
    // Construir la URL con los parámetros como query string
    const url = `/HistorialPrecios/Lista?IdProveedor=${idProveedor}&FechaDesde=${encodeURIComponent(fechaDesde)}&FechaHasta=${encodeURIComponent(fechaHasta)}`;


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
            const response = await fetch("Pedidos/Eliminar?id=" + id, {
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
                        columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte pedidos',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
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
                    "targets": [5, 6, 7, 8, 9] // Índices de las columnas de números
                },
                {
                    "targets": [11], // Índice de la columna 'Estado'
                    "createdCell": function (cell, cellData, rowData, rowIndex, colIndex) {
                        // Si el estado es "Entregado", pintar de verde
                        if (cellData === "Pendiente") {
                            $(cell).css('color', 'yellow'); // Cambiar el fondo a verde y el texto a blanco
                        }
                    }
                }
            ],


            initComplete: async function () {
                var api = this.api();

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

                setTimeout(function () {
                    gridpedidos.columns.adjust();
                }, 10);

                $('body').on('mouseenter', '#grd_pedidos .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });




            },
        });
    } else {
        gridpedidos.clear().rows.add(data).draw();
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
    const container = $('.dropdown-menu'); // El contenedor del dropdown, cambia a .dropdown-menu

    const storageKey = `Pedidos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
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