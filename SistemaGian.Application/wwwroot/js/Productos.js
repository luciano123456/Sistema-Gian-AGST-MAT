let gridProductos;
var selectedProductos = [];
let idProveedorFiltro = -1, idClienteFiltro = -1;
let proveedorVisible = false;
let isEditing = false;


var userSession = JSON.parse(localStorage.getItem('userSession'));

const columnConfig = [
    { index: 1, filterType: 'text' },
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
];

const Modelo_base = {
    Id: 0,
    Descripcion: "",
    PCosto: "0",
    PVenta: "0",
    PorcGanancia: "0",
}

$(document).ready(() => {



    listaProductos();
    listaProveedoresFiltro();
    listaClientesFiltro();



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

    $('#Proveedoresfiltro, #clientesfiltro').on('change', function () {
        validarProductosFiltro()
    });


})

function validarProductosFiltro() {
    const idCliente = document.getElementById("clientesfiltro").value;
    const idProveedor = document.getElementById("Proveedoresfiltro").value;

    if (idCliente == -1 && idProveedor == -1) {
        document.getElementById("txtProductoFiltro").removeAttribute("readonly");
    } else {
        document.getElementById("txtProductoFiltro").setAttribute("readonly", true);
        document.getElementById("txtProductoFiltro").value = "";
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

async function aplicarFiltros() {
    var validacionFiltros = validarFiltros();
    if (!validacionFiltros) {
        const idCliente = document.getElementById("clientesfiltro").value;
        const idProveedor = document.getElementById("Proveedoresfiltro").value;
        const producto = document.getElementById("txtProductoFiltro").value;

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

        if (producto != "") {
            await actualizarVisibilidadProveedor(true);
            gridProductos.column(2).visible(true);
            gridProductos.column(0).visible(false);
            
        } else {
            gridProductos.column(2).visible(false);
            gridProductos.column(0).visible(true);
            await actualizarVisibilidadProveedor(false);
        }


        selectedProductos = [];

        const url = `Productos/ListaProductosFiltro?idCliente=${idCliente}&idProveedor=${idProveedor}&producto=${producto}`;

        fetch(url, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                configurarDataTable(dataJson);
            })
            .catch(error => {
                console.error('Error:', error);
            });
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


function asignarProveedor() {

    const nuevoModelo = {
        productos: JSON.stringify(selectedProductos),
        idProveedor: document.getElementById("Proveedores").value

    };

    const url = "Productos/AsignarProveedor";
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
            if (dataJson != null) {
                const mensaje = "Proveedor asignado correctamente";
                exitoModal(mensaje);
            } else {
                const mensaje = "Ha ocurrido un error al asignar el proveedor";
                errorModal(mensaje);
            }
                $("#modalProveedores").modal("hide");
          
            //desmarcarCheckboxes();
            //listaProductos();

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


function asignarCliente() {

    const nuevoModelo = {
        productos: JSON.stringify(selectedProductos),
        idProveedor: idProveedorFiltro,
        idCliente: document.getElementById("Clientes").value

    };

    const url = "Productos/AsignarCliente";
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
            const mensaje = "Cliente asignado correctamente";
            exitoModal(mensaje);
            $("#modalClientes").modal("hide");

        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function guardarCambios() {
    if (validarCampos()) {
        sumarPorcentaje(); //Por si las dudas
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
            "ProductoCantidad": (isNaN(productoCantidad) || productoCantidad === null || productoCantidad.trim() === "") ? 1 : parseFloat(productoCantidad),
            "Image": null,
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
    const campos = ["Id", "Descripcion", "PrecioCosto", "PrecioVenta", "PorcentajeGanancia"];
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
        $('#grd_Productos thead tr').clone(true).addClass('filters').appendTo('#grd_Productos thead');
        gridProductos = $('#grd_Productos').DataTable({
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
                        const isChecked = false;

                        const checkboxClass = isChecked ? 'fa-check-square-o' : 'fa-square-o';
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
                    <span class="custom-checkbox" data-id='${data}'>
                                    <i class="fa ${checkboxClass} checkbox"></i>
                                </span>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Descripcion' },
                { data: 'Proveedor' },
                { data: 'Marca' },
                { data: 'Categoria' },
                { data: 'UnidadDeMedida' },
                
                //{ data: 'Moneda' },
                { data: 'PCosto' },
                { data: 'PVenta' },
                { data: 'ProductoCantidad' },
                { data: 'Total' },

                { data: 'PorcGanancia' },
                { data: 'IdMoneda', visible: false },
                { data: 'IdMarca', visible: false },
                { data: 'IdCategoria', visible: false },
                { data: 'IdUnidadDeMedida', visible: false },

               
            ],
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Reporte Productos', exportOptions: { columns: [ 1, 2, 3, 4, 5, 6, 7,8] }, className: 'btn-exportar-excel' },
                { extend: 'pdfHtml5', text: 'Exportar PDF', filename: 'Reporte Productos', exportOptions: { columns: [ 1, 2, 3, 4, 5, 6, 7, 8] }, className: 'btn-exportar-pdf' },
                { extend: 'print', text: 'Imprimir', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] }, className: 'btn-exportar-print' },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: false,
            columnDefs: [
                { "render": function (data) { return formatNumber(data); }, "targets": [6, 7, 9] }
            ],
            createdRow: function (row, data, dataIndex) {
                if (data.Descripcion.toLowerCase().includes('copia')) {
                    $(row).addClass('productocopia'); // Agrega la clase a toda la fila
                }
            },


            initComplete: async function () {
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
                            select.append('<option value="' + item.Id + '">' + item.Nombre + '</option>')
                        });

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

                $('#grd_Productos').on('draw.dt', function () {
                    $(document).off('click', '.custom-checkbox'); // Desvincular el evento para evitar duplicaciones
                    $(document).on('click', '.custom-checkbox', handleCheckboxClick);
                });

                $(document).on('click', '.custom-checkbox', function (event) {
                    handleCheckboxClick();
                });




                $('.filters th').eq(0).html('');

                // Establecer la visibilidad de la columna 'Proveedor' (por defecto oculta)
                actualizarVisibilidadProveedor(false); // Establecer la visibilidad por defecto

                configurarOpcionesColumnas();


                $('#grd_Productos tbody').on('dblclick', 'td', async function () {
                    var cell = gridProductos.cell(this);
                    var originalData = cell.data();
                    var colIndex = cell.index().column;
                    var rowData = gridProductos.row($(this).closest('tr')).data();

                    if (colIndex == 0) return;


                    const idCliente = document.getElementById("clientesfiltro").value;
                    const idProveedor = document.getElementById("Proveedoresfiltro").value;

                    if (idCliente > 0 || idProveedor > 0) {
                        if (colIndex != 6 && colIndex != 7 && colIndex != 8 && colIndex != 10) {
                            return false;
                        }
                    } else {
                        if (colIndex != 1 && colIndex != 3 && colIndex != 4 && colIndex != 5 && colIndex != 6 && colIndex != 7 && colIndex != 8 && colIndex != 10) {
                            return false;
                        }
                    }

                    


                    if (isEditing == true) {
                        return;
                    } else {
                        isEditing = true;
                    }

                    // Eliminar la clase 'blinking' si está presente
                    if ($(this).hasClass('blinking')) {
                        $(this).removeClass('blinking');
                    }


                    // Si ya hay un input o select, evitar duplicados
                    if ($(this).find('input').length > 0 || $(this).find('select').length > 0) {
                        return;
                    }

                    // Si la columna es la de la provincia (por ejemplo, columna 3)
                    if (colIndex === 3 || colIndex === 4 || colIndex === 5) {
                        var select = $('<select class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                            .appendTo($(this).empty())
                            .on('change', function () {
                                // No hacer nada en el change, lo controlamos con el botón de aceptar
                            });

                        // Estilo para las opciones del select
                        select.find('option').css('color', 'white'); // Cambiar el color del texto de las opciones a blanco
                        select.find('option').css('background-color', 'black'); // Cambiar el fondo de las opciones a negro

                        // Obtener las provincias disponibles

                        var result = null;


                        if (colIndex == 3) {
                            result = await listaMarcasFilter();
                        } else if (colIndex == 4) {
                            result = await listaCategoriasFilter();
                        } else if (colIndex == 5) {
                            result = await listaUnidadesDeMedidaFilter();
                        }

                        result.forEach(function (res) {
                            select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                        });

                        if (colIndex == 3) {
                            select.val(rowData.IdMarca);
                        } else if (colIndex == 4) {
                            select.val(rowData.IdCategoria);
                        } else if (colIndex == 5) {
                            select.val(rowData.IdUnidadDeMedida);
                       
                        }


                        // Crear los botones de guardar y cancelar
                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            var selectedValue = select.val();
                            var selectedText = select.find('option:selected').text();
                            saveEdit(colIndex, gridProductos.row($(this).closest('tr')).data(), selectedText, selectedValue, $(this).closest('tr'));
                        });

                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                        // Agregar los botones de guardar y cancelar en la celda
                        $(this).append(saveButton).append(cancelButton);

                        // Enfocar el select
                        select.focus();
                    } else if (colIndex === 6 || colIndex == 7) {
                        var valueToDisplay = originalData ? originalData.toString().replace(/[^\d.-]/g, '') : '';

                        var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                            .val(formatoMoneda.format(valueToDisplay))
                            .on('input', function () {
                                var saveBtn = $(this).siblings('.fa-check'); // Botón de guardar

                                if ($(this).val().trim() === "") {
                                    $(this).css('border-bottom', '2px solid red'); // Borde rojo
                                    saveBtn.css('opacity', '0.5'); // Desactivar botón de guardar visualmente
                                    saveBtn.prop('disabled', true); // Desactivar funcionalidad del botón
                                } else {
                                    $(this).css('border-bottom', '2px solid green'); // Borde verde
                                    saveBtn.css('opacity', '1'); // Habilitar botón de guardar visualmente
                                    saveBtn.prop('disabled', false); // Habilitar funcionalidad del botón
                                }
                            })
                        input.on('blur', function () {
                            // Solo limpiar el campo si no se ha presionado "Aceptar"
                            var rawValue = $(this).val().replace(/[^0-9,-]/g, ''); // Limpiar caracteres no numéricos
                            $(this).val(formatoMoneda.format(parseDecimal(rawValue))); // Mantener el valor limpio
                        })
                            .on('keydown', function (e) {
                                if (e.key === 'Enter') {
                                    saveEdit(colIndex, gridProductos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                            });

                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                                saveEdit(colIndex, gridProductos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            }
                        });

                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                        // Reemplazar el contenido de la celda
                        $(this).empty().append(input).append(saveButton).append(cancelButton);

                        input.focus();
                    } else {
                        var valueToDisplay = (originalData && originalData.toString().trim() !== "")
                            ? originalData.toString().replace(/<[^>]+>/g, "")
                            : originalData || "";

                        var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                            .val(valueToDisplay)
                            .on('input', function () {
                                var saveBtn = $(this).siblings('.fa-check'); // Botón de guardar

                                if (colIndex === 1 || colIndex === 8) { // Validar solo si es la columna 0
                                    if ($(this).val().trim() === "") {
                                        $(this).css('border-bottom', '2px solid red'); // Borde rojo
                                        saveBtn.css('opacity', '0.5'); // Desactivar botón de guardar visualmente
                                        saveBtn.prop('disabled', true); // Desactivar funcionalidad del botón
                                    } else {
                                        $(this).css('border-bottom', '2px solid green'); // Borde verde
                                        saveBtn.css('opacity', '1'); // Habilitar botón de guardar visualmente
                                        saveBtn.prop('disabled', false); // Habilitar funcionalidad del botón
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

                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                                saveEdit(colIndex, gridProductos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            }
                        });

                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                        // Reemplazar el contenido de la celda
                        $(this).empty().append(input).append(saveButton).append(cancelButton);

                        input.focus();
                    }


                    // Función para guardar los cambios
                    function saveEdit(colIndex, rowData, newText, newValue, trElement) {

                        // Convertir el índice de columna (data index) al índice visible
                        var visibleIndex = gridProductos.column(colIndex).index('visible');

                        // Obtener la celda visible y aplicar la clase blinking
                        var celda = $(trElement).find('td').eq(visibleIndex);

                        // Obtener el valor original de la celda
                        var originalText = gridProductos.cell(trElement, celda).data();

                        // Actualizar el valor de la fila según la columna editada
                        if (colIndex === 3) {
                            rowData.IdMarca = newValue;
                            rowData.Marca = newText;
                        } else if (colIndex === 4) {
                            rowData.IdCategoria = newValue;
                            rowData.Categoria = newText;
                        } else if (colIndex === 5) {
                            rowData.IdUnidadDeMedida = newValue;
                            rowData.UnidadDeMedida = newText;
                        } else if (colIndex === 8) {
                            rowData.ProductoCantidad = newText;
                            rowData.Total = rowData.PVenta * parseInt(newValue)
                            var visibleIndex7 = gridProductos.column(9).index('visible');
                            $(trElement).find('td').eq(visibleIndex7).addClass('blinking');
                        } else if (colIndex === 6) { // PrecioCosto
                            rowData.PCosto = parseFloat(convertirMonedaAFloat(newValue)); // Actualizar PrecioCosto

                            var precioVentaCalculado = (parseFloat(rowData.PCosto) + (parseFloat(rowData.PCosto) * (rowData.PorcGanancia / 100)));
                            precioVentaCalculado = parseFloat(precioVentaCalculado.toFixed(2));

                            rowData.PVenta = precioVentaCalculado;

                            // Actualizar el porcentaje de ganancia basado en el PrecioCosto
                            rowData.PorcGanancia = parseFloat(((rowData.PVenta - rowData.PCosto) / rowData.PCosto) * 100).toFixed(2);

                            // Obtener el índice visible para las columnas correspondientes
                            var visibleIndex7 = gridProductos.column(6).index('visible');
                            var visibleIndex9 = gridProductos.column(7).index('visible');

                            // Aplicar el efecto de parpadeo a las celdas de PrecioCosto y PrecioVenta
                            $(trElement).find('td').eq(visibleIndex7).addClass('blinking');
                            $(trElement).find('td').eq(visibleIndex9).addClass('blinking');
                        }  else if (colIndex === 7) { // PrecioVenta
                            rowData.PVenta = parseFloat(convertirMonedaAFloat(newValue))
                            rowData.PorcGanancia = parseFloat(((convertirMonedaAFloat(newValue) - rowData.PCosto) / rowData.PCosto) * 100).toFixed(2);

                            // Obtener el índice visible para la columna 7 (PrecioCosto) o la correspondiente
                            var visibleIndex8 = gridProductos.column(10).index('visible');
                            $(trElement).find('td').eq(visibleIndex8).addClass('blinking');
                        } else if (colIndex === 10) { // PorcentajeGanancia
                            rowData.PorcGanancia = parseDecimal(newValue); // Actualizar PorcentajeGanancia

                            // Calcular PrecioVenta basado en PrecioCosto y PorcentajeGanancia
                            rowData.PVenta = rowData.PCosto + (rowData.PCosto * (rowData.PorcGanancia / 100));

                            // Obtener el índice visible para las columnas correspondientes
                            var visibleIndex8 = gridProductos.column(10).index('visible');
                            var visibleIndex9 = gridProductos.column(7).index('visible');

                            // Aplicar el efecto de parpadeo a las celdas de PorcentajeGanancia y PrecioVenta
                            $(trElement).find('td').eq(visibleIndex8).addClass('blinking');
                            $(trElement).find('td').eq(visibleIndex9).addClass('blinking');
                        } else {
                            rowData[gridProductos.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo
                        }

                        // Actualizar la fila en la tabla con los nuevos datos
                        gridProductos.row(trElement).data(rowData).draw();

                        // Aplicar el parpadeo solo si el texto cambió
                        if (originalText !== newText) {
                            celda.addClass('blinking'); // Aplicar la clase 'blinking' a la celda que fue editada
                        }

                        // Enviar los datos al servidor
                        guardarCambiosFila(rowData);


                        // Desactivar el modo de edición
                        isEditing = false;

                        // Eliminar la clase 'blinking' después de 3 segundos (para hacer el efecto de parpadeo)
                        setTimeout(function () {
                            $(trElement).find('td').removeClass('blinking');
                        }, 3000);
                    }


                    // Función para cancelar la edición
                    function cancelEdit() {
                        // Restaurar el valor original
                        gridProductos.cell(cell.index()).data(originalData).draw();
                        isEditing = false;
                    }
                });


                // Condicional para ocultar columnas si ModoVendedor == 1
                if (userSession.ModoVendedor == 1) {
                    gridProductos.column(6).visible(false); // Ocultar la columna Precio Costo
                    gridProductos.column(10).visible(false); // Ocultar la columna TotalGanancia
                }

                // Redibujar la tabla después de aplicar filtros y cambios de visibilidad
                api.columns().every(function () {
                    var column = this;
                    var input = $('.filters th').eq(column.index()).find('input');
                    var select = $('.filters th').eq(column.index()).find('select');

                    // Aplicar los filtros de texto
                    if (input.length > 0) {
                        input.val('');
                    }

                    // Aplicar los filtros de selección
                    if (select.length > 0) {
                        select.val('');
                    }
                });
            },
        });

    } else {
        gridProductos.clear().rows.add(data).draw();
    }
}

// Actualizar la visibilidad de la columna 'Proveedor'
async function actualizarVisibilidadProveedor(visible) {
    var column = gridProductos.column(2); // Asumimos que la columna 'Proveedor' es la tercera columna (índice 2)
    column.visible(visible);

    // Si la columna es visible, configurar su filtro select
    if (visible) {
        var cell = $('.filters th').eq(2);
        var select = $('<select id="filter2"><option value="">Seleccionar</option></select>')
            .appendTo(cell.empty())
            .on('change', function () {

                var val = $(this).val();
                var selectedText = $(this).find('option:selected').text(); // Obtener el texto del nombre visible
                //await api.column(config.index).search(val ? '^' + selectedText + '$' : '', true, false).draw(); // Buscar el texto del nombre

                gridProductos.column(2).search(val ? '^' + selectedText + '$' : '', true, false).draw();
            });

        try {
            var data = await listaProveedoresFilter(); // Obtener datos de proveedores
            data.forEach(function (item) {
                select.append('<option value="' + item.Nombre + '">' + item.Nombre + '</option>');
            });
        } catch (error) {
            console.error("Error al obtener datos de proveedores:", error);
        }
    }

    // Redibujar la tabla después de cambiar la visibilidad
    gridProductos.draw();
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
    listaProveedores();
    $("#modalProveedores").modal("show");
}
async function listaProveedores() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Proveedores option').remove();

    selectProveedores = document.getElementById("Proveedores");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProveedores.appendChild(option);

    }
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
    listaClientes();
    $("#modalClientes").modal("show");
}
async function listaClientes() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Clientes option').remove();

    selectClientes = document.getElementById("Clientes");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectClientes.appendChild(option);

    }
}


function configurarOpcionesColumnas() {
    const grid = $('#grd_Productos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Productos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && !col.data.includes("Id") && col.data !== "Proveedor" && (userSession.ModoVendedor == 1 && col.data != "PCosto" && col.data != "PorcGanancia" || userSession.ModoVendedor == 0))  { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = col.data

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
        const columnIdx = parseInt($(this).data('column'), 20);
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

$('#UnidadesDeMedidas').on('change', function () {
    document.getElementById('txtProductoCantidad').value = 1;
    actualizarProductoCantidad();
});

function actualizarProductoCantidad() {
    const selectedText = $('#UnidadesDeMedidas option:selected').text(); // Obtiene el texto seleccionado
    const idCliente = parseInt(document.getElementById("clientesfiltro").value);
    
    if (selectedText === 'Pallet') {
        // Muestra el label y el input
        document.getElementById('txtProductoCantidad').removeAttribute('hidden');
        document.getElementById('lblProductoCantidad').removeAttribute('hidden');
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
    }
}

$('#txtProductoCantidad').on('input blur', function () {
    calcularTotal();
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