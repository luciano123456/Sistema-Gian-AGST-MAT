let gridChoferes;
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

    listaChoferes();

    inicializarSonidoNotificacion();

    document.addEventListener("touchstart", desbloquearAudio, { once: true });
    document.addEventListener("click", desbloquearAudio, { once: true });

    $('#txtNombre').on('input', function () {
        validarCampos()
    });
})

function guardarCambios() {
    if (validarCampos()) {
        const idChofer = $("#txtId").val();
        const nuevoModelo = {
            "Id": idChofer !== "" ? idChofer : 0,
            "Nombre": $("#txtNombre").val(),
            "Telefono": $("#txtTelefono").val(),
            "Direccion": $("#txtDireccion").val(),
            "DNI": $("#txtDNI").val()
        };

        const url = idChofer === "" ? "Choferes/Insertar" : "Choferes/Actualizar";
        const method = idChofer === "" ? "POST" : "PUT";

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
                const mensaje = idChofer === "" ? "Chofer registrado correctamente" : "Chofer modificado correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                listaChoferes();
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
function nuevoChofer() {
    limpiarModal();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Chofer");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
}
async function mostrarModal(modelo) {
    const campos = ["Id", "Nombre", "Telefono", "Direccion"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });


    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Chofer");

    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
}
function limpiarModal() {
    const campos = ["Id", "Nombre", "Telefono", "Direccion"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}
async function listaChoferes() {
    let paginaActual = gridChoferes != null ? gridChoferes.page() : 0;
    const url = `/Choferes/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
    if (paginaActual > 0) gridChoferes.page(paginaActual).draw('page');
}

const editarChofer = id => {
    fetch("Choferes/EditarInfo?id=" + id)
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
async function eliminarChofer(id) {
    let resultado = window.confirm("¿Desea eliminar el Chofer?");

    if (resultado) {
        try {
            const response = await fetch("Choferes/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Chofer.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaChoferes();
                exitoModal("Chofer eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridChoferes) {
        $('#grd_Choferes thead tr').clone(true).addClass('filters').appendTo('#grd_Choferes thead');
        gridChoferes = $('#grd_Choferes').DataTable({
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarChofer(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarChofer(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre' },
                { data: 'Telefono' },
                {
                    data: function (row) {
                        return row.Direccion && row.Direccion.trim() !== ""
                            ? '<div class="location-cell"><i title="Ir a Google Maps" class="fa fa-map-marker fa-2x text-warning"></i> ' + row.Direccion + '</div>'
                            : ''; // Asegúrate de manejar la dirección vacía correctamente
                    },
                    createdCell: function (td, cellData, rowData, row, col) {
                        // Este código asegura que el HTML se procese y renderice correctamente
                        $(td).html(cellData); // Pasa el HTML procesado a la celda
                    }
                },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Choferes',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Choferes',
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
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                var api = this.api();

                // Obtener los índices de las columnas visibles
                var visibleColumns = api.columns(':visible').indexes().toArray();

                // Iterar sobre la configuración de filtros y aplicar a las columnas visibles
                columnConfig.forEach(async (config) => {
                    var columnIndex = config.index;

                    // Verificar si la columna está visible
                    if (visibleColumns.indexOf(columnIndex) !== -1) {

                        // Si la columna está oculta, sumamos 1 al índice de la celda
                        var adjustedIndex = visibleColumns.indexOf(columnIndex);

                        // Obtener la celda en la fila de filtros
                        var cell = $('.filters th').eq(adjustedIndex);

                        if (config.filterType === 'select') {
                            var select = $('<select id="filter' + columnIndex + '"><option value="">Seleccionar</option></select>')
                                .appendTo(cell.empty())
                                .on('change', async function () {
                                    var val = $(this).val();
                                    var selectedText = $(this).find('option:selected').text(); // Obtener el texto del nombre visible
                                    await api.column(columnIndex).search(val ? '^' + selectedText + '$' : '', true, false).draw(); // Buscar el texto del nombre
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
                                    api.column(columnIndex)
                                        .search(this.value != '' ? regexr.replace('{search}', '(((' + this.value + ')))') : '', this.value != '', this.value == '')
                                        .draw();$('.filters th').eq(lastColIdx).html(''); // Limpiar la última columna si es necesario
                                    $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                                });
                        }
                    }
                });


                var lastColIdx = api.columns().indexes().length - 1;
                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                configurarOpcionesColumnas()

                actualizarKpis(data);

                setTimeout(function () {
                    gridChoferes.columns.adjust();
                }, 10);

               

                $('body').on('mouseenter', '#grd_Choferes .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });


              
                $('body').on('click', '#grd_Choferes .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });

                $('#grd_Choferes tbody').on('dblclick', 'td', async function () {
                    var cell = gridChoferes.cell(this);
                    var originalData = cell.data();
                    var colIndex = cell.index().column;
                    var rowData = gridChoferes.row($(this).closest('tr')).data();


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
                                saveEdit(colIndex, gridChoferes.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            } else if (e.key === 'Escape') {
                                cancelEdit();
                            }
                        });

                    var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                        if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                            saveEdit(colIndex, gridChoferes.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                        }
                    });

                    var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                    // Reemplazar el contenido de la celda
                    $(this).empty().append(input).append(saveButton).append(cancelButton);

                    input.focus();


                    // Función para guardar los cambios
                    function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                        // Obtener el nodo de la celda desde el índice
                        var celda = $(trElement).find('td').eq(colIndex); // Obtener la celda correspondiente dentro de la fila
                        // Obtener el valor original de la celda
                        var originalText = gridChoferes.cell(trElement, colIndex).data();

                        if (colIndex === 3) {
                            var tempDiv = document.createElement('div'); // Crear un div temporal
                            tempDiv.innerHTML = originalText; // Establecer el HTML de la celda
                            originalText = tempDiv.textContent.trim(); // Extraer solo el texto
                            newText = newText.trim();
                        }

                        // Verificar si el texto realmente ha cambiado
                        if (originalText === newText) {
                            cancelEdit();
                            return; // Si no ha cambiado, no hacer nada
                        }

                        // Actualizar el valor de la fila según la columna editada

                        rowData[gridChoferes.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo

                        // Actualizar la fila en la tabla con los nuevos datos
                        gridChoferes.row(trElement).data(rowData).draw();

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
                            celda.removeClass('blinking');
                        }, 3000); // Duración de la animación de parpadeo (3 segundos)
                    }


                    // Función para cancelar la edición
                    function cancelEdit() {
                        // Restaurar el valor original
                        gridChoferes.cell(cell.index()).data(originalData).draw();
                        isEditing = false;
                    }
                });

            },
});
    } else {
        gridChoferes.clear().rows.add(data).draw();

        actualizarKpis(data);

}
}


function configurarOpcionesColumnas() {
    const grid = $('#grd_Choferes').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Choferes_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index != 3 ? col.data : "Direccion";

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

function toggleAcciones(id) {
    var $dropdown = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);

    // Si está visible, lo ocultamos, si está oculto lo mostramos
    if ($dropdown.is(":visible")) {
        $dropdown.hide();
    } else {
        // Ocultar todos los dropdowns antes de mostrar el seleccionado
        $('.acciones-dropdown').hide();
        $dropdown.show();
    }
}

$(document).on('click', function (e) {
    // Verificar si el clic está fuera de cualquier dropdown
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
});

async function guardarCambiosFila(rowData) {
    try {
        const response = await fetch('/Choferes/Actualizar', {
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


const connection = new signalR.HubConnectionBuilder()
    .withUrl("/notificacionesHub")
    .build();

connection.on("ActualizarSignalR", function (data) {
    const userSession = JSON.parse(localStorage.getItem('userSession'));

    if (data.idUsuario !== userSession.Id) {
        reproducirSonidoNotificacion();

        const tipo = data.tipo?.toLowerCase();
        const paginaActual = gridChoferes.page();

        // Si está editando, capturar ID, columna y cancelar edición
        let idEditando = null;
        let colEditando = null;

        if (isEditing) {
            const cell = gridChoferes.cell('td:has(input), td:has(select)');
            const rowData = gridChoferes.row(cell.index().row).data();
            idEditando = rowData?.Id;
            colEditando = cell.index().column;

            isEditing = false;
            gridChoferes.cell(cell.index()).data(cell.data()).draw();
        }

        listaChoferes().then(() => {
            setTimeout(() => {
                gridChoferes.page(paginaActual).draw('page');

                if (idEditando !== null && colEditando !== null) {
                    const rowIndex = gridChoferes.rows().indexes().toArray().find(i => gridChoferes.row(i).data().Id === idEditando);

                    if (rowIndex !== undefined) {
                        const cellNode = gridChoferes.cell(rowIndex, colEditando).node();
                        $(cellNode).trigger('dblclick');
                    }
                }

                if (typeof marcarFilaCambio === "function") {
                    const tipoAnimacion = tipo === "creado" ? "nueva" : "actualizada";
                    marcarFilaCambio(gridChoferes, data.id, tipoAnimacion);
                }
            }, 300);
        });

        // Toast
        let mensaje = `#${data.usuarioModificado} ${data.tipo} por ${data.usuario}.`;

        const opciones = {
            timeOut: 5000,
            positionClass: "toast-bottom-right",
            progressBar: true,
            toastClass: "toastr ancho-personalizado"
        };

        if (tipo === "eliminado") {
            toastr.error(mensaje, "Choferes", opciones);
        } else if (tipo === "actualizado") {
            toastr.warning(mensaje, "Choferes", opciones);
        } else {
            toastr.success(mensaje, "Choferes", opciones);
        }
    }
});


connection.start()
    .then(() => console.log("✅ SignalR conectado"))
    .catch(err => console.error(err.toString()));



function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    const el = document.getElementById('kpiChoferes');
    if (el) el.textContent = cant;
}