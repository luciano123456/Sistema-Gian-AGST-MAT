let grdProveedores, grdClientes, grdChoferes, grdZonas, grdPagosaClientes, grdPagosaProveedores;

let editandopagoCliente = false;  // Indica si estamos en modo edición
let pagoClienteIdEdicion = null;  // Almacena el ID del pago que estamos editando
let precioSeleccionado; // Variable para guardar el precio seleccionado
const cantidadPagoClienteInput = document.getElementById('cantidadPagoCliente');
const cotizacionPagoClienteInput = document.getElementById('cotizacionPagoCliente');
const cantidadPagoProveedorInput = document.getElementById('cantidadPagoProveedor');
const cotizacionPagoProveedorInput = document.getElementById('cotizacionPagoProveedor');
const costoFleteInput = document.getElementById('costoFlete');


$(document).ready(async function () {
    const idPedido = 0; // Reemplaza con el id correspondiente
    const datosPedido = await ObtenerDatosPedido(idPedido);
    await cargarDataTableProductos(datosPedido.productos);
    await cargarDataTablePagoaProveedores(datosPedido.pagosaProveedores);
    await cargarDataTablePagoaClientes(datosPedido.pagosClientes);

    document.getElementById(`fechaPedido`).value = moment().format('YYYY-MM-DD');
    document.getElementById(`fechaEntrega`).value = moment().add(3, 'days').format('YYYY-MM-DD');
    document.getElementById(`costoFlete`).value = "$0.00";


    calcularTotalPago('Cliente');
    calcularTotalPago('Proveedor');
    calcularDatosPedido();

    const selectedValue = document.getElementById("estado").value;
    const selectElement = document.getElementById("estado");

    if (selectedValue === "Pendiente") {
        selectElement.style.setProperty('color', 'yellow', 'important');
    } else if (selectedValue === "Entregado") {
        selectElement.style.setProperty('color', 'white', 'important');
    }

});

async function abrirProveedor() {
    const proveedores = await obtenerProveedores();
    await cargarDataTableProveedores(proveedores);



    // Configura eventos de selección
    $('#tablaProveedores tbody').on('dblclick', 'tr', function () {
        var data = $('#tablaProveedores').DataTable().row(this).data();
        cargarDatosProveedor(data);
        $('#proveedorModal').modal('hide');
    });

    $('#btnSeleccionarProveedor').on('click', function () {
        var data = $('#tablaProveedores').DataTable().row('.selected').data();
        if (data) {
            cargarDatosProveedor(data);
            $('#proveedorModal').modal('hide');
        } else {
            errorModal('Seleccione un Proveedor');
        }
    });

    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada

    $('#tablaProveedores tbody').on('click', 'tr', function () {
        // Remover la clase de la fila anteriormente seleccionada
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('selected');
            $('td', filaSeleccionada).removeClass('selected');

        }

        // Obtener la fila actual
        filaSeleccionada = $(this);

        // Agregar la clase a la fila actual
        $(filaSeleccionada).addClass('selected');
        $('td', filaSeleccionada).addClass('selected');
    });

    // Abre el modal
    $('#proveedorModal').modal('show');

}

async function obtenerZonas() {
    const response = await fetch('/Zonas/Lista');
    const data = await response.json();
    return data;
}


async function obtenerChoferes() {
    const response = await fetch('/Choferes/Lista');
    const data = await response.json();
    return data;
}

async function obtenerClientes() {
    const response = await fetch('/Clientes/Lista');
    const data = await response.json();
    return data;
}
async function abrirCliente() {
    const clientes = await obtenerClientes();
    await cargarDataTableClientes(clientes);

    // Configura eventos de selección
    $('#tablaClientes tbody').on('dblclick', 'tr', function () {
        var data = $('#tablaClientes').DataTable().row(this).data();
        cargarDatosCliente(data);
        $('#clienteModal').modal('hide');
    });

    $('#btnSeleccionarCliente').on('click', function () {
        var data = $('#tablaClientes').DataTable().row('.selected').data();
        if (data) {
            cargarDatosCliente(data);
            $('#clienteModal').modal('hide');
        } else {
            errorModal('Seleccione un Cliente');
        }
    });

    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada

    $('#tablaClientes tbody').on('click', 'tr', function () {
        // Remover la clase de la fila anteriormente seleccionada
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('selected');
            $('td', filaSeleccionada).removeClass('selected');

        }

        // Obtener la fila actual
        filaSeleccionada = $(this);

        // Agregar la clase a la fila actual
        $(filaSeleccionada).addClass('selected');
        $('td', filaSeleccionada).addClass('selected');
    });

    // Abre el modal
    $('#clienteModal').modal('show');

}

async function abrirChofer() {
    const choferes = await obtenerChoferes();
    await cargarDataTableChoferes(choferes);

    // Configura eventos de selección
    $('#tablaChoferes tbody').on('dblclick', 'tr', function () {
        var data = $('#tablaChoferes').DataTable().row(this).data();
        cargarDatosChofer(data);
        $('#choferModal').modal('hide');
    });

    $('#btnSeleccionarChofer').on('click', function () {
        var data = $('#tablaChoferes').DataTable().row('.selected').data();
        if (data) {
            cargarDatosChofer(data);
            $('#choferModal').modal('hide');
        } else {
            errorModal('Seleccione un Chofer');
        }
    });

    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada

    $('#tablaChoferes tbody').on('click', 'tr', function () {
        // Remover la clase de la fila anteriormente seleccionada
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('selected');
            $('td', filaSeleccionada).removeClass('selected');

        }

        // Obtener la fila actual
        filaSeleccionada = $(this);

        // Agregar la clase a la fila actual
        $(filaSeleccionada).addClass('selected');
        $('td', filaSeleccionada).addClass('selected');
    });

    // Abre el modal
    $('#choferModal').modal('show');

}

async function abrirZona() {
    const zonas = await obtenerZonas();
    await cargarDataTableZonas(zonas);

    // Configura eventos de selección
    $('#tablaZonas tbody').on('dblclick', 'tr', function () {
        var data = $('#tablaZonas').DataTable().row(this).data();
        cargarDatosZona(data);
        $('#zonaModal').modal('hide');
    });

    $('#btnSeleccionarZona').on('click', function () {
        var data = $('#tablaZonas').DataTable().row('.selected').data();
        if (data) {
            cargarDatosZona(data);
            $('#zonaModal').modal('hide');
        } else {
            errorModal('Seleccione una Zona');
        }
    });

    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada

    $('#tablaZonas tbody').on('click', 'tr', function () {
        // Remover la clase de la fila anteriormente seleccionada
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('selected');
            $('td', filaSeleccionada).removeClass('selected');

        }

        // Obtener la fila actual
        filaSeleccionada = $(this);

        // Agregar la clase a la fila actual
        $(filaSeleccionada).addClass('selected');
        $('td', filaSeleccionada).addClass('selected');
    });

    // Abre el modal
    $('#zonaModal').modal('show');

}

async function obtenerProveedores() {
    const response = await fetch('/Proveedores/Lista');
    const data = await response.json();
    return data;
}
function cargarDatosProveedor(data) {
    $('#idProveedor').val(data.Id);
    $('#nombreProveedor').val(data.Nombre);
    $('#apodoProveedor').val(data.Apodo);
    $('#direccionProveedor').val(data.Ubicacion);
    $('#telefonoProveedor').val(data.Telefono);
}
function cargarDatosCliente(data) {
    $('#idCliente').val(data.Id);
    $('#nombreCliente').val(data.Nombre);
    $('#dniCliente').val(data.Dni);
    $('#direccionCliente').val(data.Direccion);
    $('#telefonoCliente').val(data.Telefono);
}

function cargarDatosChofer(data) {
    $('#idChofer').val(data.Id);
    $('#Chofer').val(data.Nombre);
}

function cargarDatosZona(data) {
    $('#idZona').val(data.Id);
    $('#Zona').val(data.Nombre);
    $('#costoFlete').val(formatNumber(data.Precio));
    calcularDatosPedido();
}


// Cuando una pestaña se activa, redibuja las tablas
$('a[data-bs-toggle="tab"]').on('shown.bs.tab', function () {
    if ($.fn.DataTable.isDataTable('#grd_Productos')) {
        $('#grd_Productos').DataTable().columns.adjust().draw();
    }
    if ($.fn.DataTable.isDataTable('#grd_pagosClientes')) {
        $('#grd_pagosClientes').DataTable().columns.adjust().draw();
    }
    if ($.fn.DataTable.isDataTable('#grd_pagosaProveedores')) {
        $('#grd_pagosaProveedores').DataTable().columns.adjust().draw();
    }


    // Agregar aquí más tablas si es necesario
});
async function ObtenerDatosPedido(id) {
    const url = `/Pedidos/ObtenerDatosPedido/${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}
async function cargarDataTableProductos(data) {
    grdProductos = $('#grd_Productos').DataTable({
        data: data,
        language: {
            sLengthMenu: "Mostrar _MENU_ registros",
            url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
        },
        scrollX: true,
        autoWidth: false,
        columns: [
            { data: 'Nombre', width: "15%" },
            { data: 'PrecioCosto', width: "15%", visible: false },
            { data: 'PrecioVenta', width: "15%" },
            { data: 'Cantidad', width: "15%" },
            { data: 'Total', width: "15%" },
            {
                data: "Id",
                render: function (data, type, row) {
                    return `
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='abrirModalProducto(true, "${data}")' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                </button>
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarProducto(${data})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
                </button>`;
                },
                orderable: true,
                searchable: true,
            }
        ],
        orderCellsTop: true,
        fixedHeader: true,

        initComplete: async function () {
            setTimeout(function () {
                grdProductos.columns.adjust();
            }, 1000);
        }
    });


}

async function cargarDataTableZonas(data) {

    if (grdZonas) {
        $('#tablaZonas').DataTable().columns.adjust().draw();
        grdZonas.destroy();
        grdZonas = null; // Opcional: Limpiar la variable

    }

    grdZonas = $('#tablaZonas').DataTable({
        data: data,
        language: {
            sLengthMenu: "Mostrar _MENU_ registros",
            url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
        },
        scrollX: true,
        autoWidth: false,
        columns: [
            { data: 'Id', width: "20%", visible: false },
            { data: 'Nombre', width: "40%" },
            { data: 'Precio', width: "20%" },

        ],
        orderCellsTop: true,
        fixedHeader: true,

        "columnDefs": [
            {
                "render": function (data, type, row) {
                    return formatNumber(data); // Formatear número en la columna
                },
                "targets": [2] // Columna Precio
            }
        ],

        initComplete: async function () {
            setTimeout(function () {
                $('#tablaZonas').DataTable().columns.adjust().draw();
            }, 200);
        }
    });

}

async function cargarDataTableChoferes(data) {

    if (grdChoferes) {
        $('#tablaChoferes').DataTable().columns.adjust().draw();
        grdChoferes.destroy();
        grdChoferes = null; // Opcional: Limpiar la variable

    }

    grdChoferes = $('#tablaChoferes').DataTable({
        data: data,
        language: {
            sLengthMenu: "Mostrar _MENU_ registros",
            url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
        },
        scrollX: true,
        autoWidth: false,
        columns: [
            { data: 'Id', width: "20%", visible: false },
            { data: 'Nombre', width: "20%" },
            { data: 'Direccion', width: "20%" },
            { data: 'Telefono', width: "20%" },

        ],
        orderCellsTop: true,
        fixedHeader: true,

        initComplete: async function () {
            setTimeout(function () {
                $('#tablaChoferes').DataTable().columns.adjust().draw();
            }, 200);
        }
    });

}
async function cargarDataTableClientes(data) {

    if (grdClientes) {
        $('#tablaClientes').DataTable().columns.adjust().draw();
        grdClientes.destroy();
        grdClientes = null; // Opcional: Limpiar la variable

    }

    grdClientes = $('#tablaClientes').DataTable({
        data: data,
        language: {
            sLengthMenu: "Mostrar _MENU_ registros",
            url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
        },
        scrollX: true,
        autoWidth: false,
        columns: [
            { data: 'Id', width: "20%", visible: false },
            { data: 'Nombre', width: "20%" },
            { data: 'Dni', width: "20%" },
            { data: 'Direccion', width: "20%" },
            { data: 'Telefono', width: "20%" },

        ],
        orderCellsTop: true,
        fixedHeader: true,

        initComplete: async function () {
            setTimeout(function () {
                $('#tablaClientes').DataTable().columns.adjust().draw();
            }, 200);
        }
    });

}
async function cargarDataTableProveedores(data) {


    if (grdProveedores) {
        $('#tablaProveedores').DataTable().columns.adjust().draw();
        grdProveedores.destroy();
        grdProveedores = null; // Opcional: Limpiar la variable

    }

    grdProveedores = $('#tablaProveedores').DataTable({
        data: data,
        language: {
            sLengthMenu: "Mostrar _MENU_ registros",
            url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
        },
        scrollX: true,
        autoWidth: false,
        columns: [
            { data: 'Id', width: "20%", visible: false },
            { data: 'Nombre', width: "20%" },
            { data: 'Apodo', width: "20%" },
            { data: 'Ubicacion', width: "20%" },
            { data: 'Telefono', width: "20%" },

        ],
        orderCellsTop: true,
        fixedHeader: true,

        initComplete: async function () {
            setTimeout(function () {
                $('#tablaProveedores').DataTable().columns.adjust().draw();
            }, 200);
        }
    });

}

async function anadirProducto() {
    let idCliente = parseInt($("#idCliente").val());
    let idProveedor = parseInt($("#idProveedor").val());
    const modal = $('#productosModal');

    // Validación de cliente y proveedor
    if (isNaN(idCliente) || idCliente === "") {
        advertenciaModal("¡Antes debes elegir un cliente!");
        return false;
    }
    if (isNaN(idProveedor) || idProveedor === "") {
        advertenciaModal("¡Antes debes elegir un proveedor!");
        return false;
    }

    // Obtener los productos con los últimos precios
    const productosResponse = await ObtenerUltimosPrecios(idCliente, idProveedor);
    const productos = productosResponse ? productosResponse.valor : [];

    if (Array.isArray(productos) && productos.length > 0) {
        const productoSelect = $("#productoSelect");
        const precioSelect = $("#precioSelect");
        const precioInput = $("#precioInput");
        const cantidadInput = $("#cantidadInput");

        productoSelect.empty();
        precioSelect.empty();

        // Obtener los productos que ya están en la tabla (evitar duplicados)
        const productosEnTabla = [];
        grdProductos.rows().every(function () {
            const data = this.data();
            productosEnTabla.push(Number(data.Id));
        });

        // Llenar el select de productos, deshabilitar los ya agregados
        productos.forEach(producto => {
            const option = $(`<option value="${producto.IdProducto}">${producto.Nombre}</option>`);

            // Deshabilitar si el producto ya está en la tabla
            if (productosEnTabla.includes(producto.IdProducto)) {
                option.prop('disabled', true); // Deshabilitar la opción si ya está en la tabla
            }

            productoSelect.append(option);
        });

        // Comprobar si todos los productos ya están en la tabla
        const todosYaAgregados = productos.every(producto => productosEnTabla.includes(producto.IdProducto));

        if (todosYaAgregados) {
            advertenciaModal("¡Ya has agregado todos los productos del sistema!");
            return false; // No continuar con la adición si todos ya están añadidos
        }

        // Evento para actualizar precios cuando se selecciona un producto
        productoSelect.on("change", async function () {
            const selectedProductId = parseInt(this.value);
            const selectedProduct = productos.find(p => p.IdProducto === selectedProductId);

            precioSelect.empty();
            if (selectedProduct && Array.isArray(selectedProduct.Precios) && selectedProduct.Precios.length > 0) {
                selectedProduct.Precios.forEach(precio => {
                    precioSelect.append(
                        `<option value="${precio.Result.PrecioVenta},${precio.Result.PrecioCosto}">
                    ${formatoMoneda.format(precio.Result.PrecioVenta)}
                </option>`
                    );
                });

                // Establecer el precio inicial en el input
                const precioVenta = selectedProduct.Precios[0].Result.PrecioVenta;
                const precioCosto = selectedProduct.Precios[0].Result.PrecioCosto;
                const diferencia = precioVenta - precioCosto;

                precioInput.val(formatoMoneda.format(precioVenta));

                // Calcular el total
                await calcularTotal();

            } else {
                precioInput.val("");
            }
        });

        // Evento para actualizar el input de precio cuando se cambia el precio en el select
        precioSelect.on("change", async function () {
            const selectedValue = this.value; // Obtener el valor del option seleccionado
            const [precioVenta, precioCosto] = selectedValue.split(",").map(Number); // Dividir PrecioVenta y PrecioCosto
            const diferencia = precioVenta - precioCosto;

            console.log("Precio Venta:", precioVenta);
            console.log("Precio Costo:", precioCosto);
            console.log("Diferencia:", diferencia);

            precioInput.val(formatoMoneda.format(precioVenta));

            // Calcular el total
            await calcularTotal();

        });


        // Disparar el evento 'change' para cargar el precio del primer producto
        productoSelect.trigger("change");
        cantidadInput.val("1");
        $("#productoSelect").prop("disabled", false);

        modal.attr('data-editing', 'false');
        modal.removeAttr('data-id');
        $('#btnGuardarProducto').text('Añadir Producto');

        await calcularTotal();

        $('#productosModal').modal('show');
    } else {
        console.error("No se pudieron obtener los productos o la lista está vacía.");
    }
}




async function ObtenerUltimosPrecios(idCliente, idProveedor) {
    const url = `/Pedidos/ListaUltimosPrecios?idCliente=${idCliente}&idProveedor=${idProveedor}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.statusText}`);
        }
        const dataJson = await response.json();
        return dataJson; // Asegúrate de que aquí se devuelve el objeto completo
    } catch (error) {
        console.error('Error:', error);
        return null; // Asegúrate de manejar el caso de error en el frontend
    }
}
async function ObtenerUltimosPreciosProducto(idCliente, idProveedor, idProducto) {
    const url = `/Pedidos/ListaUltimosPreciosProducto?idCliente=${idCliente}&idProveedor=${idProveedor}&idProducto=${idProducto}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.statusText}`);
        }
        const dataJson = await response.json();
        return dataJson; // Asegúrate de que aquí se devuelve el objeto completo
    } catch (error) {
        console.error('Error:', error);
        return null; // Asegúrate de manejar el caso de error en el frontend
    }
}
function actualizarPrecioSeleccionado(selectElement, idProducto) {
    const precio = selectElement.value; // Obtener el precio seleccionado
    precioSeleccionado = { idProducto, precio }; // Guardar la selección
}
function seleccionarProducto(idProducto) {
    // Lógica para seleccionar el producto
    console.log(`Producto seleccionado: ${idProducto}, Precio: ${precioSeleccionado.precio}`);
}

async function guardarProducto() {
    const precioSelect = document.getElementById('precioSelect');
    const productoSelect = document.getElementById('productoSelect');
    const precioManual = convertirMonedaAFloat(document.getElementById('precioInput').value);
    const totalInput = convertirMonedaAFloat(document.getElementById('totalInput').value);
    const cantidadInput = parseInt(document.getElementById('cantidadInput').value) || 1; // Obtener cantidad, por defecto 1 si no es válida
    const productoId = productoSelect.value;
    const productoNombre = productoSelect.options[productoSelect.selectedIndex]?.text || '';
    const primerOptionValue = precioSelect.options[0].value;
    let [precioVenta, precioCosto] = primerOptionValue.split(",").map(Number);

    let i = 0;

    Array.from(precioSelect.options).forEach(option => {

        const value = option.value; // Obtener el valor del atributo value

        // Si necesitas trabajar con precios separados por coma
        const [precioVentaSelect, precioCostoSelect] = value.split(',').map(Number); // Separar precios y convertir a números

        if (precioVentaSelect == parseFloat(precioManual)) {
            precioVenta = precioVentaSelect;
            precioCosto = precioCostoSelect;
        }

        i++;
    });

    const modal = $('#productosModal');
    const isEditing = modal.attr('data-editing') === 'true';
    const editId = modal.attr('data-id');

    // Verificar si el producto ya existe en la tabla
    let productoExistente = false;

    if (isEditing) {
        // Si estamos editando, solo actualizamos la fila correspondiente
        grdProductos.rows().every(function () {
            const data = this.data();
            if (data.Id == editId) {
                data.Nombre = productoNombre;
                data.PrecioVenta = formatoMoneda.format(precioManual); // Guardar PrecioVenta
                data.PrecioCosto = formatoMoneda.format(precioCosto); // Guardar PrecioCosto
                data.Cantidad = cantidadInput; // Usar la cantidad del input
                data.Total = formatoMoneda.format(totalInput); // Recalcular el total con formato de moneda
                this.data(data).draw();
            }
        });
    } else {
        // Buscar si el producto ya existe en la tabla
        grdProductos.rows().every(function () {
            const data = this.data();
            if (data.Id == productoId) {
                // Producto existe, sumamos las cantidades y recalculamos el total
                data.Cantidad += cantidadInput; // Sumar la cantidad proporcionada
                data.Total = formatoMoneda.format(precioManual * data.Cantidad); // Recalcular el total con formato de moneda
                this.data(data).draw();
                productoExistente = true;
            }
        });

        if (!productoExistente) {
            // Si no existe, agregar un nuevo producto
            grdProductos.row.add({
                Id: productoId,
                Nombre: productoNombre,
                PrecioVenta: formatoMoneda.format(precioManual), // Agregar PrecioVenta
                PrecioCosto: formatoMoneda.format(precioCosto), // Agregar PrecioCosto
                Cantidad: cantidadInput, // Usar la cantidad proporcionada
                Total: formatoMoneda.format(totalInput) // Recalcular el total con formato de moneda
            }).draw();
        }
    }

    // Limpiar y cerrar el modal
    modal.modal('hide');

    await calcularDatosPedido();
}

async function calcularDatosPedido() {
    let pedidoVenta = 0, pedidoCosto = 0, pagosaproveedores = 0, pagosclientes = 0, restantecliente = 0, restanteproveedor = 0, pedidoVentaFinal = 0;
    const inputRestanteProveedor = document.getElementById("restanteProveedor");
    const inputRestanteCliente = document.getElementById("restanteCliente");
    const costoFlete = document.getElementById("costoFlete");

    grdProductos.rows().every(function () {
        const producto = this.data();
        pedidoVenta += parseFloat(convertirMonedaAFloat(producto.PrecioVenta));
        pedidoCosto += parseFloat(convertirMonedaAFloat(producto.PrecioCosto));
    });

    grdPagosaProveedores.rows().every(function () {
        const pago = this.data();
        pagosaproveedores += parseFloat(convertirMonedaAFloat(pago.TotalArs));
    });

    grdPagosaClientes.rows().every(function () {
        const pago = this.data();
        pagosclientes += parseFloat(convertirMonedaAFloat(pago.TotalArs));
    });

    restanteproveedor = pedidoCosto - pagosaproveedores;
    pedidoVentaFinal = pedidoVenta + parseFloat(convertirMonedaAFloat(costoFlete.value));
    restantecliente = pedidoVentaFinal - pagosclientes

    //document.getElementById("total").value = formatoMoneda.format(pedidoVenta);
    document.getElementById("totalPagoProveedor").value = formatoMoneda.format(pedidoCosto);
    document.getElementById("totalPagadoaProveedor").value = formatoMoneda.format(pagosaproveedores);
    document.getElementById("totalPagoCliente").value = formatoMoneda.format(pedidoVentaFinal);
    document.getElementById("totalPagadoCliente").value = formatoMoneda.format(pagosclientes);


    inputRestanteProveedor.value = formatoMoneda.format(restanteproveedor);

    // Cambiar el color según el valor de restanteproveedor
    if (restanteproveedor < 0) {
        inputRestanteProveedor.style.setProperty("color", "red", "important"); // Aplicar color rojo con !important
    } else {
        inputRestanteProveedor.style.setProperty("color", "white", "important"); // Aplicar color blanco con !important
    }

    inputRestanteCliente.value = formatoMoneda.format(restantecliente);

    // Cambiar el color según el valor de restanteproveedor
    if (restantecliente < 0) {
        inputRestanteCliente.style.setProperty("color", "red", "important"); // Aplicar color rojo con !important
    } else {
        inputRestanteCliente.style.setProperty("color", "white", "important"); // Aplicar color blanco con !important
    }

}


function eliminarProducto(id) {
    grdProductos.rows().every(function (rowIdx, tableLoop, rowLoop) {
        const data = this.data();
        if (data.Id == id) {
            grdProductos.row(rowIdx).remove().draw();
        }
    });

    calcularDatosPedido();
}
function editarProducto(id) {
    // Buscar el producto en el DataTable por su ID
    let productoData = null;
    grdProductos.rows().every(function () {
        const data = this.data();
        if (data.Id == id) {
            productoData = data;
        }
    });

    if (productoData) {
        // Cargar los datos del producto en el modal
        document.getElementById('productoSelect').value = productoData.Id;
        document.getElementById('precioInput').value = productoData.Precio;

        // Configurar el modal para edición
        $('#productosModal').data('edit-id', id);
        $('#productosModal').modal('show');
    }
}
function actualizarCantidad(rowIndex) {
    const rowData = grdProductos.row(rowIndex).data();
    const cantidad = parseInt($(`.cantidad:eq(${rowIndex})`).val());
    rowData.Cantidad = cantidad;
    rowData.Total = rowData.Precio * cantidad;
    grdProductos.row(rowIndex).data(rowData).draw();
}
async function abrirModalProducto(isEdit = false, productoId = null) {
    // Resetear campos del modal
    const productoSelect = document.getElementById('productoSelect');
    const precioSelect = document.getElementById('precioSelect');  // El select donde se cargarán los precios
    const precioInput = document.getElementById('precioInput');  // El select donde se cargarán los precios
    const cantidadInput = document.getElementById('cantidadInput');

    let i = 0, optionSeleccionado = 0;

    productoSelect.value = '';
    precioSelect.innerHTML = '';  // Limpiar precios anteriores
    cantidadInput.value = '';
    precioInput.value = '';

    // Configurar modal para añadir o editar
    const modal = $('#productosModal');

    if (isEdit && productoId) {
        // Cargar datos del producto en el modal si estamos editando
        const productoData = grdProductos.row(function (idx, data) {
            return data.Id == productoId;
        }).data();

        if (productoData) {
            // Obtener los productos con los últimos precios
            const idCliente = parseInt($("#idCliente").val());  // Asegúrate de que este valor esté disponible
            const idProveedor = parseInt($("#idProveedor").val());  // Lo mismo para el proveedor

            // Llamada a la función para obtener los precios del producto
            const productosResponse = await ObtenerUltimosPreciosProducto(idCliente, idProveedor, productoId);


            // Verifica la estructura de productosResponse y valor
            console.log("Respuesta de productos:", productosResponse);

            // Comprueba que 'valor' exista y contenga al menos un producto
            if (productosResponse && productosResponse.valor && productosResponse.valor.length > 0) {
                const producto = productosResponse.valor[0];  // Tomamos el primer producto (el actual)
                console.log("Producto actual:", producto);  // Verifica qué contiene 'producto'

                // Si 'producto' tiene la estructura correcta, puedes continuar
                if (producto && producto.Precios) {
                    // Procesa los precios
                    const precioSelect = $('#precioSelect');
                    producto.Precios.forEach(precio => {
                        const option = $(`<option value="${precio.PrecioVenta},${precio.PrecioCosto}">
                                        ${formatoMoneda.format(precio.PrecioVenta)}
                                        </option>`);

                        precioSelect.append(option);

                        if (parseFloat(convertirMonedaAFloat(productoData.PrecioVenta)) == parseFloat(precio.PrecioVenta)) {
                            optionSeleccionado = i;
                        }

                        i++;
                    });




                }
            } else {
                console.log("No se encontraron productos en la respuesta o la propiedad 'valor' está vacía.");
            }



            // Cargar datos del producto en el producto select
            productoSelect.value = productoId;
            cantidadInput.value = productoData.Cantidad;
            precioInput.value = productoData.PrecioVenta;

            // Deshabilitar el select si estamos editando el producto
            productoSelect.disabled = true;

            precioSelect.options[optionSeleccionado].selected = true;

            // Calcular el total
            await calcularTotal();
        }

        modal.attr('data-editing', 'true');
        modal.attr('data-id', productoId);
        $('#btnGuardarProducto').text('Editar Producto');
    } else {
        modal.attr('data-editing', 'false');
        modal.removeAttr('data-id');
        $('#btnGuardarProducto').text('Añadir Producto');
    }

    // Mostrar el modal
    modal.modal('show');
}
async function calcularTotal() {
    const precioRaw = document.getElementById('precioInput').value;
    const cantidad = parseFloat(document.getElementById('cantidadInput').value) || 0;

    // Extraer solo el número del campo precio
    const precio = formatoNumero(precioRaw);

    const total = precio * cantidad;

    // Mostrar el total formateado en el campo
    document.getElementById('totalInput').value = formatoMoneda.format(total);
}

document.getElementById('precioInput').addEventListener('input', function () {
    calcularTotal();
});

document.getElementById('cantidadInput').addEventListener('input', function () {
    calcularTotal();
});

document.getElementById('precioInput').addEventListener('blur', function () {


    // Formatear el número al finalizar la edición
    this.value = formatMoneda(convertirMonedaAFloat(this.value));

    // Recalcular el total cada vez que cambia el precio
    calcularTotal();
});


// PAGOS DE CLIENTES Y PROVEEDORES
async function cargarDataTablePagoaProveedores(data) {
    if (!grdPagosaProveedores) {
        $('#grd_pagosaProveedores thead tr').clone(true).addClass('filters').appendTo('#grd_Proveedores thead');

        grdPagosaProveedores = $('#grd_pagosaProveedores').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar _MENU_ registros",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: true,
            autoWidth: false,
            columns: [
                { data: 'Fecha', width: "15%" },

                { data: 'Moneda', width: "15%" },
                { data: 'Cotizacion', width: "15%" },
                { data: 'Total', width: "15%" },
                { data: 'TotalArs', width: "15%" },
                { data: 'Observacion', width: "15%" },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarPago(\"Proveedor\", \"" + row.Id + "\")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                            "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarPago(\"Proveedor\", \"" + row.Id + "\")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i></button>";
                    },
                    orderable: true,
                    searchable: true,
                }
            ],
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                setTimeout(function () {
                    grdPagosaProveedores.columns.adjust();
                }, 1000);
            }


        });
    } else {
        grdPagosaProveedores.clear().rows.add(data).draw();
    }

}
async function cargarDataTablePagoaClientes(data) {
    grdPagosaClientes = $('#grd_pagosClientes').DataTable({
        data: data,
        language: {
            sLengthMenu: "Mostrar _MENU_ registros",
            url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
        },
        scrollX: true,
        autoWidth: false,
        columns: [
            { data: 'Fecha', width: "15%" },
            { data: 'IdMoneda', width: "15%", visible: false },
            { data: 'Moneda', width: "15%" },
            { data: 'Cotizacion', width: "15%" },
            { data: 'Total', width: "15%" },
            { data: 'TotalArs', width: "15%" },
            { data: 'Observacion', width: "15%" },
            {
                data: 'Id',
                render: function (data, type, row) {
                    return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarPago(\"Cliente\", \"" + row.Id + "\")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                        "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarPago(\"Cliente\", \"" + row.Id + "\")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i></button>";
                },
                orderable: false,
                searchable: false,
                width: "10%"
            }
        ],
        orderCellsTop: true,
        fixedHeader: true
    });
}
function editarPago(tipo, id) {
    // Buscar el pago por su ID

    let grid = null;

    if (tipo == 'Cliente') {
        grid = $('#grd_pagosClientes').DataTable();
    } else if (tipo == 'Proveedor') {
        grid = $('#grd_pagosaProveedores').DataTable();
    }

    const row = grid.rows().data().toArray().find(row => row.Id === id);


    if (row) {
        // Cargar los datos en el modal
        document.getElementById(`fechapago${tipo}`).value = moment(row.Fecha, 'DD/MM/YYYY').format('YYYY-MM-DD');
        document.getElementById(`MonedasPago${tipo}`).value = row.IdMoneda;
        document.getElementById(`cotizacionPago${tipo}`).value = formatoMoneda.format(formatoNumero(row.Cotizacion));
        document.getElementById(`cantidadPago${tipo}`).value = parseFloat(convertirMonedaAFloat(row.Total));
        document.getElementById(`observacionPago${tipo}`).value = row.Observacion;

        calcularTotalCotizacionPago(tipo);
        const cotizacionInput = document.getElementById(`cotizacionPago${tipo}`);
        const monedasSelect = document.getElementById(`MonedasPago${tipo}`);


        const selectedOption = monedasSelect.options[monedasSelect.selectedIndex];
        if (selectedOption.text.toUpperCase() === "ARS") {
            cotizacionInput.disabled = true;
        } else {
            cotizacionInput.disabled = false;
        }

        $(`#pagos${tipo}Modal`).attr('data-editing', 'true');
        $(`#pagos${tipo}Modal`).attr('data-id', id);


        // Mostrar el modal para edición
        $(`#pagos${tipo}Modal`).modal('show');
        $(`#btnGuardarPago${tipo}`).text('Editar Pago');

    }
}
function eliminarPago(tipo, id) {
    // Eliminar el pago con el ID correspondiente

    let grid = null;

    if (tipo == 'Cliente') {
        grid = $('#grd_pagosClientes').DataTable();
    } else if (tipo == 'Proveedor') {
        grid = $('#grd_pagosaProveedores').DataTable();
    }

    grid.rows().data().toArray().forEach(function (row, index) {
        if (row.Id === id) {
            grid.row(index).remove().draw();
        }

        calcularTotalPago(tipo);
    });

    calcularDatosPedido();
}
function guardarPago(tipo) {
    const modal = $(`#pagos${tipo}Modal`);
    const monedaSelect = document.getElementById(`MonedasPago${tipo}`);
    const cotizacion = formatoNumero(document.getElementById(`cotizacionPago${tipo}`).value);
    const cantidadInput = parseFloat(document.getElementById(`cantidadPago${tipo}`).value) || 1; // Obtener cantidad, por defecto 1 si no es válida
    const total = parseFloat(document.getElementById(`totalARSPago${tipo}`).value) || 1; // Obtener cantidad, por defecto 1 si no es válida
    const observacion = document.getElementById(`observacionPago${tipo}`).value; // Obtener cantidad, por defecto 1 si no es válida
    const fechapago = document.getElementById(`fechapago${tipo}`).value; // Obtener cantidad, por defecto 1 si no es válida
    const pagoId = `pago_${Date.now()}`; // Identificador basado en el timestamp
    const isEditing = modal.attr('data-editing') === 'true';
    const editId = modal.attr('data-id');

    let grid = null;

    if (tipo == 'Cliente') {
        grid = $('#grd_pagosClientes').DataTable();
    } else if (tipo == 'Proveedor') {
        grid = $('#grd_pagosaProveedores').DataTable();
    }

    if (isEditing) {
        grid.rows().every(function () {
            const data = this.data();
            if (data.Id == editId) {
                data.Fecha = moment(fechapago, 'YYYY-MM-DD').format('DD/MM/YYYY'),
                    data.IdMoneda = monedaSelect.value,
                    data.Moneda = monedaSelect.options[monedaSelect.selectedIndex]?.text || '',
                    data.Cotizacion = formatoMoneda.format(cotizacion),
                    data.Total = formatoMoneda.format(cantidadInput), // Usar la cantidad proporcionada
                    data.TotalArs = formatoMoneda.format(cotizacion * cantidadInput), // Recalcular el total con formato de moneda
                    data.Observacion = observacion
                this.data(data).draw();
            }
        });
    } else {
        // Si no existe, agregar un nuevo producto
        grid.row.add({
            Id: pagoId, // Identificador único
            Fecha: moment(fechapago, 'YYYY-MM-DD').format('DD/MM/YYYY'),
            IdMoneda: monedaSelect.value,
            Moneda: monedaSelect.options[monedaSelect.selectedIndex]?.text || '',
            Cotizacion: formatoMoneda.format(cotizacion),
            Total: formatoMoneda.format(cantidadInput), // Usar la cantidad proporcionada
            TotalArs: formatoMoneda.format(cotizacion * cantidadInput), // Recalcular el total con formato de moneda
            Observacion: observacion
        }).draw();
    }

    calcularTotalPago(tipo);
    calcularDatosPedido();
    // Limpiar y cerrar el modal
    modal.modal('hide');
}

async function calcularTotalPago(tipo) {
    // Obtener referencia al DataTable correspondiente
    let grid = null;

    if (tipo == 'Cliente') {
        grid = $('#grd_pagosClientes').DataTable();
    } else if (tipo == 'Proveedor') {
        grid = $('#grd_pagosaProveedores').DataTable();
    }

    // Calcular la suma total de la columna TotalArs
    let totalSum = 0;
    grid.rows().every(function () {
        const data = this.data();
        // Parsear el valor de TotalArs eliminando cualquier formato de moneda
        totalSum += formatoNumero(data.TotalArs);
    });

    // Asignar el total calculado al input correspondiente
    document.getElementById(`totalPago${tipo}`).value = formatoMoneda.format(totalSum.toFixed(2)); // Ajustar a formato moneda
}
async function anadirPago(tipo) {
    let idCliente = parseInt($(`#id${tipo}`).val());
    let idProveedor = parseInt($(`#idProveedor`).val());
    const modal = $(`#pagos${tipo}Modal`);

    // Mostrar el modal
    modal.modal('show');
    modal.attr('data-editing', 'false');
    modal.removeAttr('data-id');
    $(`#btnGuardarPago${tipo}`).text('Añadir Pago');
    // Rellenar el select de monedas
    const monedas = await ObtenerMonedas();
    if (monedas) {
        const monedasSelect = document.getElementById(`MonedasPago${tipo}`);
        const cotizacionInput = document.getElementById(`cotizacionPago${tipo}`);
        const cantidadInput = document.getElementById(`cantidadPago${tipo}`);
        const observaciones = document.getElementById(`observacionPago${tipo}`);

        document.getElementById(`fechapago${tipo}`).value = moment().format('YYYY-MM-DD');

        monedasSelect.innerHTML = ''; // Limpiar opciones existentes
        observaciones.value = "";

        monedas.forEach(moneda => {
            const option = document.createElement('option');
            option.value = moneda.Id; // Asume que cada moneda tiene un ID
            option.textContent = moneda.Nombre; // Asume que cada moneda tiene un nombre
            option.dataset.cotizacion = formatoMoneda.format(moneda.Cotizacion); // Guarda la cotización en un atributo personalizado
            monedasSelect.appendChild(option);
        });

        // Seleccionar el primero por defecto
        if (monedas.length > 0) {
            monedasSelect.selectedIndex = 0; // Selecciona la primera opción
            cotizacionInput.value = formatoMoneda.format(monedas[0].Cotizacion); // Pone la cotización de la primera moneda
            cotizacionInput.disabled = true; //La primer moneda es ARS, por ende, la cotizacion siempre es la misma, deshabilitamos cotizacion
            cantidadInput.value = 1;
            calcularTotalCotizacionPago(tipo);
        }

        // Evento para cambiar la cotización según la moneda seleccionada
        monedasSelect.addEventListener('change', function () {
            const selectedOption = monedasSelect.options[monedasSelect.selectedIndex];
            cotizacionInput.value = selectedOption.dataset.cotizacion; // Actualiza el valor del input con la cotización seleccionada

            if (selectedOption.text.toUpperCase() === "ARS") {
                cotizacionInput.disabled = true;
            } else {
                cotizacionInput.disabled = false;
            }

            calcularTotalCotizacionPago(tipo);


        });



    } else {
        console.warn('No se pudieron cargar las monedas.');
    }
}
async function calcularTotalCotizacionPago(tipo) {
    const totalPago = document.getElementById(`totalARSPago${tipo}`);
    const cotizacionPago = document.getElementById(`cotizacionPago${tipo}`).value;
    const cantidad = parseFloat(document.getElementById(`cantidadPago${tipo}`).value) || 0;
    const total = formatoNumero(cotizacionPago) * cantidad;
    totalPago.value = formatoMoneda.format(total);
}

cantidadPagoClienteInput.addEventListener('input', function () {
    calcularTotalCotizacionPago('Cliente');
});

cotizacionPagoCliente.addEventListener('input', function () {
    calcularTotalCotizacionPago('Cliente');
});

cotizacionPagoClienteInput.addEventListener('blur', function () {
    const rawValue = this.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsedValue = parseFloat(rawValue) || 0;

    // Formatear el número al finalizar la edición
    this.value = formatNumber(parsedValue);

    // Recalcular el total cada vez que cambia el precio
    calcularTotalCotizacionPago('Cliente');
});

cantidadPagoProveedorInput.addEventListener('input', function () {
    calcularTotalCotizacionPago('Proveedor');
});

cotizacionPagoProveedor.addEventListener('input', function () {
    calcularTotalCotizacionPago('Proveedor');
});

cotizacionPagoProveedorInput.addEventListener('blur', function () {
    const rawValue = this.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsedValue = parseFloat(rawValue) || 0;

    // Formatear el número al finalizar la edición
    this.value = formatNumber(parsedValue);

    // Recalcular el total cada vez que cambia el precio
    calcularTotalCotizacionPago('Proveedor');
});


costoFleteInput.addEventListener('blur', function () {
    const rawValue = this.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsedValue = parseFloat(rawValue) || 0;

    // Formatear el número al finalizar la edición
    this.value = formatNumber(parsedValue);
    calcularDatosPedido();
});

async function ObtenerMonedas() {
    const url = `/Monedas/Lista`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.statusText}`);
        }
        const dataJson = await response.json();
        return dataJson; // Devuelve la lista de monedas
    } catch (error) {
        console.error('Error:', error);
        return null; // Maneja el caso de error
    }
}

document.getElementById("estado").addEventListener("change", function () {
    const selectedValue = this.value;
    const selectElement = this;

    // Cambiar el color de la opción seleccionada
    if (selectedValue === "Pendiente") {
        selectElement.style.setProperty('color', 'yellow', 'important');  // Cambia a amarillo si es "Pendiente"
    } else if (selectedValue === "Entregado") {
        selectElement.style.setProperty('color', 'green', 'important');  // Cambia a blanco si es "Entregado"
    }
});


function guardarCambios() {
    const idPedido = $("#Id").val();

    // Función reutilizable para recolectar los pagos
    function obtenerPagos(grd) {
        let pagos = [];
        grd.rows().every(function () {
            const pago = this.data();
            const pagoJson = {
                "Id": 0,
                "Fecha": moment(pago.Fecha, 'YYYY-MM-DD').format('YYYY-MM-DD'),
                "IdMoneda": parseInt(pago.IdMoneda),
                "Cotizacion": parseFloat(convertirMonedaAFloat(pago.Cotizacion)),
                "Total": parseFloat(convertirMonedaAFloat(pago.Total)),
                "TotalArs": parseFloat(convertirMonedaAFloat(pago.TotalArs)),
                "Observacion": pago.Observacion // Ajusta si es necesario
            };
            pagos.push(pagoJson);
        });
        return pagos;
    }

    function obtenerProductos(grd) {
        let productos = [];
        grd.rows().every(function () {
            const producto = this.data();
            const productoJson = {
                "Id": 0,
                "IdProducto": parseInt(producto.Id),
                "Nombre": producto.Nombre,
                "Precio": parseFloat(convertirMonedaAFloat(producto.PrecioVenta)),
                "Cantidad": parseInt(producto.Cantidad),
                
            };
            productos.push(productoJson);
        });
        return productos;
    }

    // Obtener los pagos de clientes y proveedores usando la función reutilizable
    const pagosClientes = obtenerPagos(grdPagosaClientes);
    const pagosaProveedores = obtenerPagos(grdPagosaProveedores);
    const productos = obtenerProductos(grdProductos);

    // Construcción del objeto para el modelo
    const nuevoModelo = {
        "Id": idPedido !== "" ? idPedido : 0,
        "Fecha": moment($("#fechaPedido").val(), 'YYYY-MM-DD').format('YYYY-MM-DD'),
        "IdCliente": parseInt($("#idCliente").val()),
        "FechaEntrega": moment($("#fechaEntrega").val(), 'YYYY-MM-DD').format('YYYY-MM-DD'),
        "NroRemito": $("#nroRemito").val(),
        "CostoFlete": parseFloat(convertirMonedaAFloat($("#costoFlete").val())),
        "IdProveedor": parseInt($("#idProveedor").val()),
        "IdZona": parseInt($("#idZona").val()),
        "IdChofer": parseInt($("#idChofer").val()),
        "TotalCliente": parseFloat(convertirMonedaAFloat($("#totalPagoCliente").val())),
        "RestanteCliente": parseFloat(convertirMonedaAFloat($("#restanteCliente").val())),
        "TotalProveedor": parseFloat(convertirMonedaAFloat($("#totalPagoProveedor").val())),
        "RestanteProveedor": parseFloat(convertirMonedaAFloat($("#restanteProveedor").val())),
        "Estado": $("#estado").val(),
        "Observacion": $("#observacion").val(),
        "PagosPedidosClientes": pagosClientes,
        "PagosPedidosProveedores": pagosaProveedores,
        "PedidosProductos": productos
    };

    // Definir la URL y el método para el envío
    const url = idPedido === "" ? "Insertar" : "Actualizar";
    const method = idPedido === "" ? "POST" : "PUT";

    console.log(JSON.stringify(nuevoModelo))

    // Enviar los datos al servidor
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(nuevoModelo)
    })
        .then(response => {
           
            if (!response.ok) throw new Error(response.statusText);
            return response.json();
        })
        .then(dataJson => {
            console.log("Respuesta del servidor:", dataJson);
            const mensaje = idPedido === "" ? "Pedido registrado correctamente" : "Pedido modificado correctamente";
            exitoModal(mensaje);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}