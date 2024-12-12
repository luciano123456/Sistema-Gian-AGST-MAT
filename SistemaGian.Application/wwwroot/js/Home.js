//#########################################################################################################################################################
//#########################################################################################################################################################
//#############################################################################CLIENTES####################################################################

let nombreConfiguracion
let controllerConfiguracion;
let listaVacia = false;

async function nuevoCliente() {
    limpiarModalCliente();
    $('#txtNombreCliente').on('input', function () {
        validarCamposCliente()
    });
    validarCamposCliente();
    await listaProvincias();
    $('#ModalEdicionCliente').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#ModalEdicionClienteLabel").text("Nuevo Cliente");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
}


async function listaProvincias() {
    const url = `/Clientes/ListaProvincias`;
    const response = await fetch(url);
    const data = await response.json();

    $('#ProvinciasClientes option').remove();

    selectProvincias = document.getElementById("ProvinciasClientes");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

function limpiarModalCliente() {
    const campos = ["IdCliente", "NombreCliente", "TelefonoCliente", "DireccionCliente", "IdProvinciaCliente", "LocalidadCliente", "DNICliente"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}

function registrarCliente() {
    if (validarCamposCliente()) {
        const idCliente = $("#txtIdCliente").val();
        const nuevoModelo = {
            "Id": idCliente !== "" ? idCliente : 0,
            "Nombre": $("#txtNombreCliente").val(),
            "Telefono": $("#txtTelefonoCliente").val(),
            "Direccion": $("#txtDireccionCliente").val(),
            "IdProvincia": $("#ProvinciasClientes").val(),
            "Localidad": $("#txtLocalidadCliente").val(),
            "DNI": $("#txtDNICliente").val()
        };

        const url = "Clientes/Insertar";
        const method = idCliente === "" ? "POST" : "PUT";

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
                const mensaje = idCliente === "" ? "Cliente registrado correctamente" : "Cliente modificado correctamente";
                $('#ModalEdicionCliente').modal('hide');
                exitoModal(mensaje);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}


function validarCamposCliente() {
    const nombre = $("#txtNombreCliente").val();
    const camposValidos = nombre !== "";

    $("#lblNombreCliente").css("color", camposValidos ? "" : "red");
    $("#txtNombreCliente").css("border-color", camposValidos ? "" : "red");


    return camposValidos;
}

//##########################################################################################################################################################
//##########################################################################################################################################################
//#############################################################################Proveedores#################################################################


function registrarProveedor() {
    if (validarCamposProveedor()) {
        const idProveedor = $("#txtIdProveedor").val();
        const nuevoModelo = {
            "Id": idProveedor !== "" ? idProveedor : 0,
            "Nombre": $("#txtNombreProveedor").val(),
            "Apodo": $("#txtApodoProveedor").val(),
            "Ubicacion": $("#txtUbicacionProveedor").val(),
            "Telefono": $("#txtTelefonoProveedor").val(),
        };

        const url = "Proveedores/Insertar";
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
                const mensaje = "Proveedor registrado correctamente";
                $('#ModalEdicionProveedor').modal('hide');
                exitoModal(mensaje);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}


function validarCamposProveedor() {
    const nombre = $("#txtNombreProveedor").val();
    const camposValidos = nombre !== "";

    $("#lblNombreProveedor").css("color", camposValidos ? "" : "red");
    $("#txtNombreProveedor").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}
function nuevoProveedor() {
    $('#txtNombreProveedor').on('input', function () {
        validarCamposProveedor()
    });
    limpiarModalProveedor();
    $('#ModalEdicionProveedor').modal('show');
    $("#btnGuardarProveedor").text("Registrar");
    $("#ModalEdicionProveedorLabel").text("Nuevo Proveedor");
    $('#lblNombreProveedor').css('color', 'red');
    $('#txtNombreProveedor').css('border-color', 'red');
}

async function mostrarModalProveedor(modelo) {
    const campos = ["IdProveedor", "NombreProveedor", "ApodoProveedor", "UbicacionProveedor", "TelefonoProveedor"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });


    $('#modalEdicionProveedor').modal('show');
    $("#btnGuardarProveedor").text("Guardar");
    $("#modalEdicionProveedorLabel").text("Editar Proveedor");

    $('#lblNombreProveedor, #txtNombreProveedor').css('color', '').css('border-color', '');
}




function limpiarModalProveedor() {
    const campos = ["IdProveedor", "NombreProveedor", "ApodoProveedor", "UbicacionProveedor", "TelefonoProveedor"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombreProveedor, #txtNombreProveedor").css("color", "").css("border-color", "");
}


//##########################################################################################################################################################
//##########################################################################################################################################################
//#########################################################################CHOFERES########################################################################

function registrarChofer() {
    if (validarCamposChofer()) {
        const idChofer = $("#txtIdChofer").val();
        const nuevoModelo = {
            "Id": idChofer !== "" ? idChofer : 0,
            "Nombre": $("#txtNombreChofer").val(),
            "Telefono": $("#txtTelefonoChofer").val(),
            "Direccion": $("#txtDireccionChofer").val(),
            "DNI": $("#txtDNIChofer").val()
        };

        const url = "Choferes/Insertar";
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
                const mensaje = "Chofer registrado correctamente";
                $('#modalEdicionChofer').modal('hide');
                exitoModal(mensaje);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}


function validarCamposChofer() {
    const nombre = $("#txtNombreChofer").val();
    const camposValidos = nombre !== "";

    $("#lblNombreChofer").css("color", camposValidos ? "" : "red");
    $("#txtNombreChofer").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}
function nuevoChofer() {
    limpiarModal();

    $('#txtNombreChofer').on('input', function () {
        validarCamposChofer()
    });

    $('#modalEdicionChofer').modal('show');
    $("#btnGuardarChofer").text("Registrar");
    $("#modalEdicionChoferLabel").text("Nuevo Chofer");
    $('#lblNombreChofer').css('color', 'red');
    $('#txtNombreChofer').css('border-color', 'red');
}

async function mostrarModalChofer(modelo) {
    const campos = ["IdChofer", "NombreChofer", "TelefonoChofer", "DireccionChofer"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });


    $('#modalEdicionChofer').modal('show');
    $("#btnGuardarChofer").text("Guardar");
    $("#modalEdicionChoferLabel").text("Editar Chofer");

    $('#lblNombreChofer, #txtNombreChofer').css('color', '').css('border-color', '');
}

function limpiarModal() {
    const campos = ["IdChofer", "NombreChofer", "TelefonoChofer", "DireccionChofer"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombreChofer, #txtNombreChofer").css("color", "").css("border-color", "");
}

function abrirConfiguraciones() {
    $('#ModalEdicionConfiguraciones').modal('show');
    $("#btnGuardarConfiguracion").text("Aceptar");
    $("#modalEdicionLabel").text("Configuraciones");
}

async function listaMarcas() {
    const url = `/Productos/ListaMarcas`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(marca => ({
        Id: marca.Id,
        Nombre: marca.Nombre
    }));

}

async function listaConfiguracion() {
    const url = `/${controllerConfiguracion}/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(configuracion => ({
        Id: configuracion.Id,
        Nombre: configuracion.Nombre
    }));

}




async function abrirConfiguracion(_nombreConfiguracion, _controllerConfiguracion) {
    $('#ModalEdicionConfiguraciones').modal('hide');
    $('#modalConfiguracion').modal('show');

    cancelarModificarConfiguracion();

    $('#txtNombreConfiguracion').on('input', function () {
        validarCamposConfiguracion()
    });

    nombreConfiguracion = _nombreConfiguracion;
    controllerConfiguracion = _controllerConfiguracion
    llenarConfiguraciones()


    document.getElementById("modalConfiguracionLabel").innerText = "Configuracion de " + nombreConfiguracion;

}

async function llenarConfiguraciones() {
    let configuraciones = await listaConfiguracion();

    document.getElementById("lblListaVacia").innerText = "";
    document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");

    $("#configuracion-list").empty();

    if (configuraciones.length == 0) {
        document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
        document.getElementById("lblListaVacia").style.color = 'red';
        document.getElementById("lblListaVacia").removeAttribute("hidden");
        listaVacia = true;

    } else {

        listaVacia = false;
        configuraciones.forEach((configuracion, index) => {
            var indexado = configuracion.Id
            $("#configuracion-list").append(`
                         <div class="list-item" data-id="${configuracion.Id}">
                    <span>${configuracion.Nombre}</span>
                    
                    <i class="fa fa-pencil-square-o edit-icon text-white" data-index="${indexado}" onclick="editarConfiguracion(${indexado})" style="float: right;"></i>
                    <i class="fa fa-trash eliminar-icon text-danger" data-index="${indexado}" onclick="eliminarConfiguracion(${indexado})"></i>
                </div>
                    `);
        });
    }
}


async function eliminarConfiguracion(id) {
    let resultado = window.confirm("¿Desea eliminar la " + nombreConfiguracion + "?");

    if (resultado) {
        try {
            const response = await fetch(controllerConfiguracion + "/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar la " + nombreConfiguracion);
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                llenarConfiguraciones()

                exitoModal(nombreConfiguracion + " eliminada correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}


const editarConfiguracion = id => {
    fetch(controllerConfiguracion + "/EditarInfo?id=" + id)
        .then(response => {
            if (!response.ok) throw new Error("Ha ocurrido un error.");
            return response.json();
        })
        .then(dataJson => {
            if (dataJson !== null) {
                document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Modificar";
                document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
                document.getElementById("txtNombreConfiguracion").value = dataJson.Nombre;
                document.getElementById("txtIdConfiguracion").value = dataJson.Id;
                document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");
            } else {
                throw new Error("Ha ocurrido un error.");
            }
        })
        .catch(error => {
            errorModal("Ha ocurrido un error.");
        });
}


function validarCamposConfiguracion() {
    const nombre = $("#txtNombreConfiguracion").val();
    const camposValidos = nombre !== "";

    $("#lblNombreConfiguracion").css("color", camposValidos ? "" : "red");
    $("#txtNombreConfiguracion").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}

function guardarCambiosConfiguracion() {
    if (validarCamposConfiguracion()) {
        const idConfiguracion = $("#txtIdConfiguracion").val();
        const nuevoModelo = {
            "Id": idConfiguracion !== "" ? idConfiguracion : 0,
            "Nombre": $("#txtNombreConfiguracion").val(),
        };

        const url = idConfiguracion === "" ? controllerConfiguracion + "/Insertar" : controllerConfiguracion + "/Actualizar";
        const method = idConfiguracion === "" ? "POST" : "PUT";

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
                const mensaje = idConfiguracion === "" ? nombreConfiguracion + " registrada correctamente" : nombreConfiguracion + " modificada correctamente";
                llenarConfiguraciones()
                cancelarModificarConfiguracion();
                exitoModal(mensaje)
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}


function cancelarModificarConfiguracion() {
    document.getElementById("txtNombreConfiguracion").value = "";
    document.getElementById("txtIdConfiguracion").value = "";
    document.getElementById("contenedorNombreConfiguracion").setAttribute("hidden", "hidden");
    document.getElementById("agregarConfiguracion").removeAttribute("hidden");

    if (listaVacia == true) {
        document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
        document.getElementById("lblListaVacia").style.color = 'red';
        document.getElementById("lblListaVacia").removeAttribute("hidden");
    }
}

function agregarConfiguracion() {
    document.getElementById("txtNombreConfiguracion").value = "";
    document.getElementById("txtIdConfiguracion").value = "";
    document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");
    document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
    document.getElementById("lblListaVacia").innerText = "";
    document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");
    document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Agregar";

    $('#lblNombreConfiguracion').css('color', 'red');
    $('#txtNombreConfiguracion').css('border-color', 'red');
} 
