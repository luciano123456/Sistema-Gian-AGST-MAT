﻿let gridventas;

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
];


$(document).ready(() => {
    // Usando Moment.js para obtener la fecha actual
    const hoy = moment();

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
                { data: 'Fecha' },
                { data: 'FechaEntrega' },
                { data: 'Cliente' },
                { data: 'Proveedor' },
                { data: 'TotalCliente' },
                { data: 'RestanteCliente' },
                { data: 'TotalProveedor' },
                { data: 'RestanteProveedor' },
                { data: 'Estado' },
                { data: 'Observacion' },
                {
                    data: "Id",
                    render: function (data) {
                        return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarPedido(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                            "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarPedido(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i></button>";
                    },
                    orderable: true,
                    searchable: true,
                }
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Ventas',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte pedidos',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
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
                    "targets": [0, 1] // Índices de las columnas de fechas
                },
                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [4, 5,6,7] // Índices de las columnas de números
                },
                {
                    "targets": [8], // Índice de la columna 'Estado'
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

                var lastColIdx = api.columns().indexes().length - 1;
                $('.filters th').eq(lastColIdx).html(''); // Limpiar la última columna si es necesario

                setTimeout(function () {
                    gridventas.columns.adjust();
                }, 10);

                $('body').on('mouseenter', '#grd_ventas .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });




            },
        });
    } else {
        gridventas.clear().rows.add(data).draw();
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
    // Redirige a la vista 'PedidoNuevoModif' con el parámetro id
    window.location.href = '/Pedidos/NuevoModif/' + id;
}