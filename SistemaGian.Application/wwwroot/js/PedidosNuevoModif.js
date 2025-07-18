let grdProveedores, grdClientes, grdChoferes, grdZonas, grdPagosaClientes, grdPagosaProveedores, grdProductos;
let saldoClienteFavor = 0;
let saldoClienteFavorInicial = 0;

let cantidadAcopioDisponible = 0;

let saldoUsadoInicial = 0;

let editandopagoCliente = false;  // Indica si estamos en modo edición
let pagoClienteIdEdicion = null;  // Almacena el ID del pago que estamos editando
let precioSeleccionado; // Variable para guardar el precio seleccionado
const cantidadPagoClienteInput = document.getElementById('cantidadPagoCliente');
const cotizacionPagoClienteInput = document.getElementById('cotizacionPagoCliente');
const cantidadPagoProveedorInput = document.getElementById('cantidadPagoProveedor');
const cotizacionPagoProveedorInput = document.getElementById('cotizacionPagoProveedor');
const costoFleteInput = document.getElementById('costoFlete');
const checkSaldoFavor = document.getElementById('usarSaldoFavor');
var userSession = JSON.parse(localStorage.getItem('userSession'));


let idPedido = document.getElementById('IdPedido').value;
let productos = [];

$(document).ready(async function () {
    listaClientes();
    listaProveedores();
    listaChoferes ();

    inicializarSonidoNotificacion();

    document.addEventListener("touchstart", desbloquearAudio, { once: true });
    document.addEventListener("click", desbloquearAudio, { once: true });

    function desbloquearAudio() {
        if (audioContext && audioContext.state === "suspended") {
            audioContext.resume().then(() => {
                console.log("🔊 AudioContext reanudado");
            });
        }
    }

    if (pedidoData && pedidoData.Id > 0) {
        await cargarDatosPedido()

        idPedido = pedidoData.Id;
    } else {

        const proximoNro = await obtenerProximoNroRemito();

        // Asignarlo al input
        document.getElementById("nroRemito").value = proximoNro.valor + 1;

        idPedido = 0; // Reemplaza con el id correspondiente

        await cargarDataTableProductos(null);
        await cargarDataTablePagoaProveedores(null);
        await cargarDataTablePagoaClientes(null);

        

        document.getElementById(`fechaPedido`).value = moment().format('YYYY-MM-DD');
        document.getElementById(`fechaEntrega`).value = moment().add(3, 'days').format('YYYY-MM-DD');

        calcularTotalPago('Cliente');
        calcularTotalPago('Proveedor');
        calcularDatosPedido();

        const selectedValue = document.getElementById("estado").value;
        const selectElement = document.getElementById("estado");

        if (selectedValue === "Pendiente") {
            selectElement.style.setProperty('color', 'red', 'important');
        } else if (selectedValue === "Entregado") {
            selectElement.style.setProperty('color', 'green', 'important');
        }

    }

    

    if (userSession.ModoVendedor == 1) {
        $(".ocultarmodoVendedor").hide();
    }



    $("#Clientes, #Proveedores, #Zonas, #Choferes").select2({
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });


    $("#productoSelect").select2({
        dropdownParent: $("#productosModal"),
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });

});


async function listaProveedores() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Proveedores option').remove();

    selectProveedores = document.getElementById("Proveedores");

    option = document.createElement("option");
    option.value = -1;
    option.text = "Seleccionar";
    option.disabled = true;
    selectProveedores.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProveedores.appendChild(option);

    }


    selectProveedores.selectedIndex = -1;
}


async function listaChoferes() {
    const url = `/Choferes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Choferes option').remove();

    select = document.getElementById("Choferes");

    option = document.createElement("option");
    option.value = -1;
    option.text = "Seleccionar";
    option.disabled = true;
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }


    select.selectedIndex = -1;

}

async function listaZonas() {
    let idCliente = parseInt($("#idCliente").val());
    const url = `/Zonas/Lista?idCliente=${idCliente}`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Zonas option').remove();

    select = document.getElementById("Zonas");

    option = document.createElement("option");
    option.value = -1;
    option.text = "Seleccionar";
    option.disabled = true;
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }


    select.selectedIndex = -1;
}

async function listaClientes() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Clientes option').remove();

    selectClientes = document.getElementById("Clientes");

    option = document.createElement("option");
    option.value = -1;
    option.text = "Seleccionar";
    option.disabled = true;
    selectClientes.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectClientes.appendChild(option);

    }


    selectClientes.selectedIndex = -1;
}


async function cargarDatosPedido() {
    if (pedidoData && pedidoData.Id > 0) {
       
        const datosPedido = await ObtenerDatosPedido(pedidoData.Id);
        await cargarDataTableProductos(datosPedido.productos);
        await cargarDataTablePagoaProveedores(datosPedido.pagosaProveedores);
        await cargarDataTablePagoaClientes(datosPedido.pagosClientes);
        await insertarDatosPedido(datosPedido.pedido);

    }
}

async function insertarDatosPedido(datosPedido) {

    document.getElementById("divDatosPedido").removeAttribute("hidden");
    document.getElementById("IdPedido").value = datosPedido.Id;

    document.getElementById("titulopedido").innerText = "Editar Pedido";

    //Cargamos Datos del Cliente
    document.getElementById("idCliente").value = datosPedido.IdCliente;
   
    document.getElementById("Clientes").value = datosPedido.IdCliente;
    document.getElementById("direccionCliente").value = datosPedido.DireccionCliente;
    document.getElementById("telefonoCliente").value = datosPedido.TelefonoCliente;
    document.getElementById("dniCliente").value = datosPedido.DniCliente;

    await listaZonas(); //CARGAMOS LAS ZONAS ACA YA QUE DESPUES DE CARGAR EL CLIENTE, AHI CARGAMOS LAS ZONAS

    //Cargamos Datos del Proveedor
    document.getElementById("idProveedor").value = datosPedido.IdProveedor;
    //document.getElementById("nombreProveedor").value = datosPedido.Proveedor;
    document.getElementById("Proveedores").value = datosPedido.IdProveedor;
    document.getElementById("apodoProveedor").value = datosPedido.ApodoProveedor;
    document.getElementById("telefonoProveedor").value = datosPedido.TelefonoProveedor;
    document.getElementById("direccionProveedor").value = datosPedido.DireccionProveedor;


    document.getElementById("fechaPedido").value = moment(datosPedido.Fecha, 'YYYY-MM-DD').format('YYYY-MM-DD');
    document.getElementById("fechaEntrega").value = moment(datosPedido.FechaEntrega, 'YYYY-MM-DD').format('YYYY-MM-DD');
    document.getElementById("nroRemito").value = datosPedido.NroRemito;
    //document.getElementById("costoFlete").value = formatoMoneda.format(datosPedido.CostoFlete);
    document.getElementById("costoFlete").value = formatoMoneda.format(datosPedido.CostoFlete.toFixed(2));
    document.getElementById("Zonas").value = datosPedido.IdZona;
    document.getElementById("Choferes").value = datosPedido.IdChofer;


    document.getElementById("estado").value = datosPedido.Estado;
    document.getElementById("observacion").value = datosPedido.Observacion;

    if (datosPedido.Estado == "Entregado") {
        document.getElementById("btnSeleccionarClienteModal").setAttribute('disabled', 'disabled');
        document.getElementById("btnSeleccionarProveedorModal").setAttribute('disabled', 'disabled');
    }

    document.getElementById("btnNuevoModificar").textContent = "Guardar";

    await calcularDatosPedido();

    saldoClienteFavor = datosPedido.SaldoAFavor;
    saldoClienteFavorInicial = datosPedido.SaldoAFavor;

    if (datosPedido.SaldoAFavor > 0) {
        $('#lblSaldoCliente')
            .removeAttr("hidden")
            .html(`El cliente tiene un saldo a favor de <span style="color: yellow; font-weight: bold;">${formatNumber(datosPedido.SaldoAFavor)}</span> pesos`)
            .css({
                "font-weight": "bold",
                "color": "white"
            });

    } else {
        $('#lblSaldoCliente')
            .attr("hidden", "hidden")
            .html(``);

    }

    saldoUsadoInicial = await calcularSaldoUsado();
}
async function abrirProveedor() {
    const proveedores = await obtenerProveedores();
    await cargarDataTableProveedores(proveedores);



    // Configura eventos de selección
    $('#tablaProveedores tbody').on('dblclick', 'tr', function () {
        var data = $('#tablaProveedores').DataTable().row(this).data();
        cargarDatosProveedor(data);
        $('#proveedorModal').modal('hide');
    });

    $('#btnSeleccionarProveedorModal').on('click', function () {
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

async function obtenerZonas(idCliente) {
    const response = await fetch(`/Zonas/Lista?idCliente=${idCliente}`);
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

async function obtenerProveedores() {
    const response = await fetch('/Proveedores/Lista');
    const data = await response.json();
    return data;
}

async function abrirCliente() {
    try {
        // Obtener y cargar los clientes antes de configurar eventos
        const clientes = await obtenerClientes();
        await cargarDataTableClientes(clientes); // Asegúrate de que esta función termine antes de seguir

        // Configura eventos de selección
        configurarEventosTablaClientes();

        // Abre el modal después de que todo esté configurado
        $('#clienteModal').modal('show');
    } catch (error) {
        console.error("Error al cargar clientes:", error);
        errorModal('Ocurrió un error al cargar los clientes. Intente nuevamente.');
    }
}

function configurarEventosTablaClientes() {
    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada

    // Doble clic en fila para seleccionar cliente
    $('#tablaClientes tbody').on('dblclick', 'tr', function () {
        const data = $('#tablaClientes').DataTable().row(this).data();
        if (data) {
            cargarDatosCliente(data);
            $('#clienteModal').modal('hide');
        }
    });

    // Botón para seleccionar cliente
    $('#btnSeleccionarClienteModal').on('click', function () {
        // Busca la fila seleccionada
        const data = $('#tablaClientes').DataTable().row('.selected').data();
        if (data) {
            cargarDatosCliente(data);
            $('#clienteModal').modal('hide');
        } else {
            errorModal('Seleccione un Cliente');
        }
    });



    // Selección de fila en la tabla
    $('#tablaClientes tbody').on('click', 'tr', function () {
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('selected');
            $('td', filaSeleccionada).removeClass('selected');
        }

        filaSeleccionada = $(this);
        $(filaSeleccionada).addClass('selected');
        $('td', filaSeleccionada).addClass('selected');
    });


}


async function abrirChofer() {
    const choferes = await obtenerChoferes();
    await cargarDataTableChoferes(choferes);

    $('#btnSeleccionarChofer').on('click', function () {
        var data = $('#tablaChoferes').DataTable().row('.selected').data();
        if (data) {
            cargarDatosChofer(data);
            $('#choferModal').modal('hide');
        } else {
            errorModal('Seleccione un Proveedor');
        }
    });

    // Configura eventos de selección
    $('#tablaChoferes tbody').on('dblclick', 'tr', function () {
        var data = $('#tablaChoferes').DataTable().row(this).data();
        cargarDatosChofer(data);
        $('#choferModal').modal('hide');
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


async function obtenerProveedores() {
    const response = await fetch('/Proveedores/Lista');
    const data = await response.json();
    return data;
}
function cargarDatosProveedor(data) {
    $('#idProveedor').val(data.Id);
    /*$('#nombreProveedor').val(data.Nombre);*/
    $('#apodoProveedor').val(data.Apodo);
    $('#direccionProveedor').val(data.Ubicacion);
    $('#telefonoProveedor').val(data.Telefono);
    // Limpiar la grilla de productos
    var table = $('#grd_Productos').DataTable();
    table.clear().draw();
}
function cargarDatosCliente(data) {
    $('#idCliente').val(data.Id);
   
    $('#dniCliente').val(data.Dni);
    $('#direccionCliente').val(data.Direccion);
    $('#telefonoCliente').val(data.Telefono);

    saldoClienteFavor = data.SaldoAfavor;
    saldoClienteFavorInicial = data.SaldoAfavor;

    if (data.SaldoAfavor > 0) {
        $('#lblSaldoCliente')
            .removeAttr("hidden")
            .html(`El cliente tiene un saldo a favor de <span style="color: yellow; font-weight: bold;">${formatNumber(data.SaldoAfavor)}</span> pesos`)
            .css({
                "font-weight": "bold",
                "color": "white"
            });

    } else {
        $('#lblSaldoCliente')
            .attr("hidden", "hidden")
            .html(``);

    }


    // Limpiar solo los registros de la grilla de productos
    var table = $('#grd_Productos').DataTable();
    table.clear().draw();
}

function cargarDatosChofer(data) {
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
    const url = `/Pedidos/ObtenerDatosPedido?idPedido=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function ObtenerDatosCliente(id) {
    const url = `/Clientes/EditarInfo?id=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function ObtenerDatosProveedor(id) {
    const url = `/Proveedores/EditarInfo?id=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function cargarDataTableProductos(data) {
    const datos = data != null ? data.$values : data;

    if (grdProductos) {
        grdProductos.clear().rows.add(datos).draw();
        return;
    }



    grdProductos = $('#grd_Productos').DataTable({
        data: datos,
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
            { data: 'ProductoCantidad', width: "15%" },
            { data: 'Cantidad', width: "15%" },
            {
                data: 'CantidadUsadaAcopio',
                width: "15%",
                render: function (data) {
                    return data ? data : "0";
                }
            },
            {
                data: null,
                width: "15%",
                render: function (data, type, row) {
                    let total = 0;
                    const cantidadBase = parseFloat(row.Cantidad) || 0;
                    const cantidadAcopio = parseFloat(row.CantidadUsadaAcopio) || 0;
                    const cantidadTotal = cantidadBase + cantidadAcopio;

                    if (row.Nombre.toUpperCase().includes("FAC. IVA")) {
                        total = cantidadBase * (parseFloat(row.PrecioVenta) / 100);
                    } else {
                        total = (parseFloat(row.PrecioVenta) * parseFloat(row.ProductoCantidad)) * cantidadTotal;
                    }
                    return formatoMoneda.format(total);
                }
            },
            { data: 'Peso', width: "15%", visible: false },
            { data: 'UnidadMedida', width: "15%", visible: false },
            {
                data: null,
                width: "15%",
                render: function (data, type, row) {
                    const descripcion = row.Nombre ? row.Nombre.toLowerCase() : '';
                    const unidadMedida = row.UnidadMedida ? row.UnidadMedida.toUpperCase() : '';
                    const peso = parseFloat(row.Peso) || 0;

                    if (descripcion.includes('hierro') && unidadMedida === 'KG' && peso > 0) {
                        const kilosTotales = row.ProductoCantidad * row.Cantidad;
                        const cantidadBarras = kilosTotales / peso;
                        return `Barras: <span style="color: yellow; font-weight: bold;">${cantidadBarras.toFixed(2)}</span>`;
                    }
                    return '';
                },
                orderable: false,
                searchable: false
            },

            {
                data: "Id",
                render: function (data, type, row) {
                    return `
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='abrirModalProducto(true, "${row.IdProducto}")' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                </button>
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarProducto(${row.IdProducto})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
                </button>`;
                },
                orderable: true,
                searchable: true,
            }
        ],
        orderCellsTop: true,
        fixedHeader: true,

        "columnDefs": [
            {
                "render": function (data, type, row) {
                    return formatNumber(data); // Formatear número en la columna
                },
                "targets": [1, 2, 5] // Columna Precio
            }
        ],



        initComplete: async function () {
            setTimeout(function () {
                grdProductos.columns.adjust();
            }, 1000);
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

    if (productosResponse.valor.length == 0) {
        errorModal("El proveedor no tiene productos asignados");
        return false;
    }

    productos = productosResponse ? productosResponse.valor : [];



    if (Array.isArray(productos) && productos.length > 0) {
        const productoSelect = $("#productoSelect");
        const precioSelect = $("#precioSelect");
        const precioInput = $("#precioInput");
        const cantidadInput = $("#cantidadInput");
        const productoCantidadInput = $("#productoCantidad");
        const unidadMedidaInput = $("#productoUnidadMedida");

        productoSelect.empty();
        precioSelect.empty();
        productoCantidadInput.empty();
        unidadMedidaInput.empty();

        // Obtener los productos que ya están en la tabla (evitar duplicados)
        const productosEnTabla = [];
        grdProductos.rows().every(function () {
            const data = this.data();
            productosEnTabla.push(Number(data.IdProducto));
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
            advertenciaModal("¡Ya has agregado todos los productos del proveedor!");
            return false; // No continuar con la adición si todos ya están añadidos
        }

        productoSelect.on("change", async function () {
            const selectedProductId = parseInt(this.value);
            const selectedProduct = productos.find(p => p.IdProducto === selectedProductId);

            // Obtener stock disponible de este producto
            const acopioResponse = await fetch(`/Acopio/ObtenerStock?idProducto=${selectedProductId}&idProveedor=${idProveedor}`);

            if (acopioResponse.ok) {
                const acopioData = await acopioResponse.json();
                const cantidadDisponible = acopioData.CantidadActual || 0;
                cantidadAcopioDisponible = acopioData.CantidadActual || 0;


                // Mostrar label con stock
                document.getElementById("lblStockDisponible").innerHTML = `Stock disponible: <b>${cantidadDisponible}</b>`;

                // Mostrar/ocultar campo de cantidad de acopio
                const divCantidadAcopio = document.getElementById("divCantidadAcopio");
                if (cantidadAcopioDisponible > 0) {
                    divCantidadAcopio.hidden = false;
                } else {
                    divCantidadAcopio.hidden = true;
                    document.getElementById("cantidadAcopioInput").value = ""; // limpiar
                }
            } else if (acopioResponse.status === 404) {
                document.getElementById("lblStockDisponible").innerHTML = "";
                document.getElementById("divCantidadAcopio").hidden = true;
                document.getElementById("cantidadAcopioInput").value = "";
            } else {
                console.error("Error al obtener el stock");
                document.getElementById("lblStockDisponible").innerHTML = "";
                document.getElementById("divCantidadAcopio").hidden = true;
                document.getElementById("cantidadAcopioInput").value = "";
            }


             


            precioSelect.empty();
            if (selectedProduct && Array.isArray(selectedProduct.Precios) && selectedProduct.Precios.length > 0) {
                selectedProduct.Precios.forEach(precio => {
                    precioSelect.append(
                        `<option value="${precio.PrecioVenta},${precio.PrecioCosto}">
                    ${formatoMoneda.format(precio.PrecioVenta)}
                </option>`
                    );
                });

                const precioVenta = selectedProduct.Precios[0].PrecioVenta;
                const precioCosto = selectedProduct.Precios[0].PrecioCosto;
                const productoCantidad = selectedProduct.ProductoCantidad;
                const productoUnidadMedida = selectedProduct.UnidadMedida;

                productoCantidadInput.val(productoCantidad);
                precioInput.val(formatoMoneda.format(precioVenta));
                document.getElementById("productoUnidadMedida").value = productoUnidadMedida;

                await calcularTotal();
                calcularDetalleFacturaIVA(selectedProduct);

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

async function calcularSaldoUsado() {

    let saldoUsado = 0;

    // Si estamos editando, solo actualizamos la fila correspondiente
    grdPagosaClientes.rows().every(function () {
        const data = this.data();
        if (data.SaldoUsado > 0) {
            saldoUsado += data.SaldoUsado;
        }
    });

    return saldoUsado;
}

async function guardarProducto() {
    const precioSelect = document.getElementById('precioSelect');
    const productoSelect = document.getElementById('productoSelect');
    const cantidadInput = parseFloat(formatearSinMiles(document.getElementById('cantidadInput').value)) || 0;
    const productoId = productoSelect.value;
    const productoNombre = productoSelect.options[productoSelect.selectedIndex]?.text || '';
    const primerOptionValue = precioSelect.options[0].value;
   
    let [precioVenta, precioCosto] = primerOptionValue.split(",").map(Number);

    const cantidadAcopio = parseFloat(document.getElementById('cantidadAcopioInput').value) || 0;

    if (cantidadAcopio > cantidadAcopioDisponible) {
        errorModal(`La cantidad de acopio no puede ser mayor al stock disponible (${cantidadAcopioDisponible})`);
        return;
    }

    if (cantidadAcopio > cantidadAcopioDisponible) {
        errorModal(`La cantidad de acopio no puede ser mayor a la cantidad vendida (${cantidadInput})`);
        return;
    }


    const modal = $('#productosModal');
    const isEditing = modal.attr('data-editing') === 'true';
    const editId = modal.attr('data-id');

    const selectedProduct = productos.find(p => p.IdProducto === parseInt(productoId));

    let productoExistente = false;

    // Factor sin IVA es la cantidad de productos
    const factorSinIVA = selectedProduct.ProductoCantidad;

    let importeVentaUnitario = precioVenta;
    let importeCostoUnitario = precioCosto;
    let totalVenta = 0;

    if (productoNombre.toUpperCase().includes("FAC. IVA")) {
        // Lo que paga el cliente: Cantidad * (PrecioVenta%)
        totalVenta = cantidadInput * (precioVenta / 100);

        // El importeCostoUnitario NO debe calcularse, debe seguir siendo el porcentaje
        importeCostoUnitario = precioCosto;

        // Para la grilla mostramos como porcentaje
        importeVentaUnitario = precioVenta;
   
    } else {
        // Normal
        const cantidadTotal = cantidadInput + cantidadAcopio;
        totalVenta = (importeVentaUnitario * factorSinIVA) * cantidadTotal;
    }

    if (isEditing) {
        grdProductos.rows().every(function () {
            const data = this.data();
            if (data.IdProducto == editId) {
                data.Nombre = productoNombre;
                data.PrecioVenta = importeVentaUnitario;
                data.PrecioCosto = importeCostoUnitario;
                data.ProductoCantidad = factorSinIVA;
                data.Cantidad = cantidadInput;
                data.CantidadUsadaAcopio = cantidadAcopio; // <-- aquí también
                data.Total = totalVenta;
                this.data(data).draw();
            }
        });
    } else {
        grdProductos.rows().every(function () {
            const data = this.data();
            if (data.IdProducto == productoId) {
                // Si no es FAC. IVA, sumamos cantidad
                if (!productoNombre.toUpperCase().includes("FAC. IVA")) {
                    data.Cantidad += cantidadInput;
                    data.Total = (data.PrecioVenta * data.ProductoCantidad) * data.Cantidad;
                }
                this.data(data).draw();
                productoExistente = true;
            }
        });

        if (!productoExistente) {
            grdProductos.row.add({
                IdProducto: productoId,
                Nombre: productoNombre,
                ProductoCantidad: factorSinIVA,
                PrecioVenta: importeVentaUnitario,
                PrecioCosto: importeCostoUnitario,
                Cantidad: cantidadInput,
                CantidadUsadaAcopio: cantidadAcopio,
                Total: totalVenta,
                UnidadMedida: selectedProduct.UnidadMedida || "",
                Peso: selectedProduct.Peso || 0
            }).draw();
        }
    }

    modal.modal('hide');
    await calcularDatosPedido();
}




async function calcularDatosPedido() {
    let pedidoVenta = 0, pedidoCosto = 0, pagosaproveedores = 0, pagosclientes = 0, restantecliente = 0, restanteproveedor = 0, pedidoVentaFinal = 0, totalPagaraProveedor = 0;

    const inputRestanteProveedor = document.getElementById("restanteProveedor");
    const inputRestanteCliente = document.getElementById("restanteCliente");
    const costoFlete = document.getElementById("costoFlete");

    if (grdProductos != null && grdProductos.rows().count() > 0) {
        grdProductos.rows().every(function () {
            const producto = this.data();

            const cantidadBase = parseFloat(producto.Cantidad) || 0;
            const cantidadAcopio = parseFloat(producto.CantidadUsadaAcopio) || 0;
            const cantidadTotal = cantidadBase + cantidadAcopio;

            if (producto.Nombre.toUpperCase().includes("FAC. IVA")) {
                pedidoVenta += cantidadBase * (parseFloat(producto.PrecioVenta) / 100);
                pedidoCosto += cantidadBase * producto.ProductoCantidad * (parseFloat(producto.PrecioCosto) / 100);
            } else {
                pedidoVenta += (parseFloat(producto.PrecioVenta) * producto.ProductoCantidad) * cantidadTotal;
                pedidoCosto += (parseFloat(producto.PrecioCosto) * producto.ProductoCantidad) * cantidadTotal;
            }

        });
    }


    if (grdPagosaProveedores != null && grdPagosaProveedores.rows().count() > 0) {
        grdPagosaProveedores.rows().every(function () {
            const pago = this.data();
            pagosaproveedores += parseFloat(pago.TotalArs);
        });
    }

    if (grdPagosaClientes != null && grdPagosaClientes.rows().count() > 0) {
        grdPagosaClientes.rows().every(function () {
            const pago = this.data();
            pagosclientes += parseFloat(pago.TotalArs);
        });
    }

    const flete = parseFloat(convertirMonedaAFloat(costoFlete.value));

    const totalGanancia = pedidoVenta - pedidoCosto - flete;
    const porcGanancia = pedidoCosto > 0 ? (totalGanancia / pedidoCosto) * 100 : 0;

    restanteproveedor = pedidoCosto - pagosaproveedores;
    pedidoVentaFinal = pedidoVenta + flete;
    restantecliente = pedidoVentaFinal - pagosclientes;

    totalPagaraProveedor = pedidoCosto + flete;

    document.getElementById("totalPagoProveedor").value = formatoMoneda.format(parseFloat(totalPagaraProveedor));
    document.getElementById("totalPagadoaProveedor").value = formatoMoneda.format(parseFloat(pagosaproveedores));
    document.getElementById("totalPagoCliente").value = formatoMoneda.format(parseFloat(pedidoVentaFinal));
    document.getElementById("totalPagadoCliente").value = formatoMoneda.format(parseFloat(pagosclientes));
    document.getElementById("totalGanancia").value = formatoMoneda.format(parseFloat(totalGanancia));
    document.getElementById("porcGanancia").value = `${porcGanancia.toFixed(2)}%`;

    inputRestanteProveedor.value = formatoMoneda.format(restanteproveedor);
    if (restanteproveedor < 0) {
        inputRestanteProveedor.style.setProperty("color", "red", "important");
    } else {
        inputRestanteProveedor.style.setProperty("color", "black", "important");
    }

    inputRestanteCliente.value = formatoMoneda.format(restantecliente);
    if (restantecliente < 0) {
        inputRestanteCliente.style.setProperty("color", "red", "important");
    } else {
        inputRestanteCliente.style.setProperty("color", "black", "important");
    }
}


function eliminarProducto(id) {
    grdProductos.rows().every(function (rowIdx, tableLoop, rowLoop) {
        const data = this.data();
        if (data != null && data.IdProducto == id) {
            grdProductos.row(rowIdx).remove().draw();
        }
    });

    calcularDatosPedido();
}
async function editarProducto(id) {


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
    const cantidad = parseFloat($(`.cantidad:eq(${rowIndex})`).val());
    rowData.Cantidad = cantidad;
    rowData.Total = rowData.Precio * cantidad;
    grdProductos.row(rowIndex).data(rowData).draw();
}

async function abrirModalProducto(isEdit = false, productoId = null) {
    const productoSelect = document.getElementById('productoSelect');
    const precioSelect = document.getElementById('precioSelect');
    const precioInput = document.getElementById('precioInput');
    const cantidadInput = document.getElementById('cantidadInput');
    const productoCantidadInput = document.getElementById('productoCantidad');
    const unidadMedidaInput = $("#productoUnidadMedida");
    const cantidadAcopioInput = document.getElementById('cantidadAcopioInput');
    const lblStockDisponible = document.getElementById("lblStockDisponible");
    const divCantidadAcopio = document.getElementById("divCantidadAcopio");

    let i = 0, optionSeleccionado = 0;

    productoSelect.value = '';
    precioSelect.innerHTML = '';
    cantidadInput.value = '';
    precioInput.value = '';
    productoCantidadInput.value = '';
    unidadMedidaInput.val('');
    cantidadAcopioInput.value = '';
    lblStockDisponible.innerHTML = '';
    divCantidadAcopio.hidden = true;

    const modal = $('#productosModal');

    if (isEdit && productoId) {
        const productoData = grdProductos.row(function (idx, data) {
            return data.IdProducto == productoId;
        }).data();

        if (productoData) {
            const idCliente = parseInt($("#idCliente").val());
            const idProveedor = parseInt($("#idProveedor").val());

            const productosResponse = await ObtenerUltimosPreciosProducto(idCliente, idProveedor, productoData.IdProducto);
            productos = productosResponse ? productosResponse.valor : [];
            const selectedProduct = productos.find(p => p.IdProducto === parseInt(productoId));
            const cantidadUsadaAcopio = productoData.CantidadUsadaAcopio || 0;


            document.getElementById("productoUnidadMedida").value = selectedProduct.UnidadMedida;

            try {
                const acopioResponse = await fetch(`/Acopio/ObtenerStock?idProducto=${productoData.IdProducto}&idProveedor=${productoData.IdProveedor}`);
                if (acopioResponse.ok) {
                    const acopioData = await acopioResponse.json();
                    const stockLibre = acopioData.CantidadActual || 0;
                    const cantidadYaUsada = cantidadUsadaAcopio || 0;

                    // Para la validación
                    cantidadAcopioDisponible = stockLibre + cantidadYaUsada;

                    // Mostrar solo el stock libre
                    lblStockDisponible.innerHTML = `Stock disponible: <b>${stockLibre}</b>`;
                } else {
                    cantidadAcopioDisponible = cantidadUsadaAcopio || 0;
                    lblStockDisponible.innerHTML = `Stock disponible: <b>0</b>`;
                }
            } catch (e) {
                console.error("Error obteniendo acopio", e);
                cantidadAcopioDisponible = cantidadUsadaAcopio || 0;
                lblStockDisponible.innerHTML = `Stock disponible: <b>0</b>`;
            }



            // Mostrar u ocultar div según stock disponible o si el producto ya tenía acopio usado
            if (cantidadAcopioDisponible > 0 || cantidadUsadaAcopio > 0) {
                divCantidadAcopio.hidden = false;

                // Si ya tenía acopio usado, mostrar ese valor
                cantidadAcopioInput.value = cantidadUsadaAcopio > 0 ? cantidadUsadaAcopio : "";

                // Mostrar leyenda indicando cuánto estaba usado y cuánto disponible
               lblStockDisponible.innerHTML = `Stock disponible: <b>${cantidadAcopioDisponible}</b>`;
            } else {
                divCantidadAcopio.hidden = true;
                cantidadAcopioInput.value = "";
                lblStockDisponible.innerHTML = "";
            }


            // Llenar selects de productos
            if (Array.isArray(productos) && productos.length > 0) {
                productoSelect.innerHTML = '';
                precioSelect.innerHTML = '';

                productos.forEach(p => {
                    const option = document.createElement("option");
                    option.value = p.IdProducto;
                    option.text = p.Nombre;
                    productoSelect.appendChild(option);
                });
            }

            // Cargar precios
            if (selectedProduct && selectedProduct.Precios) {
                selectedProduct.Precios.forEach(precio => {
                    const option = document.createElement("option");
                    option.value = `${precio.PrecioVenta},${precio.PrecioCosto}`;
                    option.text = formatoMoneda.format(precio.PrecioVenta);
                    precioSelect.appendChild(option);

                    if (productoData.PrecioVenta == precio.PrecioVenta) {
                        optionSeleccionado = i;
                    }
                    i++;
                });
            }

            // Setear valores
            productoSelect.value = productoData.IdProducto;
            productoCantidadInput.value = productoData.ProductoCantidad;
            cantidadInput.value = productoData.Cantidad;
            precioInput.value = formatoMoneda.format(productoData.PrecioVenta);

            productoSelect.disabled = true;
            if (precioSelect.options.length > 0) {
                precioSelect.options[optionSeleccionado].selected = true;
            }

            await calcularTotal();
            await calcularBarras(productoData, productoData.Cantidad);

            modal.attr('data-editing', 'true');
            modal.attr('data-id', productoId);
            $('#btnGuardarProducto').text('Editar Producto');
        }
    } else {
        modal.attr('data-editing', 'false');
        modal.removeAttr('data-id');
        $('#btnGuardarProducto').text('Añadir Producto');
    }

    modal.modal('show');
}


async function calcularTotal() {
    const precioRaw = document.getElementById('precioInput').value;
    const cantidad = parseFloat(formatearSinMiles(document.getElementById('cantidadInput').value)) || 0;
    const cantidadProducto = parseFloat(document.getElementById('productoCantidad').value) || 0;

    // Extraer solo el número del campo precio
    const precio = parseFloat(convertirMonedaAFloat(precioRaw));

    const cantidadVendida = parseFloat(formatearSinMiles(document.getElementById('cantidadInput').value)) || 0;
    const cantidadAcopio = parseFloat(document.getElementById('cantidadAcopioInput')?.value) || 0;
    const cantidadTotal = cantidadVendida + cantidadAcopio;

    const total = (precio * cantidadProducto) * cantidadTotal;


    // Mostrar el total formateado en el campo
    document.getElementById('totalInput').value = formatoMoneda.format(total);

    // Obtener datos necesarios
    const productoSelectElement = document.getElementById('productoSelect');
    const productoId = parseInt(productoSelectElement.value);

    // Buscar el producto seleccionado en la lista "productos"
    const selectedProduct = productos.find(p => p.IdProducto === productoId);

    calcularBarras(selectedProduct, cantidad)

    

    calcularDetalleFacturaIVA(selectedProduct);

    
}

async function calcularBarras(selectedProduct, cantidad) {
    const cantidadBarrasLabel = document.getElementById('totalBarras');

   

    if (selectedProduct) {
        const descripcion = selectedProduct.Nombre ? selectedProduct.Nombre.toLowerCase() : '';
        const unidadMedida = selectedProduct.UnidadMedida ? selectedProduct.UnidadMedida.toUpperCase() : '';
        const peso = parseFloat(selectedProduct.Peso) || 0;

        // Validar condiciones
        if (descripcion.includes("hierro") && unidadMedida === "KG" && peso > 0) {
            // Calcular cantidad de barras
            const cantidadBarras = cantidad / peso;

            cantidadBarrasLabel.hidden = false;
            cantidadBarrasLabel.innerHTML = `Cantidad de barras: <span style="color: yellow; font-weight: bold;">${cantidadBarras.toFixed(2)}</span>`;
        } else {
            // Si no cumple condiciones, ocultar
            cantidadBarrasLabel.hidden = true;
            cantidadBarrasLabel.innerHTML = "";
        }
    } else {
        // Si no hay producto seleccionado, ocultar
        cantidadBarrasLabel.hidden = true;
        cantidadBarrasLabel.innerHTML = "";
    }
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


    const datos = data != null ? data.$values : data;

    if (grdPagosaProveedores) {
        grdPagosaProveedores.clear().rows.add(datos).draw();
        return;

    }
        grdPagosaProveedores = $('#grd_pagosaProveedores').DataTable({
            data: datos,
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

            "columnDefs": [
                {
                    "render": function (data, type, row) {
                        // Formatear fecha desde el formato ISO
                        if (data) {
                            return moment(data, 'YYYY-MM-DD').format('DD/MM/YYYY')
                        }
                    },
                    "targets": [0] // Índices de las columnas de fechas
                },

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [3, 5] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {
                setTimeout(function () {
                    grdPagosaProveedores.columns.adjust();
                }, 1000);
            }


        });
}
async function cargarDataTablePagoaClientes(data) {

    const datos = data != null ? data.$values : data;

    if (grdPagosaClientes) {
        grdPagosaClientes.clear().rows.add(datos).draw();
        return;
    }

    grdPagosaClientes = $('#grd_pagosClientes').DataTable({
        data: data != null ? data.$values : data,
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
        fixedHeader: true,

        "columnDefs": [
            {
                "render": function (data, type, row) {
                    // Formatear fecha desde el formato ISO
                    if (data) {
                        return moment(data, 'YYYY-MM-DD').format('DD/MM/YYYY')
                    }
                },
                "targets": [0] // Índices de las columnas de fechas
            },

            {
                "render": function (data, type, row) {
                    return formatNumber(data); // Formatear números
                },
                "targets": [3, 5] // Índices de las columnas de números
            },

        ],

        initComplete: async function () {
            setTimeout(function () {
                grdPagosaClientes.columns.adjust();
            }, 1000);
        }
    });
}
async function editarPago(tipo, id) {
    // Buscar el pago por su ID

    let grid = null;

    if (tipo == 'Cliente') {
        grid = $('#grd_pagosClientes').DataTable();
    } else if (tipo == 'Proveedor') {
        grid = $('#grd_pagosaProveedores').DataTable();
    }

    let row = null;


    if (String(id).includes("pago_")) {
        row = grid.rows().data().toArray().find(x => x.Id === id);
    } else {
        row = grid.rows().data().toArray().find(x => x.Id === parseInt(id));
    }


    if (row) {
        // Cargar los datos en el modal
        document.getElementById(`fechapago${tipo}`).value = moment(row.Fecha, 'YYYY-MM-DD').format('YYYY-MM-DD');
        document.getElementById(`MonedasPago${tipo}`).value = row.IdMoneda;
        document.getElementById(`cotizacionPago${tipo}`).value = formatoMoneda.format(parseFloat(row.Cotizacion));
        document.getElementById(`cantidadPago${tipo}`).value = parseFloat(row.Total);
        document.getElementById(`observacionPago${tipo}`).value = row.Observacion;

        let checkSaldoFavor = document.getElementById("usarSaldoFavor");

        if (tipo == "Cliente") {
            if (row.SaldoUsado > 0) {
                $("#divSaldoFavor").removeAttr("hidden");
                checkSaldoFavor.checked = true;
            } else {
                $("#divSaldoFavor").attr("hidden", "hidden");
                checkSaldoFavor.checked = false;
            }
        }

        let saldoUsado = await calcularSaldoUsado();
        let saldoFavor = saldoClienteFavorInicial - saldoUsado;

        if (row.SaldoUsado == 0 && saldoFavor > 0 && tipo == "Cliente") {
            $("#divSaldoFavor").removeAttr("hidden");
            checkSaldoFavor.checked = false;
        }


        const cotizacionInput = document.getElementById(`cotizacionPago${tipo}`);
        const monedasSelect = document.getElementById(`MonedasPago${tipo}`);

        const monedas = await ObtenerMonedas();

        if (monedas) {
            monedas.forEach(moneda => {
                const option = document.createElement('option');
                option.value = moneda.Id; // Asume que cada moneda tiene un ID
                option.textContent = moneda.Nombre; // Asume que cada moneda tiene un nombre
                option.dataset.cotizacion = formatoMoneda.format(moneda.Cotizacion); // Guarda la cotización en un atributo personalizado
                monedasSelect.appendChild(option);
            });
        }

        calcularTotalCotizacionPago(tipo);



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

    // Determinar qué grid usar
    if (tipo === 'Cliente') {
        grid = $('#grd_pagosClientes').DataTable();
    } else if (tipo === 'Proveedor') {
        grid = $('#grd_pagosaProveedores').DataTable();
    }

    // Verificar si el ID contiene "pago_", y tratarlo correctamente
    let idNumerico = id;
    if (String(id).includes("pago_")) {
        grid.rows().data().toArray().forEach(function (row, index) {
            if (row.Id === id) {
                grid.row(index).remove().draw();
            }
        });
    } else {
        idNumerico = parseInt(id);
        grid.rows().data().toArray().forEach(function (row, index) {
            if (row.Id === idNumerico) {
                grid.row(index).remove().draw();
            }
        });
    }

    // Llamar a las funciones para recalcular totales
    calcularTotalPago(tipo);
    calcularDatosPedido();
}

function guardarPago(tipo) {
    const modal = $(`#pagos${tipo}Modal`);
    const monedaSelect = document.getElementById(`MonedasPago${tipo}`);
    const cotizacion = parseFloat(convertirMonedaAFloat((document.getElementById(`cotizacionPago${tipo}`).value)));
    const cantidadInput = parseFloat(document.getElementById(`cantidadPago${tipo}`).value) || 1; // Obtener cantidad, por defecto 1 si no es válida
    const total = parseFloat(convertirMonedaAFloat((document.getElementById(`totalARSPago${tipo}`).value))) || 1; // Obtener cantidad, por defecto 1 si no es válida
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

    var checkSaldoFavor = $("#usarSaldoFavor").prop('checked');

    if (checkSaldoFavor) {
        saldoUsado = cantidadInput;
    }

    if (isEditing) {
        grid.rows().every(function () {
            const data = this.data();
            if (data.Id == editId) {
                data.Fecha = moment(fechapago, 'YYYY-MM-DD'),
                    data.IdMoneda = monedaSelect.value,
                    data.Moneda = monedaSelect.options[monedaSelect.selectedIndex]?.text || '',
                    data.Cotizacion = cotizacion,
                    data.Total = cantidadInput, // Usar la cantidad proporcionada
                    data.TotalArs = cotizacion * cantidadInput, // Recalcular el total con formato de moneda
                    data.Observacion = observacion,
                    data.SaldoUsado = tipo == 'Cliente' && checkSaldoFavor ? cantidadInput : 0
                this.data(data).draw();
            }
        });
    } else {
        // Si no existe, agregar un nuevo producto
        grid.row.add({
            Id: pagoId, // Identificador único
            Fecha: moment(fechapago, 'YYYY-MM-DD'),
            IdMoneda: monedaSelect.value,
            Moneda: monedaSelect.options[monedaSelect.selectedIndex]?.text || '',
            Cotizacion: cotizacion,
            Total: cantidadInput, // Usar la cantidad proporcionada
            TotalArs: cotizacion * cantidadInput, // Recalcular el total con formato de moneda
            Observacion: observacion,
            SaldoUsado: tipo == 'Cliente' && checkSaldoFavor ? cantidadInput : 0
        }).draw();
    }

    calcularTotalPago(tipo);
    calcularDatosPedido();

    const idsActuales = grid.rows().data().toArray().map(p => p.Id);
    console.log(`IDs actuales en grdPagos${tipo}:`, idsActuales);

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
        totalSum += data.TotalArs;
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

        saldoUsado = await calcularSaldoUsado();

        let checkSaldoFavor = document.getElementById("usarSaldoFavor");
        checkSaldoFavor.checked = false;

        let saldoTotal = saldoClienteFavorInicial - saldoUsado;

        if (tipo == "Cliente") {
            if (saldoTotal > 0) {
                $("#divSaldoFavor").removeAttr("hidden");
            } else {
                $("#divSaldoFavor").attr("hidden", "hidden");
            }
        }

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
    const total = parseFloat(convertirMonedaAFloat((cotizacionPago))) * cantidad;
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
    let rawValue = this.value.trim();

    // Verificamos si ya tiene el formato correcto (p. ej. $12.800,00)
    if (!rawValue.includes('$') && !rawValue.includes(',')) {
        // Si no tiene símbolo de moneda ni coma decimal, formateamos el valor
        let parsedValue = parseFloat(rawValue.replace('.', '').replace(',', '.')) || 0;
        this.value = formatNumber(parsedValue);
    } else {
        // Si ya tiene formato, no tocamos el valor
        // Solo nos aseguramos de que sea un número válido para la operación
        rawValue = rawValue.replace(/[^\d,\.]/g, ''); // Eliminar caracteres no numéricos, excepto coma y punto
        let parsedValue = parseFloat(rawValue.replace('.', '').replace(',', '.')) || 0;
        this.value = formatNumber(parsedValue);
    }

    calcularDatosPedido(); // Si necesitas realizar alguna operación adicional con el valor
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
        selectElement.style.setProperty('color', 'red', 'important');  // Cambia a amarillo si es "Pendiente"
    } else if (selectedValue === "Entregado") {
        selectElement.style.setProperty('color', 'green', 'important');  // Cambia a blanco si es "Entregado"
    }
});

function obtenerPagos(grd) {
    let pagos = [];
    grd.rows().every(function () {
        const pago = this.data();
        const idNumerico = parseInt(pago.Id);
        const esNuevo = isNaN(idNumerico) || String(pago.Id).includes("pago_");

        pagos.push({
            Id: idPedido && !esNuevo ? idNumerico : 0,
            Fecha: moment(pago.Fecha, 'YYYY-MM-DD').format('YYYY-MM-DD'),
            IdMoneda: parseInt(pago.IdMoneda),
            Cotizacion: parseFloat(pago.Cotizacion),
            Total: parseFloat(pago.Total),
            TotalArs: parseFloat(pago.TotalArs),
            Observacion: pago.Observacion,
            SaldoUsado: parseFloat(pago.SaldoUsado)
        });
    });
    return pagos;
}





function obtenerProductos(grd) {
    let productos = [];
    grd.rows().every(function () {
        const producto = this.data();
        const productoJson = {
            Id: idPedido != "" ? producto.Id : 0,
            IdProducto: parseInt(producto.IdProducto),
            Nombre: producto.Nombre,
            PrecioCosto: parseFloat(producto.PrecioCosto),
            PrecioVenta: parseFloat(producto.PrecioVenta),
            ProductoCantidad: parseFloat(producto.ProductoCantidad),
            Cantidad: parseFloat(producto.Cantidad),
            CantidadUsadaAcopio: parseFloat(producto.CantidadUsadaAcopio) // NUEVO
        };

        productos.push(productoJson);
    });
    return productos;

}
async function guardarCambios() {
   
    if (isValidPedido()) {
        // Función reutilizable para recolectar los pagos
       

        const saldoUsado = await calcularSaldoUsado();


        // Obtener los pagos de clientes y proveedores usando la función reutilizable
        const pagosClientes = await obtenerPagos(grdPagosaClientes);
        const pagosaProveedores = await obtenerPagos(grdPagosaProveedores);
        const productos = await obtenerProductos(grdProductos);

        // Construcción del objeto para el modelo
        const nuevoModelo = {
            "Id": idPedido !== "" || idPedido === 0  ? parseInt(idPedido) : 0,
            "Fecha": moment($("#fechaPedido").val(), 'YYYY-MM-DD').format('YYYY-MM-DD'),
            "IdCliente": parseInt($("#Clientes").val()),
            "FechaEntrega": moment($("#fechaEntrega").val(), 'YYYY-MM-DD').format('YYYY-MM-DD'),
            "NroRemito": $("#nroRemito").val(),
            "CostoFlete": parseFloat(convertirMonedaAFloat($("#costoFlete").val())),
            "IdProveedor": parseInt($("#Proveedores").val()),
            "IdZona": parseInt($("#Zonas").val()),
            "IdChofer": parseInt($("#Choferes").val()),
            "TotalCliente": parseFloat(convertirMonedaAFloat($("#totalPagoCliente").val())),
            "RestanteCliente": parseFloat(convertirMonedaAFloat($("#restanteCliente").val())),
            "TotalProveedor": parseFloat(convertirMonedaAFloat($("#totalPagoProveedor").val())),
            "RestanteProveedor": parseFloat(convertirMonedaAFloat($("#restanteProveedor").val())),
            "TotalGanancia": parseFloat(convertirMonedaAFloat($("#totalGanancia").val())),
            "PorcGanancia": parseFloat($("#porcGanancia").val()),
            "Estado": $("#estado").val(),
            "Observacion": $("#observacion").val(),
            "PagosPedidosClientes": pagosClientes,
            "PagosPedidosProveedores": pagosaProveedores,
            "PedidosProductos": productos
        };

        // Definir la URL y el método para el envío
        const url = idPedido === "" || idPedido === 0 ? "/Pedidos/Insertar" : "/Pedidos/Actualizar";
        const method = idPedido === "" || idPedido === 0 ? "POST" : "PUT";

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
                if (localStorage.getItem('EditandoPedidoDesdeVenta') == 'true') {
                    window.location.href = "/Ventas/Index";
                    localStorage.removeItem('EditandoPedidoDesdeVenta');
                } else {
                    window.location.href = "/Pedidos/Index";
                }



            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
}

function isValidPedido() {
    // Assuming grd_productos is a table with an id 'grd_productos'
    var cantidadFilas = $('#grd_Productos').DataTable().rows().count();
    var restanteProveedor = parseFloat(convertirMonedaAFloat($("#restanteProveedor").val()));
    var restanteCliente = parseFloat(convertirMonedaAFloat($("#restanteCliente").val()));

    if (cantidadFilas <= 0) {
        if (idPedido == "") {
            errorModal('No puedes crear un pedido sin productos.')
        } else {
            errorModal('No puedes modificar un pedido sin productos.')
        }
        return false;
    }

    if (restanteProveedor < 0 || restanteCliente < 0) {
        errorModal('No puedes tener un saldo de pago negativo')
        return false;
    }


    return true;
}


checkSaldoFavor.addEventListener("change", function () {
    const cantidadPagoCliente = document.getElementById("cantidadPagoCliente");
    const restanteCliente = parseFloat(convertirMonedaAFloat(document.getElementById("restanteCliente").value));
    const totalArs = parseFloat(convertirMonedaAFloat(document.getElementById("totalARSPagoCliente").value));

    if (checkSaldoFavor.checked) {
        cantidadPagoCliente.setAttribute("disabled", "disabled");

        if (saldoClienteFavor > restanteCliente) {
            cantidadPagoCliente.value = restanteCliente;
        } else {
            cantidadPagoCliente.value = saldoClienteFavor;
        }

    } else {
        cantidadPagoCliente.removeAttribute("disabled");
        cantidadPagoCliente.value = 1;
    }

    totalArs.value = formatNumber(parseFloat(cantidadPagoCliente.value))
});


$('#Clientes').on('change', async function () {
    let idCliente = this.value;
    dataCliente = await ObtenerDatosCliente(idCliente);

    cargarDatosCliente(dataCliente);
    listaZonas();
    document.getElementById("divDatosPedido").removeAttribute("hidden");
});


$('#Proveedores').on('change', async function () {
    let idProveedor = this.value;
    data = await ObtenerDatosProveedor(idProveedor);

    cargarDatosProveedor(data);
});

document.querySelectorAll("#cantidadInput").forEach(input => {
    input.addEventListener("input", function () {
        const cursorPos = this.selectionStart;
        const originalLength = this.value.length;

        const formateado = formatearMiles(this.value);
        this.value = formateado;

        const newLength = formateado.length;
        this.setSelectionRange(
            cursorPos + (newLength - originalLength),
            cursorPos + (newLength - originalLength)
        );
    });
});

function calcularDetalleFacturaIVA(selectedProduct) {
    const detalleDiv = document.getElementById("detalleFacturaIVA");
    const divTotal = document.getElementById("divTotal"); // 🚀 capturamos el div

    if (!detalleDiv) return;

    if (!selectedProduct || !selectedProduct.Nombre || !selectedProduct.Nombre.toUpperCase().includes("FAC. IVA")) {
        detalleDiv.style.display = "none";

        // Si NO es FAC. IVA, mostrar el total
        if (divTotal) divTotal.style.display = "block";
        return;
    }

    detalleDiv.style.display = "block";

    // Si ES FAC. IVA, ocultar el total
    if (divTotal) divTotal.style.display = "none";

    // Factor para quitar el 21% IVA
    const factorSinIVA = parseFloat(document.getElementById('productoCantidad').value) || 1;

    // Cantidad = Fac IVA
    const cantidadFacIVA = parseFloat(formatearSinMiles(document.getElementById('cantidadInput').value));

    // Fac. SIN IVA
    const facSinIVA = cantidadFacIVA * factorSinIVA;

    // Porcentaje venta del input oculto
    const precioVentaPorc = parseFloat(convertirMonedaAFloat(document.getElementById('precioInput').value)) || 0;

    // Porcentaje proveedor = precio costo
    const precioProveedorPorc = parseFloat(selectedProduct.Precios[0].PrecioCosto) || 0;

    // Venta sobre Fac. IVA
    const venta = cantidadFacIVA * (precioVentaPorc / 100);

    // Costo sobre Fac. SIN IVA
    const costo = facSinIVA * (precioProveedorPorc / 100);

    const ganancia = venta - costo;

    document.getElementById("facIVA").textContent = formatoMoneda.format(cantidadFacIVA);
    document.getElementById("facSinIVA").textContent = formatoMoneda.format(facSinIVA);
    document.getElementById("precioProveedor").textContent = precioProveedorPorc.toFixed(2) + "%";
    document.getElementById("precioVenta").textContent = precioVentaPorc.toFixed(2) + "%";
    document.getElementById("venta").textContent = formatoMoneda.format(venta);
    document.getElementById("costo").textContent = formatoMoneda.format(costo);
    document.getElementById("ganancia").textContent = formatoMoneda.format(ganancia);
}


async function obtenerProximoNroRemito() {
    try {
        const response = await fetch('/Pedidos/ObtenerProximoNroRemito');
        if (!response.ok) throw new Error('Error al obtener el número de partida.');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        return '';
    }
}

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/notificacionesHub")
    .build();

connection.on("PedidoActualizado", async function (data) {
    const idPedidoActual = pedidoData.Id;
    if (data.idPedido !== idPedidoActual) return;

    if (data.idUsuario !== userSession.Id) {
        reproducirSonidoNotificacion();
        sincronizarTodo(data.idPedido, data); // Esto sí ejecuta mensajes
    }
});

connection.start()
    .then(() => console.log("✅ SignalR conectado"))
    .catch(err => console.error(err.toString()));

async function sincronizarTodo(idPedido, data) {
    const productosViejos = obtenerProductos(grdProductos);
    const pagosClientesViejos = await obtenerPagos(grdPagosaClientes);
    const pagosProveedoresViejos = await obtenerPagos(grdPagosaProveedores);
    const datosGeneralesViejos = obtenerDatosGeneralesDelPedido();

    const datosPedido = await ObtenerDatosPedido(idPedido);
    if (!datosPedido) return;

    await cargarDataTableProductos(datosPedido.productos);
    await cargarDataTablePagoaProveedores(datosPedido.pagosaProveedores);
    await cargarDataTablePagoaClientes(datosPedido.pagosClientes);
    cargarDatosGeneralesDelPedido(datosPedido.pedido);

    const productosNuevos = obtenerProductos(grdProductos);
    const pagosClientesNuevos = obtenerPagos(grdPagosaClientes);
    const pagosProveedoresNuevos = await obtenerPagos(grdPagosaProveedores);
    const datosGeneralesNuevos = obtenerDatosGeneralesDelPedido();

    compararYAnimarCambios(productosViejos, productosNuevos, grdProductos, 'producto');
    compararYAnimarCambios(pagosClientesViejos, pagosClientesNuevos, grdPagosaClientes, 'pagoCliente');
    compararYAnimarCambios(pagosProveedoresViejos, pagosProveedoresNuevos, grdPagosaProveedores, 'pagoProveedor');
    compararYActualizarDatosGenerales(datosGeneralesViejos, datosGeneralesNuevos);


    mostrarTooltipNotificacion(`Pedido #${idPedido} modificado por ${data.usuario}`);
}

function cargarDatosGeneralesDelPedido(datos) {
    if (datos.Fecha) {
        const nuevaFecha = moment(datos.Fecha, 'YYYY-MM-DD').format('YYYY-MM-DD');
        if ($("#fechaPedido").val() !== nuevaFecha) {
            $("#fechaPedido").val(nuevaFecha);
            mostrarTooltipCampoModificado("fechaPedido", "Fecha actualizada");
        }
    }

    if (datos.FechaEntrega) {
        const nuevaFechaEntrega = moment(datos.FechaEntrega, 'YYYY-MM-DD').format('YYYY-MM-DD');
        if ($("#fechaEntrega").val() !== nuevaFechaEntrega) {
            $("#fechaEntrega").val(nuevaFechaEntrega);
            mostrarTooltipCampoModificado("fechaEntrega", "Fecha de entrega actualizada");
        }
    }

    if (datos.NroRemito && $("#nroRemito").val() !== datos.NroRemito) {
        $("#nroRemito").val(datos.NroRemito);
        mostrarTooltipCampoModificado("nroRemito", "N° de Partida actualizado");
    }

    if (datos.IdZona && $("#Zonas").val() !== String(datos.IdZona)) {
        $("#Zonas").val(datos.IdZona).trigger("change");
        mostrarTooltipCampoModificado("Zonas", "Zona actualizada");
    }

    if (datos.IdChofer && $("#Choferes").val() !== String(datos.IdChofer)) {
        $("#Choferes").val(datos.IdChofer).trigger("change");
        mostrarTooltipCampoModificado("Choferes", "Chofer actualizado");
    }

    if (datos.CostoFlete != null) {
        const nuevoFlete = formatoMoneda.format(datos.CostoFlete.toFixed(2));
        if ($("#costoFlete").val() !== nuevoFlete) {
            $("#costoFlete").val(nuevoFlete);
            mostrarTooltipCampoModificado("costoFlete", "Costo Flete actualizado");
        }
    }

    if (datos.Estado && $("#estado").val() !== datos.Estado) {
        $("#estado").val(datos.Estado);
        mostrarTooltipCampoModificado("estado", "Estado actualizado");
    }

    if (datos.Observacion != null && $("#observacion").val() !== datos.Observacion) {
        $("#observacion").val(datos.Observacion);
        mostrarTooltipCampoModificado("observacion", "Observación actualizada");
    }
}

function mostrarTooltipCampoModificado(idCampo, mensajeExtra = "") {
    const campo = document.getElementById(idCampo);
    if (!campo) return;

    // Obtener label del campo si existe
    const label = document.querySelector(`label[for='${idCampo}']`);
    const nombreCampo = label ? label.innerText.trim() : idCampo;

    const mensaje = `${mensajeExtra}`;

    toastr.success(mensaje, "Pedido actualizado", {
        timeOut: 3000,
        positionClass: "toast-bottom-right",
        progressBar: true,
        toastClass: "toastr ancho-personalizado"
    });

    try {
        const audio = new Audio("/sonidos/actualizacion.mp3");
        audio.volume = 0.2;
        audio.play().catch(() => { });
    } catch (e) { }
}

function obtenerDatosGeneralesDelPedido() {
    return {
        fecha: $("#fechaPedido").val(),
        fechaEntrega: $("#fechaEntrega").val(),
        nroRemito: $("#nroRemito").val(),
        costoFlete: $("#costoFlete").val(),
        zona: $("#Zonas").val(),
        chofer: $("#Choferes").val(),
        estado: $("#estado").val(),
        observacion: $("#observacion").val(),

        idCliente: $("#Clientes").val(),
        NombreCliente: $("#Clientes option:selected").text(),
        direccionCliente: $("#direccionCliente").val(),
        telefonoCliente: $("#telefonoCliente").val(),
        dniCliente: $("#dniCliente").val(),

        idProveedor: $("#Proveedores").val(),
        NombreProveedor: $("#Proveedores option:selected").text(),
        apodoProveedor: $("#apodoProveedor").val(),
        telefonoProveedor: $("#telefonoProveedor").val(),
        direccionProveedor: $("#direccionProveedor").val()
    };
}

function compararYActualizarDatosGenerales(viejo, nuevo) {
    const mapaIds = {
        fecha: "fechaPedido",
        fechaEntrega: "fechaEntrega",
        nroRemito: "nroRemito",
        costoFlete: "costoFlete",
        zona: "Zonas",
        chofer: "Choferes",
        estado: "estado",
        observacion: "observacion",
        idCliente: "Clientes",
        direccionCliente: "direccionCliente",
        telefonoCliente: "telefonoCliente",
        dniCliente: "dniCliente",
        idProveedor: "Proveedores",
        apodoProveedor: "apodoProveedor",
        telefonoProveedor: "telefonoProveedor",
        direccionProveedor: "direccionProveedor"
    };

    let huboCambios = false;

    for (const campo in nuevo) {
        const nuevoValor = nuevo[campo];
        const viejoValor = viejo[campo];

        if (
            nuevoValor !== undefined &&
            nuevoValor !== null &&
            nuevoValor !== "" &&
            nuevoValor !== viejoValor
        ) {
            const $input = $(`#${mapaIds[campo]}`);
            $input.val(nuevoValor);
            animarCambioCampo($input);
            huboCambios = true;
        }
    }

    if (huboCambios) {
        calcularDatosPedido();
    }

    
}

function animarCambioCampo($elemento) {
    $elemento
        .css("transition", "all 0.3s ease")
        .css("box-shadow", `0 0 6px 3px #ffc107`)
        .css("border-color", "#ffc107");

    setTimeout(() => {
        $elemento.css("box-shadow", "").css("border-color", "");
    }, 2000);
}

function compararYAnimarCambios(viejos, nuevos, grid, tipo) {
    const usarSoloId = tipo === "pagoCliente" || tipo === "pagoProveedor";
    const usarIdProducto = tipo === "producto";

    const clave = (x) => usarIdProducto ? x.IdProducto : x.Id;

    const mapViejos = new Map(viejos.map(x => [clave(x), x]));
    const mapNuevos = new Map(nuevos.map(x => [clave(x), x]));

    const agregados = [];
    const eliminados = [];
    const modificados = [];

    nuevos.forEach(nuevo => {
        const id = clave(nuevo);
        const viejo = mapViejos.get(id);

        if (!viejo) {
            agregados.push(nuevo);
        } else if (!sonIgualesCamposClave(viejo, nuevo, tipo)) {
        modificados.push(nuevo);
    }
    });

    viejos.forEach(viejo => {
        const id = clave(viejo);
        if (!mapNuevos.has(id)) {
            eliminados.push(viejo);
        }
    });

    // Animar filas individualmente
    agregados.forEach(x => animarFilaPorCambio(grid, clave(x), "agregado"));
    modificados.forEach(x => animarFilaPorCambio(grid, clave(x), "modificado"));
    eliminados.forEach(x => animarFilaPorCambio(grid, clave(x), "eliminado"));

    // Mostrar un solo toastr por grupo
    if (agregados.length > 0) {
        mostrarToastrAgrupado("success", tipo, "agregado", agregados.length);
        calcularDatosPedido();
    }

    if (modificados.length > 0) {
        mostrarToastrAgrupado("warning", tipo, "modificado", modificados.length);
        calcularDatosPedido();
    }

    if (eliminados.length > 0) {
        mostrarToastrAgrupado("error", tipo, "eliminado", eliminados.length);
        calcularDatosPedido();
    }

}

function obtenerNombreEntidadPlural(tipo) {
    switch (tipo) {
        case "producto": return "productos";
        case "pagoProveedor": return "pagos de proveedor";
        case "pagoCliente": return "pagos de cliente";
        default: return "elementos";
    }
}

function obtenerVerboAccion(accion) {
    switch (accion) {
        case "agregado": return "agregaron";
        case "modificado": return "modificaron";
        case "eliminado": return "eliminaron";
        default: return "";
    }
}

function mostrarToastrAgrupado(tipoToastr, tipoEntidad, accion, cantidad) {
    const nombreEntidad = obtenerNombreEntidadPlural(tipoEntidad);
    const verbo = obtenerVerboAccion(accion);

    toastr[tipoToastr](
        `Se ${verbo} ${cantidad} ${nombreEntidad}.`,
        "Pedido actualizado",
        estiloToastr(tipoToastr === "error")
    );
}

function mostrarToastr(tipoToast, tipo, obj, accion) {
    const nombre = obtenerNombreElemento(obj, tipo);
    const acciones = {
        "agregado": `Se agregó ${nombre}`,
        "modificado": `Se modificó ${nombre}`,
        "eliminado": `Se eliminó ${nombre}`
    };

    const opciones = {
        timeOut: 5000,
        positionClass: "toast-bottom-right",
        progressBar: true,
        toastClass: "toastr ancho-personalizado"
    };

    switch (tipoToast) {
        case "success":
            toastr.success(acciones[accion], "Pedido actualizado", opciones);
            break;
        case "warning":
            toastr.warning(acciones[accion], "Pedido actualizado", opciones);
            break;
        case "error":
            toastr.error(acciones[accion], "Pedido actualizado", opciones);
            break;
    }
}

function sonIgualesCamposClave(a, b, tipo) {
    switch (tipo) {
        case "producto":
            return a.IdProducto === b.IdProducto &&
                a.Cantidad === b.Cantidad &&
                a.PrecioUnitario === b.PrecioUnitario;
        case "pagoCliente":
        case "pagoProveedor":
            return a.TotalArs === b.TotalArs &&
                a.Observacion === b.Observacion &&
                a.IdMoneda === b.IdMoneda &&
                a.Fecha === b.Fecha;
            a.Cotizacion === b.Cotizacion;
        default:
            return JSON.stringify(a) === JSON.stringify(b);
    }
}

function obtenerNombreElemento(obj, tipo) {
    switch (tipo) {
        case "producto":
            return `"${obj.NombreProducto || obj.Descripcion || obj.Nombre || 'producto desconocido'}"`;
        case "pagoProveedor":
            const nombreProveedor = $("#Proveedores option:selected").text() || 'desconocido';
            return `el pago del proveedor "${nombreProveedor}"`;
        case "pagoCliente":
            const nombreCliente = $("#Clientes option:selected").text() || 'desconocido';
            return `el pago del cliente "${nombreCliente}"`;
        default:
            return `"desconocido"`;
    }
}

function estiloToastr(error = false) {
    return {
        timeOut: 3500,
        positionClass: "toast-bottom-right",
        progressBar: true,
        toastClass: error ? "toastr ancho-personalizado bg-danger" : "toastr ancho-personalizado"
    };
}

function animarFilaPorCambio(tabla, idFila, tipo) {
    let clase = "";

    if (tipo === "agregado") clase = "zoom-green-highlight";
    else if (tipo === "modificado") clase = "zoom-green-highlight";
    else if (tipo === "eliminado") clase = "zoom-green-highlight"; // si tenés una clase propia para eliminar

    const fila = tabla.row(function (idx, data) {
        return data.Id == idFila;
    });

    if (fila.node()) {
        const nodo = $(fila.node());
        nodo.addClass(clase);
        setTimeout(() => nodo.removeClass(clase), 2000);
    }
}


function mostrarTooltipNotificacion(texto) {
    toastr.success(texto, "Pedidos", {
        timeOut: 5000,
        positionClass: "toast-bottom-right",
        progressBar: true,
        toastClass: "toastr ancho-personalizado"
    });
}

