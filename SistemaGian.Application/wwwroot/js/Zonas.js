let gridZonas;
const precioInput = document.getElementById('txtPrecio');
var selectedZonas = [];
let isEditing = false;


const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
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

    $('#txtNombre').on('input', function () {
        validarCampos()
    });

    $("#Clientes").select2({
        dropdownParent: $("#modalClientes"),
        width: "100%",
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
    document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");

    selectedZonas = [];

    const url = `/Zonas/Lista?IdCliente=${idCliente}`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
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

    if (resultado) {
        try {
            const response = await fetch("Zonas/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar la Zona.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaZonas();
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarZona(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarZona(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                    <span class="custom-checkbox" data-id='${data}'>
                                    <i class="fa ${checkboxClass} checkbox"></i>
                                </span>
                </div>
                `
                            ;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre', title: 'Nombre', },
                {
                    data: 'Precio',
                    title: 'Precio',
                    render: function (data) {
                        return formatNumber(data);
                    }
                },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Zonas',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Zonas',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2]
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear número en la columna
                    },
                    "targets": [2] // Columna Precio
                }
            ],
            orderCellsTop: true,
            fixedHeader: false,
            initComplete: async function () {

                // Ahora que gridZonas está inicializado, configuramos las opciones de columnas

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
                            select.append('<option value="' + item.Id + '">' + item.Nombre + '</option>');
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

                $('#grd_Zonas').on('draw.dt', function () {
                    $(document).off('click', '.custom-checkbox'); // Desvincular el evento anterior
                    $(document).on('click', '.custom-checkbox', handleCheckboxClick); // Asignar el evento correctamente
                });

                $(document).on('click', '.custom-checkbox', function (event) {
                    handleCheckboxClick(event);
                });


                var firstColIdx = 0;  // Índice de la primera columna
                $('.filters th').eq(firstColIdx).html(''); // Limpiar la primera columna



                setTimeout(function () {
                    gridZonas.columns.adjust();
                }, 10);

                configurarOpcionesColumnas();

                $('#grd_Zonas tbody').on('dblclick', 'td', async function () {
                    var cell = gridZonas.cell(this);
                    var originalData = cell.data();
                    var colIndex = cell.index().column;
                    var rowData = gridZonas.row($(this).closest('tr')).data();

                    // Verificar si la columna es la de usuario 
                    if (colIndex === 0) {
                        return; // No permitir editar en la columna de usuario
                    }

                    var idCliente = document.getElementById("clientesfiltro").value;
                    if (colIndex === 1 && idCliente > 0) {
                        return;
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

                    if (colIndex === 2) {
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
                                    saveEdit(colIndex, gridZonas.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                            });

                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                                saveEdit(colIndex, gridZonas.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            }
                        });

                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                        // Reemplazar el contenido de la celda
                        $(this).empty().append(input).append(saveButton).append(cancelButton);

                        input.focus();
                    } else { // Para las demás columnas
                        var valueToDisplay = originalData && originalData.trim() !== "" ? originalData.replace(/<[^>]+>/g, "") : originalData || "";

                        var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                            .val(valueToDisplay)
                            .on('input', function () {
                                var saveBtn = $(this).siblings('.fa-check'); // Botón de guardar

                                if (colIndex === 0) { // Validar solo si es la columna 0
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
                                    saveEdit(colIndex, gridZonas.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                            });

                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                                saveEdit(colIndex, gridZonas.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            }
                        });

                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                        // Reemplazar el contenido de la celda
                        $(this).empty().append(input).append(saveButton).append(cancelButton);

                        input.focus();
                    }

                    // Función para guardar los cambios
                    async function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                        // Obtener el nodo de la celda desde el índice
                        var celda = $(trElement).find('td').eq(colIndex); // Obtener la celda correspondiente dentro de la fila
                        // Obtener el valor original de la celda
                        var originalText = gridZonas.cell(trElement, colIndex).data();

                        // Verificar si el texto realmente ha cambiado
                        if (originalText === newText) {
                            cancelEdit();
                            return; // Si no ha cambiado, no hacer nada
                        }


                        if (colIndex === 2) { // Precio
                            rowData.Precio = parseFloat(convertirMonedaAFloat(newValue)); // Actualizar PrecioCosto
                        } else {
                            rowData[gridZonas.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo
                        }





                        // Enviar los datos al servidor
                        var resp = await guardarCambiosFila(rowData);

                        if (resp) {
                            // Aplicar el parpadeo solo si el texto cambió
                            if (originalText !== newText) {
                                // Actualizar la fila en la tabla con los nuevos datos
                                gridZonas.row(trElement).data(rowData).draw();
                                celda.addClass('blinking'); // Aplicar la clase 'blinking' a la celda que fue editada
                            }
                        } else {
                            cancelEdit();
                        }

                        // Desactivar el modo de edición
                        isEditing = false;

                        // Eliminar la clase 'blinking' después de 3 segundos (para hacer el efecto de parpadeo)
                        setTimeout(function () {
                            celda.removeClass('blinking');
                        }, 3000); // Duración de la animación de parpadeo (3 segundos)
                    }


                    // Función para cancelar la edición
                    function cancelEdit() {
                        // Restaurar el valor original
                        gridZonas.cell(cell.index()).data(originalData).draw();
                        isEditing = false;
                    }
                });

                // Agregar eventos al marcador
                $('body').on('mouseenter', '#grd_Zonas .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });
                $('body').on('click', '#grd_Zonas .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
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


async function aplicarFiltros() {
    const idCliente = document.getElementById("clientesfiltro").value;

    listaZonas(idCliente);
}

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
