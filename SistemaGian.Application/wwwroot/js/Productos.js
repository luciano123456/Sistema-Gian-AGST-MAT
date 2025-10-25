let gridProductos;
var selectedProductos = [];
let idProveedorFiltro = -1, idClienteFiltro = -1;
let proveedorVisible = false;
let isEditing = false;


var userSession = JSON.parse(localStorage.getItem('userSession'));

const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaProveedoresFilter }, // Columna con un filtro de selección (de provincias)
    { index: 3, filterType: 'select', fetchDataFunc: listaMarcasFilter }, // Columna con un filtro de selección (de provincias)
    { index: 4, filterType: 'select', fetchDataFunc: listaCategoriasFilter }, // Columna con un filtro de selección (de provincias)
    { index: 5, filterType: 'select', fetchDataFunc: listaUnidadesDeMedidaFilter }, // Columna con un filtro de selección (de provincias)
    { index: 6, filterType: 'text' }, // Columna con un filtro de selección (de provincias)
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'text' },
    { index: 9, filterType: 'text' },
    { index: 10, filterType: 'text' },
    { index: 11, filterType: 'text' },
    { index: 12, filterType: 'text' },
    { index: 13, filterType: 'text' },
    { index: 14, filterType: 'text' },
    { index: 15, filterType: 'text' },
    { index: 16, filterType: 'text' },
    { index: 17, filterType: 'text' },
    { index: 18, filterType: 'text' },
    { index: 19, filterType: 'text' },
];

const Modelo_base = {
    Id: 0,
    Descripcion: "",
    PCosto: "0",
    PVenta: "0",
    PorcGanancia: "0",
}

$(document).ready(() => {

    inicializarSonidoNotificacion();

    document.addEventListener("touchstart", desbloquearAudio, { once: true });
    document.addEventListener("click", desbloquearAudio, { once: true });

    listaProductos();
    listaProductosFiltro();
    listaProveedoresFiltro();
    listaClientesFiltro();


    initToggleFiltrosPersistenteProductos();

    $("#Proveedoresfiltro, #clientesfiltro, #Productosfiltro").select2({
        placeholder: "Selecciona una opción",
        allowClear: false
    });

    $('#txtDescripcion, #txtPorcentajeGanancia').on('input', function () {
        validarCampos()
    });
    $('#txtAumentoPrecioCosto').on('input', function () {
        validarCamposAumentarPrecioCosto()
    });

    $('#txtAumentoPrecioVenta').on('input', function () {
        validarCamposAumentarPrecioVenta()
    });

    $('#txtBajaPrecioCosto').on('input', function () {
        validarCamposBajarPrecioCosto()
    });

    $('#txtBajaPrecioVenta').on('input', function () {
        validarCamposBajarPrecioVenta()
    });


    $('#txtPrecioCosto').on('input', function () {
        validarCampos()
        sumarPorcentaje()
    });

    $('#txtProductoCantidad').on('input', function () {
        validarCampos()
        sumarPorcentaje()
    });

    $('#txtPorcentajeGanancia').on('input', function () {
        sumarPorcentaje()
    });

    $('#txtPrecioVenta').on('input', function () {
        calcularPorcentaje()
        calcularTotal()
    });

    $('#Proveedoresfiltro, #clientesfiltro, #Productosfiltro').on('change', function () {
        validarProductosFiltro()
    });


})

function validarProductosFiltro() {
    const idCliente = document.getElementById("clientesfiltro").value;
    const idProveedor = document.getElementById("Proveedoresfiltro").value;

    if (idCliente == -1 && idProveedor == -1) {
        $('#Productosfiltro').prop('disabled', false)
    } else {
        $('#Productosfiltro').prop('disabled', true)
        $('#Productosfiltro').val("-1").trigger('change.select2'); // Setea a -1
    }
}

// Define la función handleCheckboxClick
function handleCheckboxClick() {
    var icon = $(this).find('.fa');
    icon.toggleClass('checked');

    var checkboxIndex = $('.custom-checkbox').index($(this));
    var ventaId = $(this).data('id');

    if (icon.hasClass('checked')) {
        icon.removeClass('fa-square-o');
        icon.addClass('fa-check-square');
        selectedProductos.push(ventaId);
    } else {
        icon.removeClass('fa-check-square');
        icon.addClass('fa-square-o');
        var indexToRemove = selectedProductos.indexOf(ventaId);
        if (indexToRemove !== -1) {
            selectedProductos.splice(indexToRemove, 1);
        }
    }



    if (selectedProductos.length > 0 && idProveedorFiltro <= 0 && idClienteFiltro <= 0) {
        document.getElementById("btnAsignarProveedor").removeAttribute("hidden");
        document.getElementById("btnDuplicar").removeAttribute("hidden");
    } else {
        document.getElementById("btnAsignarProveedor").setAttribute("hidden", "hidden");
        document.getElementById("btnDuplicar").setAttribute("hidden", "hidden");
    }

    if (selectedProductos.length > 0 && idProveedorFiltro > 0 && idClienteFiltro <= 0) {
        document.getElementById("btnAsignarCliente").removeAttribute("hidden");
    } else {
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
    }

    if (selectedProductos.length > 0) {
        document.getElementById("btnAumentarPrecios").removeAttribute("hidden");
        document.getElementById("btnBajarPrecios").removeAttribute("hidden");
    } else {
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");
    }


    console.log(selectedProductos);
}


function desmarcarCheckboxes() {
    // Obtener todos los elementos con la clase 'custom-checkbox' dentro de la tabla
    var checkboxes = gridProductos.cells('.custom-checkbox').nodes(); // Utiliza 'cells' para obtener las celdas en lugar de 'column'

    // Iterar sobre cada checkbox y desmarcarlo
    for (var i = 0; i < checkboxes.length; i++) {
        var icon = $(checkboxes[i]).find('.fa');

        // Desmarcar el checkbox
        icon.removeClass('fa-check-square');
        icon.addClass('fa-square-o');

        // Asegurarse de que la clase 'checked' esté eliminada
        icon.removeClass('checked');
    }

    // Limpiar el array de IDs seleccionados
    selectedProductos = [];

    // Ocultar el botón
    document.getElementById("btnAsignarProveedor").removeAttribute("hidden");
    document.getElementById("btnDuplicar").removeAttribute("hidden");
}

function sumarPorcentaje() {
    let precioCosto = Number($("#txtPrecioCosto").val());
    let porcentajeGanancia = Number($("#txtPorcentajeGanancia").val());
    let productoCantidad = Number($("#txtProductoCantidad").val());

    if (!isNaN(precioCosto) && !isNaN(porcentajeGanancia)) {
        let precioVenta = precioCosto + (precioCosto * (porcentajeGanancia / 100));
        let total = precioVenta * productoCantidad
        // Limitar el precio de venta a 2 decimales
        precioVenta = precioVenta.toFixed(2);
        $("#txtPrecioVenta").val(precioVenta);
        $("#txtTotal").val(total);
        calcularTotal();
    }
}

function calcularTotal() {
    let precioCosto = Number($("#txtPrecioCosto").val());
    let porcentajeGanancia = Number($("#txtPorcentajeGanancia").val());
    let productoCantidad = Number($("#txtProductoCantidad").val());

    if (!isNaN(precioCosto) && !isNaN(porcentajeGanancia)) {
        let precioVenta = precioCosto + (precioCosto * (porcentajeGanancia / 100));
        let total = precioVenta * productoCantidad
        // Limitar el precio de venta a 2 decimales
        $("#txtTotal").val(total);
    }
}

function calcularPorcentaje() {
    let precioCosto = Number($("#txtPrecioCosto").val());
    let precioVenta = Number($("#txtPrecioVenta").val());



    if (!isNaN(precioCosto) && !isNaN(precioVenta) && precioCosto !== 0) {
        let porcentajeGanancia = ((precioVenta - precioCosto) / precioCosto) * 100;
        // Limitar el porcentaje de ganancia a 2 decimales
        porcentajeGanancia = porcentajeGanancia.toFixed(2);
        $("#txtPorcentajeGanancia").val(porcentajeGanancia);
    }
}


async function listaProductosFiltro() {
    const url = `/Productos/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Productosfiltro option').remove();

    selectProveedores = document.getElementById("Productosfiltro");

    option = document.createElement("option");
    option.value = -1;
    option.text = "-";
    selectProveedores.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Descripcion;
        selectProveedores.appendChild(option);

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

async function aplicarFiltrosSignalR() {
    var validacionFiltros = validarFiltros();
    if (!validacionFiltros) {
       
        const idCliente = document.getElementById("clientesfiltro").value;
        const idProveedor = document.getElementById("Proveedoresfiltro").value;
        const producto = document.getElementById("Productosfiltro").value;

        idClienteFiltro = idCliente;
        idProveedorFiltro = idProveedor;

        const url = `Productos/ListaProductosFiltro?idCliente=${idCliente}&idProveedor=${idProveedor}&producto=${producto}`;

        fetch(url, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
        try {
            const response = await fetch(url);

            if (!response.ok) throw new Error(response.statusText);

            const dataJson = await response.json();

            await configurarDataTable(dataJson);

        } catch (error) {
            console.error('Error:', error);
        }

    } else {
        errorModal(validacionFiltros)
    }
}


async function aplicarFiltros() {
    var validacionFiltros = validarFiltros();
    if (!validacionFiltros) {
      
        const idCliente = document.getElementById("clientesfiltro").value;
        const idProveedor = document.getElementById("Proveedoresfiltro").value;
        const producto = document.getElementById("Productosfiltro").value;

        idClienteFiltro = idCliente;
        idProveedorFiltro = idProveedor;

        document.getElementById("btnAsignarProveedor").setAttribute("hidden", "hidden");
        document.getElementById("btnDuplicar").setAttribute("hidden", "hidden");
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");

        if (idClienteFiltro > 0 || idProveedorFiltro > 0) {
            document.getElementById("btnNuevo").setAttribute("hidden", "hidden");
        } else {
            document.getElementById("btnNuevo").removeAttribute("hidden");
        }


        if (producto > 0) {
            await actualizarVisibilidadProveedor(false);
            gridProductos.column(2).visible(true);
            gridProductos.column(0).visible(false);

        } else {
            await actualizarVisibilidadProveedor(false);
            gridProductos.column(2).visible(false);
            gridProductos.column(0).visible(true);
            //await actualizarVisibilidadProveedor(false);
        }

        selectedProductos = [];

        const url = `Productos/ListaProductosFiltro?idCliente=${idCliente}&idProveedor=${idProveedor}&producto=${producto}`;

        fetch(url, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
        try {
            const response = await fetch(url);

            if (!response.ok) throw new Error(response.statusText);

            const dataJson = await response.json();

             configurarDataTable(dataJson);

        } catch (error) {
            console.error('Error:', error);
        }

    } else {
        errorModal(validacionFiltros)
    }
}

async function duplicarProducto(id) {
    let resultado = window.confirm("¿Desea duplicar el Producto?");

    if (resultado) {
        try {
            const response = await fetch(`Productos/DuplicarProducto?idProducto=${id}`, {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error("Error al duplicar el Producto.");
            }

            const dataJson = await response.json();

            if (dataJson) {
                listaProductos();
                exitoModal("Producto duplicado correctamente")
            } else {
                errorModal("Ha ocurrido un error al duplicar el producto");
            }
        } catch (error) {
            errorModal("Ha ocurrido un error al duplicar el producto");
        }
    }
}


function duplicarProductos() {
    const cantidad = selectedProductos.length;

    if (cantidad === 0) {
        errorModal("No hay productos seleccionados para duplicar.");
        return;
    }

    const confirmacion = confirm(`¿Estás seguro de que deseas duplicar ${cantidad} producto(s)?`);

    if (!confirmacion) return;

    const nuevoModelo = {
        productos: JSON.stringify(selectedProductos),
    };

    const url = "Productos/DuplicarProductos";
    const method = "POST";

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
            if (dataJson) {
                const mensaje = "Productos duplicados correctamente";
                exitoModal(mensaje);
                aplicarFiltros();
            } else {
                const mensaje = "Ha ocurrido un error al duplicar los productos";
                errorModal(mensaje);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}


function asignarProveedores() {
    // Obtener los proveedores seleccionados
    const checkboxes = document.querySelectorAll('#contenedorProveedores input[type="checkbox"]:checked');
    const idsProveedores = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (idsProveedores.length === 0) {
        errorModal("Debe seleccionar al menos un proveedor.");
        return;
    }

    const nuevoModelo = {
        productos: JSON.stringify(selectedProductos),
        idProveedores: idsProveedores // Enviamos lista
    };

    fetch("Productos/AsignarProveedor", {
        method: "POST",
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
        if (dataJson != null) {
            exitoModal("Proveedores asignados correctamente");
        } else {
            errorModal("Ha ocurrido un error al asignar los proveedores");
        }

        $("#modalProveedores").modal("hide");
        // listaProductos(); // Si querés refrescar
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function aumentarPrecios() {

    if (validarCamposAumentarPrecioCosto && validarCamposAumentarPrecioVenta) {


        const nuevoModelo = {
            productos: JSON.stringify(selectedProductos),
            idProveedor: idProveedorFiltro,
            idCliente: idClienteFiltro,
            PorcentajeCosto: document.getElementById("txtAumentoPrecioCosto").value,
            PorcentajeVenta: document.getElementById("txtAumentoPrecioVenta").value

        };

        const url = "Productos/AumentarPrecios";
        const method = "POST";

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
                const mensaje = "Precios aumentados correctamente";
                exitoModal(mensaje);
                $("#modalAumentar").modal("hide");
                listaProductos();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos')
    }
}

function bajarPrecios() {

    if (validarCamposBajarPrecioCosto && validarCamposBajarPrecioVenta) {
        const nuevoModelo = {
            productos: JSON.stringify(selectedProductos),
            idProveedor: idProveedorFiltro,
            idCliente: idClienteFiltro,
            PorcentajeCosto: document.getElementById("txtBajaPrecioCosto").value,
            PorcentajeVenta: document.getElementById("txtBajaPrecioVenta").value

        };

        const url = "Productos/BajarPrecios";
        const method = "POST";

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
                const mensaje = "Precios bajados correctamente";
                exitoModal(mensaje);
                $("#modalBajar").modal("hide");
                listaProductos();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos')
    }
}


function asignarClientes() {
    const checkboxes = document.querySelectorAll('#contenedorClientes input[type="checkbox"]:checked');
    const idsClientes = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (idsClientes.length === 0) {
        errorModal("Debe seleccionar al menos un cliente.");
        return;
    }

    const nuevoModelo = {
        productos: JSON.stringify(selectedProductos),
        idProveedor: idProveedorFiltro,
        idClientes: idsClientes
    };

    fetch("Productos/AsignarCliente", {
        method: "POST",
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
            if (dataJson) {
                exitoModal("Clientes asignados correctamente");
            } else {
                errorModal("Ocurrió un error al asignar los clientes");
            }

            $("#modalClientes").modal("hide");
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function guardarCambios() {
    if (validarCampos()) {
        calcularTotal();
        let productoCantidad = $("#txtProductoCantidad").val();
        const idProducto = $("#txtId").val();
        const nuevoModelo = {
            IdCliente: idClienteFiltro,
            IdProveedor: idProveedorFiltro,
            "Id": idProducto !== "" ? idProducto : 0,
            "Descripcion": $("#txtDescripcion").val(),
            "IdMarca": $("#Marcas").val(),
            "IdCategoria": $("#Categorias").val(),
            "IdMoneda": $("#Monedas").val(),
            "IdUnidadDeMedida": $("#UnidadesDeMedidas").val(),
            "PCosto": parseDecimal($("#txtPrecioCosto").val()),
            "PVenta": parseDecimal($("#txtPrecioVenta").val()),
            "PorcGanancia": parseDecimal($("#txtPorcentajeGanancia").val()),
            "Peso": parseDecimal($("#txtProductoPeso").val()),
            "ProductoCantidad": (isNaN(productoCantidad) || productoCantidad === null || productoCantidad.trim() === "") ? 1 : parseFloat(productoCantidad),
            "Image": null,
            "Activo": idProducto !== "" ? $("#txtActivo").val() : 1,
        };

        const url = idProducto === "" ? "Productos/Insertar" : "Productos/Actualizar";
        const method = idProducto === "" ? "POST" : "PUT";

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
                const mensaje = idProducto === "" ? "Producto registrado correctamente" : "Producto modificado correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                listaProductos();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}


function validarCamposAumentarPrecioCosto() {
    const aumento = $("#txtAumentoPrecioCosto").val();

    const aumentoValido = aumento !== "";

    $("#lblAumentoPrecioCosto").css("color", aumentoValido ? "" : "red");
    $("#txtAumentoPrecioCosto").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}

function validarCamposAumentarPrecioVenta() {
    const aumento = $("#txtAumentoPrecioVenta").val();

    const aumentoValido = aumento !== "";

    $("#lblAumentoPrecioVenta").css("color", aumentoValido ? "" : "red");
    $("#txtAumentoPrecioVenta").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}


function validarCamposBajarPrecioCosto() {
    const aumento = $("#txtAumentoPrecioCosto").val();

    const aumentoValido = aumento !== "";

    $("#lblBajaPrecioCosto").css("color", aumentoValido ? "" : "red");
    $("#txtBajaPrecioCosto").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}

function validarCamposBajarPrecioVenta() {
    const aumento = $("#txtAumentoPrecioVenta").val();

    const aumentoValido = aumento !== "";

    $("#lblBajaPrecioVenta").css("color", aumentoValido ? "" : "red");
    $("#txtBajaPrecioVenta").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}

function validarCampos() {
    const descripcion = $("#txtDescripcion").val();
    const precioCosto = $("#txtPrecioCosto").val();
    const precioVenta = $("#txtPrecioVenta").val();
    const porcentajeGanancia = $("#txtPorcentajeGanancia").val();

    const descripcionValida = descripcion !== "";
    const precioCostoValido = precioCosto !== "" && !isNaN(precioCosto);
    const precioVentaValido = precioVenta !== "" && !isNaN(precioVenta);
    const porcentajeGananciaValido = porcentajeGanancia !== "" && !isNaN(porcentajeGanancia);

    $("#lblDescripcion").css("color", descripcionValida ? "" : "red");
    $("#txtDescripcion").css("border-color", descripcionValida ? "" : "red");

    $("#lblPrecioCosto").css("color", precioCostoValido ? "" : "red");
    $("#txtPrecioCosto").css("border-color", precioCostoValido ? "" : "red");

    $("#lblPorcentajeGanancia").css("color", porcentajeGananciaValido ? "" : "red");
    $("#txtPorcentajeGanancia").css("border-color", porcentajeGananciaValido ? "" : "red");

    return descripcionValida && precioCostoValido && precioVentaValido && porcentajeGananciaValido;
}

function validarFiltros() {
    let mensaje = "";

    const idCliente = document.getElementById("clientesfiltro").value;
    const idProveedor = document.getElementById("Proveedoresfiltro").value;
    if (idCliente > 0 && idProveedor <= 0) {
        mensaje = "No puedes filtrar por un cliente sin proveedor."
    }

    return mensaje
}

function nuevoProducto() {

    limpiarModal();
    listaMarcas();
    listaCategorias();
    listaMonedas();
    listaUnidadesDeMedida();
    document.getElementById("Marcas").removeAttribute("disabled");
    document.getElementById("txtDescripcion").removeAttribute("disabled");
    document.getElementById("Categorias").removeAttribute("disabled");
    document.getElementById("Monedas").removeAttribute("disabled");
    //document.getElementById("Imagen").removeAttribute("disabled");
    document.getElementById("UnidadesDeMedidas").removeAttribute("disabled");
    document.getElementById("txtPrecioCosto").classList.remove("txtEdicion");
    document.getElementById("txtPorcentajeGanancia").classList.remove("txtEdicion");
    document.getElementById("txtPrecioVenta").classList.remove("txtEdicion");
    document.getElementById('txtTotal').setAttribute('hidden', 'hidden');
    document.getElementById('lblTotal').setAttribute('hidden', 'hidden');
    document.getElementById('divProductoCantidad').setAttribute('hidden', 'hidden');
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Producto");
    asignarCamposObligatorios()
}

function asignarCamposObligatorios() {
    $('#lblDescripcion').css('color', 'red');
    $('#txtDescripcion').css('border-color', 'red');
    $('#lblPrecioCosto').css('color', 'red');
    $('#txtPrecioCosto').css('border-color', 'red');
    $('#lblPorcentajeGanancia').css('color', 'red');
    $('#txtPorcentajeGanancia').css('border-color', 'red');
}

async function mostrarModal(modelo) {
    const idCliente = document.getElementById("clientesfiltro").value;
    const idProveedor = document.getElementById("Proveedoresfiltro").value;

    if (modelo.Descripcion && modelo.Descripcion.toLowerCase().includes("hierro")) {
        document.getElementById("divPeso").removeAttribute("hidden");
    } else {
        document.getElementById("divPeso").setAttribute("hidden", true);
    }

    if (idProveedor > 0 || idCliente > 0) {
        document.getElementById("Marcas").setAttribute("disabled", "disabled");
        document.getElementById("txtDescripcion").setAttribute("disabled", "disabled");
        document.getElementById("Categorias").setAttribute("disabled", "disabled");
        document.getElementById("Monedas").setAttribute("disabled", "disabled");
        document.getElementById("UnidadesDeMedidas").setAttribute("disabled", "disabled");
        document.getElementById("txtPrecioCosto").classList.add("txtEdicion");
        document.getElementById("txtPorcentajeGanancia").classList.add("txtEdicion");
        document.getElementById("txtPrecioVenta").classList.add("txtEdicion");
        //document.getElementById("Imagen").setAttribute("disabled", "disabled");
    } else {
        document.getElementById("Marcas").removeAttribute("disabled");
        document.getElementById("txtDescripcion").removeAttribute("disabled");
        document.getElementById("Categorias").removeAttribute("disabled");
        document.getElementById("Monedas").removeAttribute("disabled");
        //document.getElementById("Imagen").removeAttribute("disabled");
        document.getElementById("UnidadesDeMedidas").removeAttribute("disabled");
        document.getElementById("txtPrecioCosto").classList.remove("txtEdicion");
        document.getElementById("txtPorcentajeGanancia").classList.remove("txtEdicion");
        document.getElementById("txtPrecioVenta").classList.remove("txtEdicion");

    }
    const campos = ["Id", "Descripcion", "PrecioCosto", "PrecioVenta", "PorcentajeGanancia", "Activo"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });

    await listaMarcas();
    await listaCategorias();
    await listaMonedas();
    await listaUnidadesDeMedida();


    //$("#imgProducto").attr("src", "data:image/png;base64," + modelo.Image);
    //$("#imgProd").val(modelo.Image);
    document.getElementById("txtPrecioCosto").value = modelo.PCosto;
    document.getElementById("txtPrecioVenta").value = modelo.PVenta;
    document.getElementById("txtPorcentajeGanancia").value = modelo.PorcGanancia;
    document.getElementById("Marcas").value = modelo.IdMarca;
    document.getElementById("Categorias").value = modelo.IdCategoria;
    document.getElementById("Monedas").value = modelo.IdMoneda;
    document.getElementById("UnidadesDeMedidas").value = modelo.IdUnidadDeMedida;


    document.getElementById('txtProductoCantidad').value = modelo.ProductoCantidad;
    document.getElementById('txtProductoPeso').value = modelo.Peso;

    document.getElementById('txtTotal').value = (modelo.PVenta * modelo.ProductoCantidad);


    actualizarProductoCantidad();

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Producto");

    validarCampos();
}




function limpiarModal() {
    const campos = ["Id", "Descripcion", "PrecioCosto", "PrecioVenta", "PorcentajeGanancia"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    //$("#imgProducto").attr("src", "");
    //$("#imgProd").val("");

}



async function listaProductos() {


    let paginaActual = gridProductos != null ? gridProductos.page() : 0;
    
    if (idClienteFiltro > 0 || idProveedorFiltro > 0) {
        aplicarFiltros();

    } else {

        document.getElementById("btnAsignarProveedor").setAttribute("hidden", "hidden");
        document.getElementById("btnDuplicar").setAttribute("hidden", "hidden");
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");


        selectedProductos = [];

        const url = `/Productos/Lista`;
        const response = await fetch(url);
        const data = await response.json();


        await configurarDataTable(data);
    }
    if (paginaActual > 0) gridProductos.page(paginaActual).draw('page');



}

async function listaMarcas() {
    const url = `/Marcas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Marcas option').remove();

    selectProvincias = document.getElementById("Marcas");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}



async function listaMarcasFilter() {
    const url = `/Marcas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(provincia => ({
        Id: provincia.Id,
        Nombre: provincia.Nombre
    }));

}


async function listaCategorias() {
    const url = `/Categorias/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Categorias option').remove();

    selectProvincias = document.getElementById("Categorias");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

async function listaCategoriasFilter() {
    const url = `/Categorias/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(categoria => ({
        Id: categoria.Id,
        Nombre: categoria.Nombre
    }));

}


async function listaMonedas() {
    const url = `/Monedas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Monedas option').remove();

    selectProvincias = document.getElementById("Monedas");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

async function listaMonedasFilter() {
    const url = `/Monedas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(moneda => ({
        Id: moneda.Id,
        Nombre: moneda.Nombre
    }));

}

async function listaUnidadesDeMedida() {
    const url = `/UnidadesDeMedidas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#UnidadesDeMedidas option').remove();

    selectProvincias = document.getElementById("UnidadesDeMedidas");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

async function listaUnidadesDeMedidaFilter() {
    const url = `/UnidadesDeMedidas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(UnidadesDeMedida => ({
        Id: UnidadesDeMedida.Id,
        Nombre: UnidadesDeMedida.Nombre
    }));

}


const editarProducto = id => {
    const idCliente = document.getElementById("clientesfiltro").value;
    const idProveedor = document.getElementById("Proveedoresfiltro").value;
    const url = `Productos/EditarInfo?id=${id}&idCliente=${idCliente}&idProveedor=${idProveedor}`
    fetch(url)
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
        .catch(error => {
            errorModal("Ha ocurrido un error.");
        });
}
async function eliminarProducto(id) {
    let resultado = window.confirm("¿Desea eliminar el Producto?");

    if (resultado) {
        try {
            const response = await fetch(`Productos/Eliminar?id=${id}&idProveedor=${idProveedorFiltro}&idCliente=${idClienteFiltro}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Producto.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaProductos();
                exitoModal("Producto eliminado correctamente")
            }
        } catch (error) {
            errorModal("Ha ocurrido un error al eliminar el producto");
        }
    }
}

async function configurarDataTable(data) {
    if (!gridProductos) {
        gridProductos = $('#grd_Productos').DataTable({
            data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            pageLength: 100,
            colReorder: true,
            stateSave: false,
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Productos',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const columnasPermitidas = [1, 2, 3, 4, 5, 6, 7, 8];
                            const visible = $(node).is(':visible');
                            return columnasPermitidas.includes(idx) && visible;
                        }
                    },
                    className: 'btn-exportar-excel'
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Productos',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const columnasPermitidas = [1, 2, 3, 4, 5, 6, 7, 8];
                            const visible = $(node).is(':visible');
                            return columnasPermitidas.includes(idx) && visible;
                        }
                    },
                    className: 'btn-exportar-pdf'
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const columnasPermitidas = [1, 2, 3, 4, 5, 6, 7, 8];
                            const visible = $(node).is(':visible');
                            return columnasPermitidas.includes(idx) && visible;
                        }
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

            columns: [
                // 0) ACCIONES + seleccionar + drag + menú
              //  {
              //      data: "Id",
              //      title: "",
              //      orderable: false,
              //      searchable: false,
              //      width: "110px",
              //      render: function (data, type, row) {
              //          if (type !== 'display') return data;
              //          return `
              //<div class="d-flex align-items-center gap-1">
              //  <button type="button" class="btn btn-sm chip-select btnacciones" data-id="${row.Id}" aria-pressed="false" title="Seleccionar">
              //    <i class="fa fa-square-o"></i> <span>Elegir</span>
              //  </button>

              //  <i class="fa fa-bars draggable-icon" title="Arrastrar"></i>

              //  <div class="acciones-menu d-inline-block position-relative">
              //    <button type="button" class="btn btn-sm btnacciones" onclick="$(this).siblings('.acciones-dropdown').toggle();" title="Acciones">
              //      <i class="fa fa-ellipsis-v"></i>
              //    </button>
              //    <div class="acciones-dropdown dropdown-menu show" style="display:none; position:absolute;">
              //      <a class="dropdown-item" href="#" onclick="editarProducto(${row.Id}); return false;">
              //        <i class="fa fa-pencil"></i> Editar
              //      </a>
              //      <a class="dropdown-item" href="#" onclick="duplicarProducto(${row.Id}); return false;">
              //        <i class="fa fa-copy"></i> Duplicar
              //      </a>
              //      <a class="dropdown-item text-danger" href="#" onclick="eliminarProducto(${row.Id}); return false;">
              //        <i class="fa fa-trash"></i> Eliminar
              //      </a>
              //    </div>
              //  </div>
              //</div>`;
              //      }
                //  },
                {
                    data: "Id",
                    title: '',
                    width: "1%", // Ancho fijo para la columna
                    render: function (data, type, full) {
                        const isChecked = false;
                        var activo = full.Activo === 1;
                        var color = activo ? "success" : "danger";
                        var titulo = activo ? "Desactivar" : "Activar";
                        var estadoInverso = full.Activo ? 0 : 1;
                        const checkboxClass = isChecked ? 'fa-check-square-o' : 'fa-square-o';
                        const botonApagado = (idClienteFiltro <= 0 && idProveedorFiltro <= 0) ?
                            `<button class='btn btn-sm btnacciones' type='button' onclick='cambiarEstadoProducto(${data},${estadoInverso})' title='${titulo}'>
         <i class='fa fa-power-off fa-lg text-${color}' aria-hidden='true'></i>
     </button>` : '';

                        return `
     <div class="acciones-menu" data-id="${data}">
                    <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                        <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                    </button>
                    <div class="acciones-dropdown" style="display: none;">
                      <button class='btn btn-sm btnDuplicar' type='button' onclick='duplicarProducto(${data})' title='Duplicar'>
                            <i class='fa fa-copy fa-lg text-warning' aria-hidden='true'></i> Duplicar
                        </button>
                        <button class='btn btn-sm btneditar' type='button' onclick='editarProducto(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarProducto(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                     
                    </div>
                 

                                <button type="button" class="btn btn-sm chip-select btnacciones" data-id="${data}" aria-pressed="false" title="Seleccionar">
          <i class="fa fa-square-o"></i> <span>Elegir</span>
        </button>

       <i class="fa fa-hand-rock-o draggable-icon" title="Mover fila"></i>

    </div>
`;

                    },
                    orderable: false,
                    searchable: false,
                },

                // 1..10) datos
                { data: "Descripcion", title: "Descripcion" },
                { data: "Proveedor", title: "Proveedor", visible: false },
                { data: "Marca", title: "Marca" },
                { data: "Categoria", title: "Categoria" },
                { data: "UnidadDeMedida", title: "Unidad de Medida" },
                { data: "PCosto", title: "P. Costo" },
                { data: "PVenta", title: "P. Venta" },
                { data: "ProductoCantidad", title: "Cantidad" },
                { data: "Total", title: "Total" },
                { data: "PorcGanancia", title: "Porc. Ganancia" },

                // 11) ACTIVO con botón power (para activar/desactivar)
                {
                    data: "Activo",
                    title: "Activo",
                    render: function (data, type, row) {
                        // para sort/filter devolvemos 1/0
                        if (type === 'filter' || type === 'sort') {
                            return (data === 1 || data === true) ? '1' : '0';
                        }
                        const on = (data === 1 || data === true);
                        const color = on ? 'text-success' : 'text-danger';
                        const next = on ? 0 : 1;
                        return `
              <button type="button" class="btn btn-sm btnacciones btn-toggle-activo"
                      title="${on ? 'Desactivar' : 'Activar'}"
                      data-id="${row.Id}" data-next="${next}">
                <i class="fa fa-power-off fa-lg ${color}"></i>
              </button>`;
                    }
                },

                // 12..15) IDs ocultos
                { data: "IdMoneda", visible: false },
                { data: "IdMarca", visible: false },
                { data: "IdCategoria", visible: false },
                { data: "IdUnidadDeMedida", visible: false },
            ],

            columnDefs: [
                // formato números
                {
                    targets: [6, 7, 9], // PCosto, PVenta, Total
                    render: function (d, t) {
                        if (t !== 'display') return d;
                        return formatNumber(d);
                    }
                }
            ],

            createdRow: function (row, r) {
                $(row).attr('data-id', r.Id);
                if ((r.Descripcion || '').toLowerCase().includes('copia')) {
                    $(row).addClass('productocopia');
                }
            },

            initComplete: async function () {
                const api = this.api();

                const rebuildDebounced = debounce(() => rebuildFiltersProductos(api), 0);

                // Cuando cambia visibilidad/orden/scroll, reconstruir filtros sincronizados
                api.off('.syncfilters')
                    .on('column-visibility.dt.syncfilters', rebuildDebounced)
                    .on('column-reorder.dt.syncfilters', rebuildDebounced)
                    .on('responsive-resize.dt.syncfilters', rebuildDebounced);

                // 1) Aplicar visibilidad inicial (persistencia) ANTES de crear filtros
                if (typeof configurarOpcionesColumnas === 'function') {
                    try { configurarOpcionesColumnas(api); } catch { /* noop */ }
                }

                // 2) Proveedor oculto por defecto
                await actualizarVisibilidadProveedor(false);

                // 3) (Re)construir la fila de filtros + controles en base a columnas visibles
                await buildFiltersProductos(api);

                // 4) Ajustar anchos ya con todo “armado”
                setTimeout(() => api.columns.adjust().draw(false), 0);

                // 5) KPI inicial
                $('#kpiCantProductos').text(gridProductos.rows({ search: 'applied' }).count());

                // 6) Doble click edición (tu lógica original intacta)
                $('#grd_Productos tbody').off('dblclick.edicion').on('dblclick.edicion', 'td', async function () {
                    var cell = gridProductos.cell(this);
                    var originalData = cell.data();
                    var colIndex = cell.index().column;
                    var rowData = gridProductos.row($(this).closest('tr')).data();

                    if (colIndex == 0) return;

                    const idCliente = document.getElementById("clientesfiltro").value;
                    const idProveedor = document.getElementById("Proveedoresfiltro").value;

                    if (idCliente > 0 || idProveedor > 0) {
                        if (![6, 7, 8, 10].includes(colIndex)) return false;
                    } else {
                        if (![1, 3, 4, 5, 6, 7, 8, 10].includes(colIndex)) return false;
                    }

                    if (isEditing) return; else isEditing = true;

                    if ($(this).hasClass('blinking')) $(this).removeClass('blinking');
                    if ($(this).find('input,select').length > 0) return;

                    // === Selects de catálogo ===
                    if ([3, 4, 5].includes(colIndex)) {
                        var select = $('<select class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                            .appendTo($(this).empty());
                        var result = null;

                        if (colIndex == 3) result = await listaMarcasFilter();
                        else if (colIndex == 4) result = await listaCategoriasFilter();
                        else if (colIndex == 5) result = await listaUnidadesDeMedidaFilter();

                        result.forEach(function (res) {
                            select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                        });

                        if (colIndex == 3) select.val(rowData.IdMarca);
                        else if (colIndex == 4) select.val(rowData.IdCategoria);
                        else if (colIndex == 5) select.val(rowData.IdUnidadDeMedida);

                        var saveButton = $('<i class="fa fa-check text-success" style="margin-left:.5rem; cursor:pointer;"></i>')
                            .on('click', function () {
                                var selectedValue = select.val();
                                var selectedText = select.find('option:selected').text();
                                saveEdit(colIndex, gridProductos.row($(this).closest('tr')).data(), selectedText, selectedValue, $(this).closest('tr'));
                            });
                        var cancelButton = $('<i class="fa fa-times text-danger" style="margin-left:.25rem; cursor:pointer;"></i>').on('click', cancelEdit);
                        $(this).append(saveButton).append(cancelButton);
                        select.focus();

                    } else if ([6, 7].includes(colIndex)) {
                        var valueToDisplay = originalData ? originalData.toString().replace(/[^\d.-]/g, '') : '';
                        var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                            .val(formatoMoneda.format(valueToDisplay))
                            .on('input', function () {
                                var saveBtn = $(this).siblings('.fa-check');
                                if ($(this).val().trim() === "") {
                                    $(this).css('border-bottom', '2px solid red');
                                    saveBtn.css('opacity', '0.5').prop('disabled', true);
                                } else {
                                    $(this).css('border-bottom', '2px solid green');
                                    saveBtn.css('opacity', '1').prop('disabled', false);
                                }
                            })
                            .on('blur', function () {
                                var rawValue = $(this).val().replace(/[^0-9,-]/g, '');
                                $(this).val(formatoMoneda.format(parseDecimal(rawValue)));
                            })
                            .on('keydown', function (e) {
                                if (e.key === 'Enter') {
                                    saveEdit(colIndex, gridProductos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                            });

                        var saveButton = $('<i class="fa fa-check text-success" style="margin-left:.5rem; cursor:pointer;"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) {
                                saveEdit(colIndex, gridProductos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            }
                        });
                        var cancelButton = $('<i class="fa fa-times text-danger" style="margin-left:.25rem; cursor:pointer;"></i>').on('click', cancelEdit);
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
                                if ([1, 8].includes(colIndex)) {
                                    if ($(this).val().trim() === "") {
                                        $(this).css('border-bottom', '2px solid red');
                                        saveBtn.css('opacity', '0.5').prop('disabled', true);
                                    } else {
                                        $(this).css('border-bottom', '2px solid green');
                                        saveBtn.css('opacity', '1').prop('disabled', false);
                                    }
                                }
                            })
                            .on('keydown', function (e) {
                                if (e.key === 'Enter') {
                                    saveEdit(colIndex, gridProductos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                            });

                        var saveButton = $('<i class="fa fa-check text-success" style="margin-left:.5rem; cursor:pointer;"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) {
                                saveEdit(colIndex, gridProductos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            }
                        });
                        var cancelButton = $('<i class="fa fa-times text-danger" style="margin-left:.25rem; cursor:pointer;"></i>').on('click', cancelEdit);
                        $(this).empty().append(input).append(saveButton).append(cancelButton);
                        input.focus();
                    }

                    function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                        var visibleIndex = gridProductos.column(colIndex).index('visible');
                        var celda = $(trElement).find('td').eq(visibleIndex);
                        var originalText = gridProductos.cell(trElement, celda).data();

                        if (colIndex === 3) { rowData.IdMarca = newValue; rowData.Marca = newText; }
                        else if (colIndex === 4) { rowData.IdCategoria = newValue; rowData.Categoria = newText; }
                        else if (colIndex === 5) { rowData.IdUnidadDeMedida = newValue; rowData.UnidadDeMedida = newText; }
                        else if (colIndex === 8) {
                            rowData.ProductoCantidad = newText;
                            rowData.Total = rowData.PVenta * parseInt(newValue);
                            var vi7 = gridProductos.column(9).index('visible');
                            $(trElement).find('td').eq(vi7).addClass('blinking');
                        } else if (colIndex === 6) {
                            rowData.PCosto = parseFloat(convertirMonedaAFloat(newValue));
                            var pvCalc = (parseFloat(rowData.PCosto) + (parseFloat(rowData.PCosto) * (rowData.PorcGanancia / 100)));
                            rowData.PVenta = parseFloat(pvCalc.toFixed(2));
                            rowData.PorcGanancia = parseFloat(((rowData.PVenta - rowData.PCosto) / rowData.PCosto) * 100).toFixed(2);
                            var vi6 = gridProductos.column(6).index('visible');
                            var vi9 = gridProductos.column(7).index('visible');
                            $(trElement).find('td').eq(vi6).addClass('blinking');
                            $(trElement).find('td').eq(vi9).addClass('blinking');
                        } else if (colIndex === 7) {
                            rowData.PVenta = parseFloat(convertirMonedaAFloat(newValue));
                            rowData.PorcGanancia = parseFloat(((convertirMonedaAFloat(newValue) - rowData.PCosto) / rowData.PCosto) * 100).toFixed(2);
                            var vi8 = gridProductos.column(10).index('visible');
                            $(trElement).find('td').eq(vi8).addClass('blinking');
                        } else if (colIndex === 10) {
                            rowData.PorcGanancia = parseDecimal(newValue);
                            rowData.PVenta = rowData.PCosto + (rowData.PCosto * (rowData.PorcGanancia / 100));
                            var vi10 = gridProductos.column(10).index('visible');
                            var vi7b = gridProductos.column(7).index('visible');
                            $(trElement).find('td').eq(vi10).addClass('blinking');
                            $(trElement).find('td').eq(vi7b).addClass('blinking');
                        } else {
                            rowData[gridProductos.column(colIndex).header().textContent] = newText;
                        }

                        gridProductos.row(trElement).data(rowData).draw();
                        if (originalText !== newText) celda.addClass('blinking');
                        guardarCambiosFila(rowData);
                        isEditing = false;

                        setTimeout(function () { $(trElement).find('td').removeClass('blinking'); }, 3000);
                    }

                    function cancelEdit() {
                        gridProductos.cell(cell.index()).data(originalData).draw();
                        isEditing = false;
                    }
                });

                // 7) Modo vendedor: ocultar columnas sensibles
                if (userSession.ModoVendedor == 1) {
                    gridProductos.column(6).visible(false);  // PCosto
                    gridProductos.column(10).visible(false); // PorcGanancia
                }

                // 8) Delegaciones globales necesarias
                $(document).off('click', '.chip-select').on('click', '.chip-select', function (e) {
                    e.preventDefault();
                    handleChipSelectClick(this);
                });

                $('#grd_Productos').off('click.toggleActivo').on('click.toggleActivo', '.btn-toggle-activo', function (e) {
                    e.preventDefault(); e.stopPropagation();
                    const id = Number($(this).data('id'));
                    const next = Number($(this).data('next'));
                    cambiarEstadoProducto(id, next);
                });

                $('#grd_Productos').off('draw.dt.kpi').on('draw.dt.kpi', function () {
                    $('#kpiCantProductos').text(gridProductos.rows({ search: 'applied' }).count());
                });
            } // fin initComplete
        });

        // “Seleccionar todos” (chips)
        $('#selectAllCheckbox').off('change.selAll').on('change.selAll', function () {
            const checkAll = $(this).is(':checked');
            selectedProductos = [];
            $('.chip-select').each(function () {
                const $btn = $(this);
                const id = Number($btn.data('id')) || 0;
                if (checkAll) {
                    $btn.addClass('is-selected').attr('aria-pressed', true);
                    $btn.find('.fa').removeClass('fa-square-o').addClass('fa-check-square');
                    $btn.find('span').text('Seleccionado');
                    if (!selectedProductos.includes(id)) selectedProductos.push(id);
                } else {
                    $btn.removeClass('is-selected').attr('aria-pressed', false);
                    $btn.find('.fa').removeClass('fa-check-square').addClass('fa-square-o');
                    $btn.find('span').text('Elegir');
                }
            });
            actualizarBotonesAccion();
        });

    } else {
        gridProductos.clear().rows.add(data).draw();
    }
}

$('#grd_Productos').on('row-reorder', function (e, diff, edit) {
    let ordenNuevo = [];
    for (let i = 0; i < diff.length; i++) {
        ordenNuevo.push({
            id: gridProductos.row(diff[i].node).data().Id,
            nuevaPosicion: diff[i].newData
        });
    }

    console.log("Nuevas posiciones:", ordenNuevo);
    // Enviá a tu controlador si necesitás persistirlo
});

async function actualizarVisibilidadProveedor(visible) {
    const api = gridProductos;          // DataTable ya instanciado
    const col = 2;                      // índice REAL de 'Proveedor' en tu columns:[]
    api.column(col).visible(visible, false); // sin redraw todavía

    // Rehacer filtros acorde a columnas visibles y ajustar
    await rebuildFiltersProductos(api);
}

async function listaProveedoresFilter() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // Mapear los datos a la estructura requerida
    const proveedores = data.map(proveedor => ({
        Id: proveedor.Id,
        Nombre: proveedor.Nombre
    }));

    return proveedores;
}

//const fileInput = document.getElementById("Imagen");

//fileInput.addEventListener("change", (e) => {
//    var files = e.target.files
//    let base64String = "";
//    let baseTotal = "";

//    // get a reference to the file
//    const file = e.target.files[0];



//    // encode the file using the FileReader API
//    const reader = new FileReader();
//    reader.onloadend = () => {
//        // use a regex to remove data url part

//        base64String = reader.result
//            .replace("data:", "")
//            .replace(/^.+,/, "");


//        var inputImg = document.getElementById("imgProd");
//        inputImg.value = base64String;

//        $("#imgProducto").removeAttr('hidden');
//        $("#imgProducto").attr("src", "data:image/png;base64," + base64String);

//    };

//    reader.readAsDataURL(file);

//}
//);

function abrirmodalProveedor() {
    // Limpiar buscador antes de mostrar
    document.getElementById("checkTodosProveedores").checked = false;
    const buscador = document.getElementById("buscadorProveedores");
    if (buscador) buscador.value = "";

    $('#modalProveedores').on('show.bs.modal', cargarCheckboxesProveedores);
    $("#modalProveedores").modal("show");
}


async function listaProveedores() {
    const response = await fetch('/Proveedores/Lista');
    const data = await response.json();

    const selectProveedores = document.getElementById("Proveedores");
    if (!selectProveedores) return; // Evitar error si el DOM aún no cargó

    selectProveedores.innerHTML = ""; // Limpia todas las opciones

    // Agrega la opción por defecto
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.text = "Seleccione Proveedor";
    selectProveedores.appendChild(defaultOption);

    // Agrega las opciones dinámicamente
    data.forEach(p => {
        const option = document.createElement("option");
        option.value = p.Id;
        option.text = p.Nombre;
        selectProveedores.appendChild(option);
    });
}


async function cargarCheckboxesProveedores() {
    const response = await fetch('/Proveedores/Lista');
    const data = await response.json();
    const contenedor = document.getElementById('contenedorProveedores');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    data.forEach(p => {
        contenedor.innerHTML += `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${p.Id}" id="prov_${p.Id}">
                <label class="form-check-label" for="prov_${p.Id}">${p.Nombre}</label>
            </div>`;
    });
}


function abrirmodalAumentarPrecios() {
    $("#txtAumentoPrecioCosto").val("0");
    $("#txtAumentoPrecioVenta").val("0");
    $("#modalAumentar").modal("show");
    validarCamposAumentarPrecioCosto();
    validarCamposAumentarPrecioVenta();

}

function abrirmodalBajarPrecios() {
    $("#txtBajaPrecioCosto").val("0");
    $("#txtBajaPrecioVenta").val("0");
    $("#modalBajar").modal("show");
    validarCamposBajarPrecioCosto();
    validarCamposBajarPrecioVenta();
}

function abrirmodalCliente() {
    document.getElementById("checkTodosClientes").checked = false;
    const buscador = document.getElementById("buscadorClientes");
    if (buscador) buscador.value = "";

    $('#modalClientes').on('show.bs.modal', cargarCheckboxesClientes);
    $("#modalClientes").modal("show");

    // Mostrar todos los checkboxes por si alguno quedó oculto
    const checks = document.querySelectorAll("#contenedorClientes .form-check");
    checks.forEach(div => div.style.display = "block");
}


async function cargarCheckboxesClientes() {
    const response = await fetch('/Clientes/Lista');
    const data = await response.json();
    const contenedor = document.getElementById('contenedorClientes');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    data.forEach(c => {
        contenedor.innerHTML += `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${c.Id}" id="cli_${c.Id}">
                <label class="form-check-label" for="cli_${c.Id}">${c.Nombre}</label>
            </div>`;
    });
}


function generarColumnConfig() {
    const config = [];
    const columnasVisibles = gridProductos?.columns().visible().toArray();

    columnasVisibles.forEach((esVisible, realIndex) => {
        if (!esVisible) return;

        let colName = gridProductos.column(realIndex).dataSrc();
        if (!colName) return;
        colName = colName.toLowerCase();

        // 👇 Saltar Activo: lo maneja el tri-chip
        if (colName === 'activo') return;

        if (colName === "descripcion") {
            config.push({ index: realIndex, filterType: 'text' });
        }
        if (colName === "proveedor") {
            config.push({ index: realIndex, filterType: 'select', fetchDataFunc: listaProveedoresFilter });
        }
        if (colName === "marca") {
            config.push({ index: realIndex, filterType: 'select', fetchDataFunc: listaMarcasFilter });
        }
        if (colName === "categoria") {
            config.push({ index: realIndex, filterType: 'select', fetchDataFunc: listaCategoriasFilter });
        }
        if (colName === "unidaddemedida") {
            config.push({ index: realIndex, filterType: 'select', fetchDataFunc: listaUnidadesDeMedidaFilter });
        }
        if (["pcosto", "pventa", "productocantidad", "total", "porcganancia"].includes(colName)) {
            config.push({ index: realIndex, filterType: 'text' });
        }
    });

    return config;
}


// ---- MENU DE COLUMNAS con persistencia por dataSrc + rebuild de filtros ----
function configurarOpcionesColumnas(api) {
    const grid = api;                         // usar la api que te pasan
    const $container = $('#configColumnasMenu');
    const STORAGE_KEY = 'Productos_Columnas_v2'; // (nuevo key para evitar residuos viejos)

    // estado guardado por "nombre" de columna (dataSrc)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    $container.empty();

    // construir menú leyendo el estado ACTUAL de la grilla
    grid.columns().every(function () {
        const i = this.index();
        const dataSrc = this.dataSrc();              // clave estable
        const title = $(this.header()).text().trim();

        // columnas sin dataSrc o técnicas
        if (!dataSrc) return;
        if (/^id/i.test(dataSrc)) return;            // Id, IdMarca, etc.
        // ocultar del menú si sos vendedor y es sensible
        if (userSession.ModoVendedor == 1 && (dataSrc === 'PCosto' || dataSrc === 'PorcGanancia') || dataSrc === 'Proveedor') return;

        // estado visible: lo que está guardado, o el actual
        const visible = (saved[dataSrc] !== undefined) ? !!saved[dataSrc] : this.visible();

        // asegurá el estado
        this.visible(visible, false);

        // item del menú
        const idChk = `colchk_${dataSrc}`;
        $container.append(`
      <li>
        <label class="dropdown-item" for="${idChk}">
          <input type="checkbox" id="${idChk}" class="toggle-column"
                 data-dsrc="${dataSrc}" ${visible ? 'checked' : ''}>
          ${title || dataSrc}
        </label>
      </li>
    `);
    });

    // aplicar y persistir cambios
    $container.off('change.cfgCols').on('change.cfgCols', '.toggle-column', function () {
        const dataSrc = $(this).data('dsrc');
        const checked = $(this).is(':checked');

        // 1) localizar índice ACTUAL de esa columna
        const curIdx = findColIndexByDataSrc(grid, dataSrc);
        if (curIdx === null) return;

        // 2) mostrar/ocultar
        grid.column(curIdx).visible(checked, false);

        // 3) persistir por dataSrc
        saved[dataSrc] = checked;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

        // 4) reconstruir FILA DE FILTROS para que coincida con el thead visible
        const $filters = ensureFiltersRow(grid);     // tu helper
        // limpiar todas las celdas de filtro y volver a generarlas
        $filters.find('th').each(function () { $(this).empty().show(); });

        // volver a dibujar antes de reinyectar inputs/chips
        grid.columns.adjust().draw(false);

        // 5) regenerar filtros por columna (usando tu generador que respeta visibilidad)
        const cfgs = generarColumnConfig();          // usa api internamente
        cfgs.forEach(async (cfg) => {
            const $cell = getFilterCell(grid, cfg.index);
            if (!$cell.length) return;

            if (grid.column(cfg.index).visible() === false) {
                $cell.empty().hide();
                return;
            }

            $cell.empty().show();

            if (cfg.filterType === 'select') {
                const $sel = $('<select><option value="">Seleccionar</option></select>')
                    .appendTo($cell)
                    .on('change', function () {
                        const val = $(this).val();
                        grid.column(cfg.index).search(val ? '^' + val + '$' : '', true, false).draw();
                    });
                const data = await cfg.fetchDataFunc();
                data.forEach(item => $sel.append(`<option value="${item.Nombre}">${item.Nombre}</option>`));
            } else if (cfg.filterType === 'text') {
                $('<input type="text" placeholder="Buscar..." />')
                    .appendTo($cell)
                    .on('keyup change', function (e) {
                        e.stopPropagation();
                        const rx = this.value ? '(((' + this.value + ')))' : '';
                        const cur = this.selectionStart || 0;
                        grid.column(cfg.index).search(rx, !!this.value, !this.value).draw();
                        $(this).focus()[0].setSelectionRange(cur, cur);
                    });
            }
        });

        // 6) sin filtro en la col de acciones (si existiera)
        const idxAcciones = findColIndexByDataSrc(grid, 'Id'); // tu col 0 de acciones no tiene dataSrc; si querés vaciar la 0:
        $('.filters th').eq(0).empty();

        // 7) volver a poner el TRI-CHIP en "Activo" por dataSrc (no por índice viejo)
        const idxActivo = findColIndexByDataSrc(grid, 'Activo');
        if (idxActivo !== null) {
            addTriChipsActivoProductos(grid, idxActivo);
        }
    });

    // ajuste final de columnas (sin redraw pesado)
    grid.columns.adjust().draw(false);
}

$(document).on('click', function (e) {
    // Verificar si el clic está fuera de cualquier dropdown
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
});

$('#UnidadesDeMedidas').on('change', function () {
    document.getElementById('txtProductoCantidad').value = 1;
    actualizarProductoCantidad();
});

$('#txtDescripcion').on('change', function () {
    actualizarProductoCantidad();
});


function actualizarProductoCantidad() {
    const selectedText = $('#UnidadesDeMedidas option:selected').text(); // Obtiene el texto seleccionado
    const idCliente = parseInt(document.getElementById("clientesfiltro").value);
    const nombreProducto = document.getElementById("txtDescripcion").value;

    if (selectedText === 'Pallet' || nombreProducto == 'Fac. IVA') {
        // Muestra el label y el input
        document.getElementById('divProductoCantidad').removeAttribute('hidden');
        document.getElementById('txtTotal').removeAttribute('hidden');
        document.getElementById('lblTotal').removeAttribute('hidden');

        if (idCliente > 0) {
            document.getElementById('txtProductoCantidad').setAttribute('readonly', 'readonly');
        } else {
            document.getElementById('txtProductoCantidad').removeAttribute('readonly');
        }
    } else {
        // Oculta el label y el input
        document.getElementById('txtTotal').setAttribute('hidden', 'hidden');
        document.getElementById('lblTotal').setAttribute('hidden', 'hidden');
        document.getElementById('divProductoCantidad').setAttribute('hidden', 'hidden');
    }
}


$('#txtProductoCantidad').on('input blur', function () {
    calcularTotal();
});

$('#txtDescripcion').on('input blur', function () {
    if (this.value.includes("Hierro")) {
        document.getElementById("txtProductoPeso").value = 0;
        document.getElementById("divPeso").removeAttribute("hidden");
    } else {
        document.getElementById("txtProductoPeso").value = 0;
        document.getElementById("divPeso").setAttribute("hidden", true);
    }
});

async function guardarCambiosFila(rowData) {
    try {
        const idCliente = document.getElementById("clientesfiltro").value;
        const idProveedor = document.getElementById("Proveedoresfiltro").value;
        rowData.IdProveedor = idProveedor;
        rowData.IdCliente = idCliente;
        const response = await fetch('/Productos/Actualizar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rowData)
        });

        if (response.ok) {
        } else {
            errorModal('Ha ocurrido un error al guardar los datos...')
        }
    } catch (error) {
        console.error('Error de red:', error);
    }
}

const cambiarEstadoProducto = async (id, estado) => {
    try {
        const value = {
            Id: id,
            activo: estado
        };

        const url = "/Productos/EditarActivo";
        const method = "POST";

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(value) // Aquí ya no es necesario envolverlo en JSON.stringify nuevamente
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                const mensaje = "Cambio de estado correctamente";
                exitoModal(mensaje);
                listaProductos();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

$('#selectAllCheckbox').on('change', function () {
    const checkAll = $(this).is(':checked');
    selectedProductos = [];

    $('.chip-select').each(function () {
        const $btn = $(this);
        const id = Number($btn.data('id')) || 0;

        if (checkAll) {
            $btn.addClass('is-selected').attr('aria-pressed', true);
            $btn.find('.fa').removeClass('fa-square-o').addClass('fa-check-square');
            $btn.find('span').text('Seleccionado');
            if (!selectedProductos.includes(id)) selectedProductos.push(id);
        } else {
            $btn.removeClass('is-selected').attr('aria-pressed', false);
            $btn.find('.fa').removeClass('fa-check-square').addClass('fa-square-o');
            $btn.find('span').text('Elegir');
        }
    });

    actualizarBotonesAccion();
});

function handleChipSelectClick(btn) {
    const $btn = $(btn);
    const id = Number($btn.data('id')) || 0;

    // toggle visual
    const selected = !$btn.hasClass('is-selected');
    $btn.toggleClass('is-selected', selected)
        .attr('aria-pressed', selected);

    // toggle icono + label
    const $icon = $btn.find('.fa');
    const $txt = $btn.find('span');
    if (selected) {
        $icon.removeClass('fa-square-o').addClass('fa-check-square');
        $txt.text('Seleccionado');
        if (!selectedProductos.includes(id)) selectedProductos.push(id);
    } else {
        $icon.removeClass('fa-check-square').addClass('fa-square-o');
        $txt.text('Elegir');
        const ix = selectedProductos.indexOf(id);
        if (ix > -1) selectedProductos.splice(ix, 1);
    }

    actualizarBotonesAccion(); // la tuya
    // console.log(selectedProductos);
}

function desmarcarChipSelects() {
    selectedProductos = [];
    $('.chip-select').removeClass('is-selected').attr('aria-pressed', false)
        .each(function () {
            $(this).find('.fa').removeClass('fa-check-square').addClass('fa-square-o');
            $(this).find('span').text('Elegir');
        });
    $('#selectAllCheckbox').prop('checked', false);
    actualizarBotonesAccion();
}


function actualizarBotonesAccion() {
    if (selectedProductos.length > 0 && idProveedorFiltro <= 0 && idClienteFiltro <= 0) {
        document.getElementById("btnAsignarProveedor").removeAttribute("hidden");
        document.getElementById("btnDuplicar").removeAttribute("hidden");
    } else {
        document.getElementById("btnAsignarProveedor").setAttribute("hidden", "hidden");
        document.getElementById("btnDuplicar").setAttribute("hidden", "hidden");
    }

    if (selectedProductos.length > 0 && idProveedorFiltro > 0 && idClienteFiltro <= 0) {
        document.getElementById("btnAsignarCliente").removeAttribute("hidden");
    } else {
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
    }

    if (selectedProductos.length > 0) {
        document.getElementById("btnAumentarPrecios").removeAttribute("hidden");
        document.getElementById("btnBajarPrecios").removeAttribute("hidden");
    } else {
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");
    }
}

$(document).on('mousedown', '.draggable-icon', function (e) {
    activarDrag(this);
});


function activarDrag(iconElement) {
    const fila = iconElement.closest('tr');
    const tabla = document.getElementById('grd_Productos');

    // Remover clases anteriores
    Array.from(tabla.querySelectorAll('tr')).forEach(row => row.classList.remove('draggable-row'));

    // Marcar esta fila como seleccionada para mover
    fila.classList.add('draggable-row');

    // Hacer que solo esta fila sea draggable
    fila.setAttribute('draggable', true);

    // Agregar eventos para arrastrar
    fila.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', fila.rowIndex);
        fila.style.opacity = '0.5';
    };

    fila.ondragend = (e) => {
        fila.style.opacity = '';
    };

    const tbody = tabla.querySelector('tbody');

    tbody.ondragover = (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(tbody, e.clientY);
        const draggingRow = tabla.querySelector('.draggable-row');
        if (afterElement == null) {
            tbody.appendChild(draggingRow);
        } else {
            tbody.insertBefore(draggingRow, afterElement);
        }


    };

    tbody.ondrop = (e) => {
        e.preventDefault();
        const draggingRow = tabla.querySelector('.draggable-row');
        const afterElement = getDragAfterElement(tbody, e.clientY);

        if (afterElement == null) {
            tbody.appendChild(draggingRow);
        } else {
            tbody.insertBefore(draggingRow, afterElement);
        }

        // 🎆 Mostrar explosión
        mostrarExplosion(e.clientX, e.clientY);


        // Obtener índice de la fila dentro del tbody
        const filaIndex = [...tbody.rows].indexOf(draggingRow);

        // Aplicar efecto solo a columnas desde la tercera
        draggingRow.querySelectorAll('td').forEach((td, index) => {
            if (index >= 1) {
                td.classList.add('fila-resaltada');
            }
        });

        setTimeout(() => {
            draggingRow.querySelectorAll('td').forEach((td, index) => {
                if (index >= 1) {
                    td.classList.remove('fila-resaltada');
                }
            });
        }, 1000);

        guardarNuevoOrdenProductos(); // ← tu lógica de guardar si querés activarla
    };



}

// Función auxiliar para calcular dónde insertar
function getDragAfterElement(container, y) {
    const rows = [...container.querySelectorAll('tr:not(.draggable-row)')];

    return rows.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}


function mostrarExplosion(x, y) {
    const explosion = document.createElement('div');
    explosion.classList.add('explosion');
    explosion.style.left = `${x - 20}px`;
    explosion.style.top = `${y - 20}px`;
    document.body.appendChild(explosion);

    setTimeout(() => {
        explosion.remove();
    }, 500);
}




let scrollInterval;
const scrollSpeed = 20;

$(document).on('dragover', '#grd_Productos_wrapper .dataTables_scrollBody', function (e) {
    const scrollContainer = this;
    const bounds = scrollContainer.getBoundingClientRect();
    const offsetY = e.clientY - bounds.top;

    clearInterval(scrollInterval);

    if (offsetY < 50) {
        scrollInterval = setInterval(() => {
            scrollContainer.scrollTop -= scrollSpeed;
        }, 50);
    } else if (offsetY > bounds.height - 50) {
        scrollInterval = setInterval(() => {
            scrollContainer.scrollTop += scrollSpeed;
        }, 50);
    }
});

$(document).on('dragleave drop', '#grd_Productos_wrapper .dataTables_scrollBody', function () {
    clearInterval(scrollInterval);
});


function guardarNuevoOrdenProductos() {
    const filas = document.querySelectorAll('#grd_Productos tbody tr');
    const nuevosOrdenes = [];

    filas.forEach((fila, index) => {
        const id = parseInt(fila.getAttribute('data-id'));
        nuevosOrdenes.push({ Id: id, Orden: index + 1 });
    });

    const idProveedor = document.getElementById("Proveedoresfiltro").value;
    const idCliente = document.getElementById("clientesfiltro").value;

    fetch('/Productos/GuardarOrdenMasivo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'idProveedor': idProveedor,
            'idCliente': idCliente
        },
        body: JSON.stringify(nuevosOrdenes)
    })
        .then(response => {
            if (!response.ok) throw new Error('Error al guardar el orden');
            return response.json();
        })
        .then(data => {
            console.log('Orden actualizado');
        })
        .catch(error => {
            console.error('Error:', error);
            errorModal('Error al guardar el orden');
        });
}



const connection = new signalR.HubConnectionBuilder()
    .withUrl("/notificacionesHub")
    .build();

connection.on("ActualizarSignalR", function (data) {
    const userSession = JSON.parse(localStorage.getItem('userSession'));

    if (data.idUsuario !== userSession.Id) {


        if (typeof reproducirSonidoNotificacion === "function") {
            reproducirSonidoNotificacion();
        }

        if (typeof aplicarFiltrosSignalR === "function") {

            const paginaActual = gridProductos.page();

            // ⚠️ Guardar celda en edición si la hay
            let idEditando = null;
            let colEditando = null;

            if (isEditing) {
                const cell = gridProductos.cell('td:has(input), td:has(select)');
                const rowData = gridProductos.row(cell.index().row).data();
                idEditando = rowData?.Id;
                colEditando = cell.index().column;

                isEditing = false;
                gridProductos.cell(cell.index()).data(cell.data()).draw();
            }

            aplicarFiltrosSignalR().then(() => {
                const tipo = data.tipo?.toLowerCase();
                const tipoAnimacion = tipo === "creado" ? "nueva" : "actualizada";

                const rowIndex = gridProductos.rows().indexes().toArray().find(index => {
                    const rowData = gridProductos.row(index).data();
                    return rowData?.Id === data.id;
                });

                if (rowIndex !== undefined && data.nuevosDatos) {
                    // ✅ Actualiza solo la fila si hay nuevosDatos
                    gridProductos.row(rowIndex).data(data.nuevosDatos).invalidate().draw(false);

                    if (typeof marcarFilaCambio === "function") {
                        marcarFilaCambio(gridProductos, data.id, tipoAnimacion);
                    }
                } else {
                    // 🔁 Redibuja y vuelve a editar si corresponde
                    

                    setTimeout(() => {
                        gridProductos.page(paginaActual).draw('page');

                        if (typeof marcarFilaCambio === "function") {
                            marcarFilaCambio(gridProductos, data.id, tipoAnimacion);
                        }

                        if (idEditando !== null && colEditando !== null) {
                            const rowIdx = gridProductos.rows().indexes().toArray().find(i => gridProductos.row(i).data().Id === idEditando);

                            if (rowIdx !== undefined) {
                                const cellNode = gridProductos.cell(rowIdx, colEditando).node();
                                $(cellNode).trigger('dblclick');
                            }
                        }
                    }, 300);
                }
            });
        }

        // ✅ TOAST Notificación
        const tipo = data.tipo?.toLowerCase();
        const titulo = "Productos";
        let mensaje = "";

        if (tipo === "actualizadomasivo") {
            const cantidad = `<span class="fw-bold text-primary">${data.cantidad} productos</span>`;
            const cliente = data.cliente ? ` del cliente <span class="fw-bold text-primary">${data.cliente}</span>` : "";
            const proveedor = data.proveedor ? `${data.cliente ? " y" : " del"} proveedor <span class="fw-bold text-primary">${data.proveedor}</span>` : "";
            const usuario = `<span class="fw-bold text-primary">${data.usuario}</span>`;
            mensaje = `${cantidad}${cliente}${proveedor} actualizados por ${usuario}.`;

        } else if (tipo === "creadomasivo") {
            mensaje = `${data.cantidad} productos han sido creados por ${data.usuario}.`;

        } else {
            const producto = `<span class="fw-bold text-primary">#${data.producto}</span>`;
            const usuario = `<span class="fw-bold text-primary">${data.usuario}</span>`;

            if (tipo === "actualizado" || tipo === "eliminado") {
                if (data.cliente && data.proveedor) {
                    mensaje = `${producto} del cliente <span class="fw-bold text-primary">${data.cliente}</span>` +
                        ` y proveedor <span class="fw-bold text-primary">${data.proveedor}</span>` +
                        ` ${tipo} por ${usuario}.`;
                } else if (data.cliente) {
                    mensaje = `${producto} del cliente <span class="fw-bold text-primary">${data.cliente}</span> ${tipo} por ${usuario}.`;
                } else if (data.proveedor) {
                    mensaje = `${producto} del proveedor <span class="fw-bold text-primary">${data.proveedor}</span> ${tipo} por ${usuario}.`;
                } else {
                    mensaje = `${producto} ${tipo} por ${usuario}.`;
                }
            } else {
                mensaje = `${producto} ${tipo} por ${usuario}.`;
            }
        }

        const opciones = {
            timeOut: 5000,
            positionClass: "toast-bottom-right",
            progressBar: true,
            toastClass: "toastr ancho-personalizado",
            allowHtml: true
        };

        if (tipo === "eliminado") {
            toastr.error(mensaje, titulo, opciones);
        } else if (tipo === "actualizado" || tipo === "actualizadomasivo") {
            toastr.warning(mensaje, titulo, opciones);
        } else {
            toastr.success(mensaje, titulo, opciones);
        }
    }
});


connection.start()
    .then(() => console.log("✅ SignalR conectado [productos.js]"))
    .catch(err => console.error("❌ Error SignalR:", err.toString()));

connection.start()
    .then(() => console.log("✅ SignalR conectado [productos.js]"))
    .catch(err => console.error("❌ Error SignalR:", err.toString()));


document.getElementById("buscadorProveedores").addEventListener("input", function () {
    const filtro = this.value.toLowerCase();
    const checks = document.querySelectorAll("#contenedorProveedores .form-check");

    checks.forEach(div => {
        const texto = div.textContent.toLowerCase();
        div.style.display = texto.includes(filtro) ? "block" : "none";
    });
});

document.getElementById("buscadorClientes").addEventListener("input", function () {
    const filtro = this.value.toLowerCase();
    const checks = document.querySelectorAll("#contenedorClientes .form-check");

    checks.forEach(div => {
        const texto = div.textContent.toLowerCase();
        div.style.display = texto.includes(filtro) ? "block" : "none";
    });
});


document.getElementById("checkTodosProveedores").addEventListener("change", function () {
    const checkboxes = document.querySelectorAll("#contenedorProveedores .form-check-input");
    checkboxes.forEach(cb => cb.checked = this.checked);
});

document.getElementById("checkTodosClientes").addEventListener("change", function () {
    const checkboxes = document.querySelectorAll("#contenedorClientes .form-check-input");
    checkboxes.forEach(cb => cb.checked = this.checked);
});


function initToggleFiltrosPersistenteProductos() {
    const btn = document.getElementById('btnToggleFiltros');
    const icon = document.getElementById('iconFiltros');
    const panel = document.getElementById('formFiltrosProductos');
    const STORAGE_KEY = 'Productos_FiltrosVisibles';

    if (!btn || !icon || !panel) return;

    // Restaurar estado
    const saved = localStorage.getItem(STORAGE_KEY);
    const visible = (saved === null) ? true : (saved === 'true');

    panel.classList.toggle('d-none', !visible);
    icon.classList.toggle('fa-arrow-down', !visible);
    icon.classList.toggle('fa-arrow-up', visible);

    // Toggle con persistencia
    btn.addEventListener('click', () => {
        const hide = panel.classList.toggle('d-none');
        const nowVisible = !hide;
        icon.classList.toggle('fa-arrow-down', hide);
        icon.classList.toggle('fa-arrow-up', nowVisible);
        localStorage.setItem(STORAGE_KEY, String(nowVisible));
    });
}


function resetFiltrosProductos() {
    // Detecta qué valor “vacío” usás en tus selects: '' o -1
    const empty = $('#Proveedoresfiltro option[value="-1"]').length ? '-1' : '';

    ['Proveedoresfiltro', 'clientesfiltro', 'Productosfiltro'].forEach(id => {
        const $el = $('#' + id);
        if ($el.data('select2')) {
            $el.val(empty).trigger('change');      // ← clave para Select2
        } else {
            $el.val(empty);
        }
    });

    // Si llevás estos estados en variables globales, resetealos
    idProveedorFiltro = -1;
    idClienteFiltro = -1;

    validarProductosFiltro(); // por si habilitás/deshabilitás Producto según proveedor/cliente
    aplicarFiltros();         // recarga la grilla con filtros limpios
}


// --- Filtro Activo (persistente) ---
let filtroActivoProductos = (localStorage.getItem('Productos_FiltroActivo') ?? 'all'); // 'all' | '1' | '0'


function getFilterCell(api, colIndex) {
    const $container = $(api.table().container());
    const $thead = $container.find('.dataTables_scrollHead thead').length
        ? $container.find('.dataTables_scrollHead thead')
        : $(api.table().header());

    const $filters = $thead.find('tr.filters');
    const visIdx = api.column(colIndex).index('visible'); // índice visible actual
    if (visIdx === undefined || visIdx === null || visIdx < 0) return $(); // oculta
    return $filters.find('th').eq(visIdx);
}

function ensureFiltersRow(api) {
    const $container = $(api.table().container());
    const $thead = $container.find('.dataTables_scrollHead thead').length
        ? $container.find('.dataTables_scrollHead thead')
        : $(api.table().header());

    let $filters = $thead.find('tr.filters');
    if (!$filters.length) {
        // Usar SOLO los th visibles del header clonado
        const visibleCount = $thead.find('tr').first().children('th:visible').length;
        const ths = Array.from({ length: visibleCount }, () => '<th></th>').join('');
        $filters = $(`<tr class="filters">${ths}</tr>`);
        $thead.append($filters);
    }
    return $filters;
}
async function buildFiltersProductos(api) {
    const $filters = ensureFiltersRow(api);
    $filters.find('th').each(function () { $(this).empty().show(); });

    // sin filtro en la columna de ACCIONES (la de tu botón/checkboxes)
    const visIdxAcc = api.column(0).index('visible');
    if (visIdxAcc >= 0) $filters.find('th').eq(visIdxAcc).empty();

    // genera entradas según columnas visibles (tu función existente)
    const cfgs = generarColumnConfig();
    for (const cfg of cfgs) {
        const $cell = getFilterCell(api, cfg.index);
        if (!$cell.length) continue;

        if (api.column(cfg.index).visible() === false) {
            $cell.empty().hide();
            continue;
        }
        $cell.empty().show();

        if (cfg.filterType === 'select') {
            const $sel = $('<select><option value="">Seleccionar</option></select>')
                .appendTo($cell)
                .on('change', function () {
                    const val = $(this).val();
                    api.column(cfg.index).search(val ? '^' + val + '$' : '', true, false).draw();
                });
            const data = await cfg.fetchDataFunc();
            data.forEach(it => $sel.append(`<option value="${it.Nombre}">${it.Nombre}</option>`));
        } else {
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

    // Tri-chips para Activo (por dataSrc, no por índice “fijo”)
    const idxActivo = api.columns().indexes().toArray()
        .find(i => api.column(i).dataSrc() === 'Activo');
    if (idxActivo !== undefined) addTriChipsActivoProductos(api, idxActivo);
}

// chip “Activo”
function addTriChipsActivoProductos(api, colIndex) {
    const $cell = getFilterCell(api, colIndex);
    if (!$cell.length) return;
    $cell.empty().addClass('tri-filter');

    const $wrap = $(`
    <div class="tri-chips" role="group" aria-label="Activo">
      <button type="button" class="chip" data-val="all" title="Mostrar todos">Todos</button>
      <button type="button" class="chip" data-val="1"   title="Solo activos">Sí</button>
      <button type="button" class="chip" data-val="0"   title="Solo inactivos">No</button>
    </div>`).appendTo($cell);

    const KEY = 'Productos_FiltroActivo';
    const saved = localStorage.getItem(KEY) ?? '1';

    const apply = (val) => {
        const s = String(val);
        if (s === '1') api.column(colIndex).search('^1$', true, false).draw();
        else if (s === '0') api.column(colIndex).search('^0$', true, false).draw();
        else api.column(colIndex).search('', false, false).draw(); // vacío SIN regex

        $wrap.find('.chip').removeClass('active');
        $wrap.find(`.chip[data-val="${s}"]`).addClass('active');
        localStorage.setItem(KEY, s);
    };

    $wrap.on('click', '.chip', function (e) { e.preventDefault(); e.stopPropagation(); apply($(this).data('val')); });
    $wrap.on('keydown', '.chip', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $(this).trigger('click'); } });
    apply(saved);
}

// localizar índice por dataSrc, estable con colReorder
function findColIndexByDataSrc(api, dataSrc) {
    const idx = api.columns().indexes().toArray()
        .find(i => api.column(i).dataSrc() === dataSrc);
    return (idx === undefined ? null : idx);
}




function findColIndexByDataSrc(api, dataSrc) {
    const idx = api.columns().indexes().toArray()
        .find(i => api.column(i).dataSrc() === dataSrc);
    return (idx === undefined ? null : idx);
}

$(document).off('click', '.btn-toggle-activo').on('click', '.btn-toggle-activo', function () {
    const id = Number($(this).data('id'));
    const next = Number($(this).data('next'));
    cambiarEstadoProducto(id, next);
});

function debounce(fn, wait = 0) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function getFilterThead(api) {
    const $c = $(api.table().container());
    return $c.find('.dataTables_scrollHead thead').length
        ? $c.find('.dataTables_scrollHead thead')
        : $(api.table().header());
}

async function rebuildFiltersProductos(api) {
    const $thead = getFilterThead(api);

    // limpiar cualquier fila de filtros previa (en scrollHead y en header normal)
    $thead.find('tr.filters').remove();
    $(api.table().header()).find('tr.filters').remove();

    // cantidad de columnas visibles en el orden actual
    const visIdxs = api.columns(':visible').indexes().toArray();
    const ths = visIdxs.map(() => '<th></th>').join('');
    const $filters = $(`<tr class="filters">${ths}</tr>`);

    // insertar la fila de filtros en el thead visible
    $thead.append($filters);

    // no poner filtro en la primera columna (acciones/checkbox/drag)
    if (visIdxs.length) $filters.find('th').eq(0).empty();

    // generar inputs/selects por columna visible (usando tu generador)
    const cfgs = generarColumnConfig();  // devuelve índices reales de la grilla
    for (const cfg of cfgs) {
        // si la columna no está visible, skip
        if (api.column(cfg.index).visible() === false) continue;

        // índice visible de esa columna
        const v = api.column(cfg.index).index('visible');
        if (v == null || v < 0) continue;

        const $cell = $filters.find('th').eq(v).empty().show();

        if (cfg.filterType === 'select') {
            const $sel = $('<select><option value="">Seleccionar</option></select>')
                .appendTo($cell)
                .on('change', function () {
                    const val = $(this).val();
                    api.column(cfg.index).search(val ? '^' + val + '$' : '', true, false).draw();
                });
            const data = await cfg.fetchDataFunc();
            data.forEach(it => $sel.append(`<option value="${it.Nombre}">${it.Nombre}</option>`));
        } else {
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

    // Tri-chips “Activo” por dataSrc (nunca por índice fijo)
    const idxActivo = api.columns().indexes().toArray()
        .find(i => api.column(i).dataSrc() === 'Activo');
    if (idxActivo !== undefined) addTriChipsActivoProductos(api, idxActivo);

    // ajustar anchos una vez armado todo
    api.columns.adjust().draw(false);
}