let gridZonas;
const precioInput = document.getElementById('txtPrecio');
var selectedZonas = [];
let isEditing = false;


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

    listaZonas(-1);
    listaClientesFiltro();
    listaZonasFiltro();

    inicializarSonidoNotificacion();

    document.addEventListener("touchstart", desbloquearAudio, { once: true });
    document.addEventListener("click", desbloquearAudio, { once: true });

    $('#txtNombre').on('input', function () {
        validarCampos()
    });

    $("#Clientes").select2({
        dropdownParent: $("#modalClientes"),
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });

    $("#clientesfiltro, #zonasfiltro").select2({
        placeholder: "Selecciona una opción",
        allowClear: false
    });




})

function guardarCambios() {
    if (validarCampos()) {
        const idZona = $("#txtId").val();
        const idCliente = $("#clientesfiltro").val();
        const zona = $("#txtNombre").val();
        const cliente = $("#clientesfiltro option:selected").text();


        const nuevoModelo = {
            "Id": idZona !== "" ? idZona : 0,
            "Nombre": zona,
            "Precio": formatoNumero($("#txtPrecio").val()),
            "IdCliente": idCliente,
        };

        const url = idZona === "" ? "Zonas/Insertar" : "Zonas/Actualizar";
        const method = idZona === "" ? "POST" : "PUT";

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
                let mensaje = "";

                if (idZona === "") {
                    mensaje = "Zona registrada correctamente."
                } else {
                    mensaje = idCliente > 0 ? ` ${zona} del cliente ${cliente} modificada correctamente` : "Zona modificada correctamente."
                };

                /*const mensaje = idZona === "" ? "Zona registrada correctamente" : "Zona modificada correctamente";*/


                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                listaZonas($("#clientesfiltro").val());
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}
function validarCampos() {
    const nombre = $("#txtNombre").val();
    const camposValidos = nombre !== "";

    $("#lblNombre").css("color", camposValidos ? "" : "red");
    $("#txtNombre").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}
function nuevaZona() {
    limpiarModal();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nueva Zona");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
    document.getElementById(`txtPrecio`).value = "$0.00";
}
async function mostrarModal(modelo) {
    let idCliente = $("#clientesfiltro").val();

    const campos = ["Id", "Nombre", "Precio"];
    campos.forEach(campo => {
        if (campo == "Precio") {
            $(`#txt${campo}`).val(formatNumber(modelo[campo]));
        } else {
            $(`#txt${campo}`).val(modelo[campo]);
        }
    });

    if (idCliente > 0) {
        $("#txtNombre").attr("disabled", true);
    } else {
        $("#txtNombre").attr("disabled", false);
    }


    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Zona");

    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
}
function limpiarModal() {
    const campos = ["Id", "Nombre", "Precio"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}

async function listaZonas(idCliente) {
    let paginaActual = gridZonas != null ? gridZonas.page() : 0;
    document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");

    selectedZonas = [];

    const url = `/Zonas/Lista?IdCliente=${idCliente}`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);

    if (paginaActual > 0) gridZonas.page(paginaActual).draw('page');
}

const editarZona = id => {
    let idCliente = $("#clientesfiltro").val();

    fetch(`Zonas/EditarInfo?id=${id}&idCliente=${idCliente}`)
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
async function eliminarZona(id) {
    let resultado = window.confirm("¿Desea eliminar la Zona?");

    var idCliente = document.getElementById("clientesfiltro").value;

    if (resultado) {
        try { 
            const response = await fetch(`Zonas/Eliminar?id=${id}&idCliente=${idCliente}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar la Zona.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                aplicarFiltros();
                exitoModal("Zona eliminada correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridZonas) {
        $('#grd_Zonas thead tr').clone(true).addClass('filters').appendTo('#grd_Zonas thead');

        gridZonas = $('#grd_Zonas').DataTable({
            data: data,
            language: {
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data) {
                        return `
                        <div class="acciones-menu" data-id="${data}">
                            <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                                <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                            </button>
                            <div class="acciones-dropdown" style="display: none;">
                                <button class='btn btn-sm btneditar' type='button' onclick='editarZona(${data})' title='Editar'>
                                    <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                                </button>
                                <button class='btn btn-sm btneliminar' type='button' onclick='eliminarZona(${data})' title='Eliminar'>
                                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                                </button>
                            </div>
                            <span class="custom-checkbox" data-id='${data}'>
                                <i class="fa fa-square-o checkbox"></i>
                            </span>
                        </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre', title: 'Nombre' },
                { data: 'Cliente', title: 'Cliente', defaultContent: '', visible: false }, // << NUEVA
                {
                    data: 'Precio',
                    title: 'Precio',
                    render: function (data) { return formatNumber(data); },
                    className: 'text-end'
                },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Reporte Zonas', title: '',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const colVisible = $(node).is(':visible');
                            return colVisible && idx > 0; // evita la de acciones
                        }
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5', text: 'Exportar PDF', filename: 'Reporte Zonas', title: '',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const colVisible = $(node).is(':visible');
                            return colVisible && idx > 0;
                        }
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print', text: 'Imprimir', title: '',
                    exportOptions: {
                        columns: function (idx, data, node) {
                            const colVisible = $(node).is(':visible');
                            return colVisible && idx > 0;
                        }
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                // Filtros por columna (como ya hacías)
                const columnConfig = [
                    { index: 1, filterType: 'text' }, // Nombre
                    { index: 2, filterType: 'text' }, // Cliente (se creará solo si está visible)
                    { index: 3, filterType: 'text' }, // Precio
                ];

                columnConfig.forEach(async (config) => {
                    const cell = $('.filters th').eq(config.index);
                    if (gridZonas.column(config.index).visible() === false) {
                        cell.empty().hide();
                        return;
                    }
                    cell.empty().show();
                    if (config.filterType === 'text') {
                        $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell)
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                var regexr = '({search})';
                                var cursorPosition = this.selectionStart;
                                api.column(config.index)
                                    .search(this.value != '' ? regexr.replace('{search}', '(((' + this.value + ')))') : '',
                                        this.value != '', this.value == '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                });

                // Ocultar filtro de la primera columna (acciones)
                $('.filters th').eq(0).html('');

                // Al iniciar, aseguramos la columna Cliente oculta
                await actualizarVisibilidadCliente(false);

                // Rebind de los checkboxes
                $('#grd_Zonas').on('draw.dt', function () {
                    $(document).off('click', '.custom-checkbox');
                    $(document).on('click', '.custom-checkbox', handleCheckboxClick);
                });
            },
        });
    } else {
        gridZonas.clear().rows.add(data).draw();
    }
}


precioInput.addEventListener('blur', function () {
    const rawValue = this.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsedValue = parseFloat(rawValue) || 0;

    // Formatear el número al finalizar la edición
    this.value = formatNumber(parsedValue);

});

function formatNumber(number) {
    return '$' + number.toLocaleString('es-AR');
}

function configurarOpcionesColumnas() {
    const grid = $('#grd_Zonas').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Zonas_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

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
    container.find('.toggle-column').on('change', function () {
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

async function listaZonasFiltro() {
    const idCliente = $("#clientesfiltro").val() != "" ? $("#clientesfiltro").val() : -1;

    const url = `/Zonas/Lista?IdCliente=${idCliente}`;
    const response = await fetch(url);
    const data = await response.json();

    $('#zonasfiltro option').remove();

    select = document.getElementById("zonasfiltro");

    option = document.createElement("option");
    option.value = -1;
    option.text = "-";
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}


async function aplicarFiltros() {
    const idCliente = parseInt(document.getElementById("clientesfiltro").value || "-1", 10);
    const idZona = parseInt(document.getElementById("zonasfiltro").value || "-1", 10);

    // ocultar acciones masivas por defecto
    document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
    document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");

    selectedZonas = [];

    let url = "";

    if (idCliente === -1 && idZona > 0) {
        // Caso especial: mostrar columna Cliente y pedir data “clientes con esa zona”
        await actualizarVisibilidadCliente(true);
        url = `/Zonas/ListaFiltro?IdCliente=-1&IdZona=${idZona}`;
    } else {
        // Caso normal: ocultar columna Cliente y reusar listado actual por cliente
        await actualizarVisibilidadCliente(false);
        url = `/Zonas/Lista?IdCliente=${idCliente}`;
        // Si querés que además filtre por zona en el backend común:
        // url = `/Zonas/ListaFiltro?IdCliente=${idCliente}&IdZona=${idZona}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(response.statusText);
        const dataJson = await response.json();
        await configurarDataTable(dataJson);
    } catch (err) {
        console.error(err);
    }

    await listaZonasFiltro();
}



function actualizarBotonesAccion() {
    const idClienteFiltro = $("#clientesfiltro").val();

    if (selectedZonas.length > 0 && idClienteFiltro <= 0) {
        document.getElementById("btnAsignarCliente").removeAttribute("hidden");
    } else {
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
    }

    if (selectedZonas.length > 0) {
        document.getElementById("btnAumentarPrecios").removeAttribute("hidden");
        document.getElementById("btnBajarPrecios").removeAttribute("hidden");
    } else {
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");
    }
}

$('#selectAllCheckbox').on('change', function () {
    const checked = $(this).is(':checked');

    // Limpiar selección actual
    selectedZonas = [];

    $('.custom-checkbox').each(function () {
        const icon = $(this).find('.fa');
        const id = $(this).data('id');

        if (checked) {
            if (!icon.hasClass('checked')) {
                icon.addClass('checked fa-check-square').removeClass('fa-square-o');
            }
            if (!selectedZonas.includes(id)) {
                selectedZonas.push(id);
            }
        } else {
            icon.removeClass('checked fa-check-square').addClass('fa-square-o');
        }
    });

    actualizarBotonesAccion();
});


// Manejar el click en el checkbox
function handleCheckboxClick(event) {
    // Encontrar el contenedor más cercano .custom-checkbox
    var checkbox = $(event.target).closest('.custom-checkbox');

    // Obtener el ID del checkbox
    var ventaId = checkbox.data('id');

    // Verificar si ventaId es undefined
    if (ventaId === undefined) {
        console.error("No se encontró el atributo data-id.");
        return;
    }

    var icon = checkbox.find('.fa'); // Obtener el icono dentro del checkbox

    // Alternar la clase "checked" para el icono
    icon.toggleClass('checked');

    // Si el checkbox está marcado
    if (icon.hasClass('checked')) {
        icon.removeClass('fa-square-o');
        icon.addClass('fa-check-square');
        selectedZonas.push(ventaId);
    } else { // Si no está marcado
        icon.removeClass('fa-check-square');
        icon.addClass('fa-square-o');
        var indexToRemove = selectedZonas.indexOf(ventaId);
        if (indexToRemove !== -1) {
            selectedZonas.splice(indexToRemove, 1);
        }
    }

    // Mostrar u ocultar el botón dependiendo de la selección
    if (selectedZonas.length > 0) {
        document.getElementById("btnAsignarCliente").removeAttribute("hidden");
    } else {
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
    }

    if (selectedZonas.length > 0) {
        document.getElementById("btnAumentarPrecios").removeAttribute("hidden");
        document.getElementById("btnBajarPrecios").removeAttribute("hidden");
    } else {
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");
    }

    console.log(selectedZonas);
}
function desmarcarCheckboxes() {
    // Obtener todos los elementos con la clase 'custom-checkbox' dentro de la tabla
    var checkboxes = gridZonas.cells('.custom-checkbox').nodes(); // Utiliza 'cells' para obtener las celdas en lugar de 'column'

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
    selectedZonas = [];

    // Ocultar el botón
    document.getElementById("btnAsignarCliente").removeAttribute("hidden");
}


function abrirmodalClientes() {
    listaClientes();
    $("#modalClientes").modal("show");
}

async function listaClientes() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Clientes option').remove();

    select = document.getElementById("Clientes");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}


function asignarCliente() {

    const nuevoModelo = {
        zonas: JSON.stringify(selectedZonas),
        idCliente: document.getElementById("Clientes").value

    };

    const url = "Zonas/InsertarZonaCliente";
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
                const mensaje = "Cliente asignado correctamente";
                exitoModal(mensaje);
            } else {
                const mensaje = "Ha ocurrido un error al asignar el proveedor";
                errorModal(mensaje);
            }
            $("#modalClientes").modal("hide");

            //desmarcarCheckboxes();
            //listaProductos();

        })
        .catch(error => {
            console.error('Error:', error);
        });
}


async function guardarCambiosFila(rowData) {
    try {
        rowData.IdCliente = document.getElementById("clientesfiltro").value;  // Puedes modificar este valor según necesites.


        const response = await fetch('/Zonas/Actualizar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rowData)
        });

        if (response.ok) {
            return true;
        } else {
            errorModal('Ha ocurrido un error al guardar los datos...')
        }
    } catch (error) {
        console.error('Error de red:', error);
    }
}


function abrirmodalAumentarPrecios() {
    $("#txtAumentoPrecio").val("0");
    $("#modalAumentar").modal("show");

}

function abrirmodalBajarPrecios() {
    $("#txtBajaPrecio").val("0");
    $("#modalBajar").modal("show");
}


function validarCamposAumentar() {
    const aumento = $("#txtAumentoPrecio").val();

    const aumentoValido = aumento !== "";

    $("#lblAumentoPrecio").css("color", aumentoValido ? "" : "red");
    $("#txtAumentoPrecio").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}

function validarCamposBajar() {
    const aumento = $("#txtAumentoPrecio").val();

    const aumentoValido = aumento !== "";

    $("#lblBajaPrecio").css("color", aumentoValido ? "" : "red");
    $("#txtBajaPrecio").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}


function aumentarPrecios() {

    if (validarCamposAumentar) {
        const idClienteFiltro = $("#clientesfiltro").val();

        const nuevoModelo = {
            zonas: JSON.stringify(selectedZonas),
            idCliente: idClienteFiltro,
            Porcentaje: document.getElementById("txtAumentoPrecio").value,

        };

        const url = "Zonas/AumentarPrecios";
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
                aplicarFiltros();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos')
    }
}

function bajarPrecios() {
   
    if (validarCamposBajar) {
        const idClienteFiltro = $("#clientesfiltro").val();
        const nuevoModelo = {
            zonas: JSON.stringify(selectedZonas),
            idCliente: idClienteFiltro,
            Porcentaje: document.getElementById("txtBajaPrecio").value,

        };

        const url = "Zonas/BajarPrecios";
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
                aplicarFiltros();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos')
    }
}


async function actualizarVisibilidadCliente(visible) {
    const columnIndex = 2; // índice de la columna Cliente (ver más abajo)
    const column = gridZonas.column(columnIndex);

    column.visible(visible);
    $('.filters th').eq(columnIndex).toggle(visible);

    if (visible) {
        const cell = $('.filters th').eq(columnIndex);
        cell.empty();

        // filtro text simple (o select si querés)
        const input = $('<input type="text" placeholder="Buscar..." />')
            .appendTo(cell)
            .on('keyup change', function (e) {
                e.stopPropagation();
                var regexr = '({search})';
                var cursorPosition = this.selectionStart;
                gridZonas.column(columnIndex)
                    .search(this.value != '' ? regexr.replace('{search}', '(((' + this.value + ')))') : '',
                        this.value != '', this.value == '')
                    .draw();
                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
            });
    }

    gridZonas.columns().adjust().draw();
}



const connection = new signalR.HubConnectionBuilder()
    .withUrl("/notificacionesHub")
    .build();

connection.on("ActualizarSignalR", async function (data) {
    const userSession = JSON.parse(localStorage.getItem('userSession'));

    if (data.idUsuario !== userSession.Id) {
        reproducirSonidoNotificacion();

        const filaEnEdicion = document.querySelector('#grd_zonas input, #grd_zonas select');
        const tr = filaEnEdicion ? filaEnEdicion.closest('tr') : null;
        const idEditando = tr ? gridZonas.row(tr).data()?.Id : null;

        const estabaEditando = !!filaEnEdicion;

        if (estabaEditando) {
            // Cancelar edición
            const cell = gridZonas.cell(filaEnEdicion.closest('td'));
            const valorOriginal = cell.data();
            cell.data(valorOriginal).draw(false);
        }

        if (typeof aplicarFiltros === "function") {
            await aplicarFiltros();
        }

        setTimeout(() => {
            if (typeof marcarFilaCambio === "function") {
                marcarFilaCambio(gridZonas, data.id, data.tipo?.toLowerCase());
            }

            if (estabaEditando && idEditando === data.id) {
                const rowIdx = gridZonas.rows().indexes().toArray().find(idx => {
                    const rowData = gridZonas.row(idx).data();
                    return rowData?.Id === idEditando;
                });

                if (rowIdx !== undefined) {
                    const rowNode = gridZonas.row(rowIdx).node();
                    const firstEditableCell = rowNode.querySelector('td:not(:first-child)');
                    if (firstEditableCell) {
                        firstEditableCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                    }
                }
            }
        }, 500);

        // Notificación
        const tipo = data.tipo?.toLowerCase();
        let mensaje = `#${data.nombre} ${data.tipo} por ${data.usuario}.`;

        if ((tipo === "actualizada" || tipo === "eliminada") && data.cliente) {
            mensaje = `#${data.nombre} del cliente ${data.cliente} ${data.tipo} por ${data.usuario}.`;
        }

        const opciones = {
            timeOut: 5000,
            positionClass: "toast-bottom-right",
            progressBar: true,
            toastClass: "toastr ancho-personalizado"
        };

        if (tipo === "eliminada") {
            toastr.error(mensaje, "Zonas", opciones);
        } else if (tipo === "actualizada") {
            toastr.warning(mensaje, "Zonas", opciones);
        } else {
            toastr.success(mensaje, "Zonas", opciones);
        }
    }
});


connection.start()
    .then(() => console.log("✅ SignalR conectado"))
    .catch(err => console.error(err.toString()));




