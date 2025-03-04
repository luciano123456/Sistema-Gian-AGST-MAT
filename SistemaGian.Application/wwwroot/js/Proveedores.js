﻿let gridProveedores;
let isEditing = false;



const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Apodo: "",
    Ubicacion: "",
    Telefono: "",
}

$(document).ready(() => {

    listaProveedores();

    $('#txtNombre').on('input', function () {
        validarCampos()
    });

  
})



function guardarCambios() {
    if (validarCampos()) {
        const idProveedor = $("#txtId").val();
        const nuevoModelo = {
            "Id": idProveedor !== "" ? idProveedor : 0,
            "Nombre": $("#txtNombre").val(),
            "Apodo": $("#txtApodo").val(),
            "Ubicacion": $("#txtUbicacion").val(),
            "Telefono": $("#txtTelefono").val(),
        };

        const url = idProveedor === "" ? "Proveedores/Insertar" : "Proveedores/Actualizar";
        const method = idProveedor === "" ? "POST" : "PUT";

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
                const mensaje = idProveedor === "" ? "Proveedor registrado correctamente" : "Proveedor modificado correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                listaProveedores();
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
function nuevoProveedor() {
    limpiarModal();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Proveedor");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
}

async function mostrarModal(modelo) {
    const campos = ["Id", "Nombre", "Apodo", "Ubicacion", "Telefono"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });


    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Proveedor");

    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
}




function limpiarModal() {
    const campos = ["Id", "Nombre", "Apodo", "Ubicacion", "Telefono"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}



async function listaProveedores() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}

const editarProveedor = id => {
    fetch("Proveedores/EditarInfo?id=" + id)
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
async function eliminarProveedor(id) {
    let resultado = window.confirm("¿Desea eliminar el Proveedor?");

    if (resultado) {
        try {
            const response = await fetch("Proveedores/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Proveedor.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaProveedores();
                exitoModal("Proveedor eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridProveedores) {
        $('#grd_Proveedores thead tr').clone(true).addClass('filters').appendTo('#grd_Proveedores thead');
        gridProveedores = $('#grd_Proveedores').DataTable({
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarProveedor(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarProveedor(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre' },
                { data: 'Apodo' },
                {
                    data: function (row) {
                        return row.Ubicacion && row.Ubicacion.trim() !== "" ? '<div class="location-cell"><i title="Ir a Google Maps" class="fa fa-map-marker fa-2x text-warning"></i> ' + row.Ubicacion + '</div>' : row.Ubicacion;
                    }
                },

                { data: 'Telefono' },
               
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Proveedores',
                    title: '',
                    exportOptions: {
                        columns:  [1, 2, 3, 4]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Proveedores',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4]
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

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

                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                configurarOpcionesColumnas();

                setTimeout(function () {
                    gridProveedores.columns.adjust();
                }, 10);

                $('body').on('mouseenter', '#grd_Proveedores .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });

        

                $('body').on('click', '#grd_Proveedores .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });

                $('#grd_Proveedores tbody').on('dblclick', 'td', async function () {
                    var cell = gridProveedores.cell(this);
                    var originalData = cell.data();
                    var colIndex = cell.index().column;
                    var rowData = gridProveedores.row($(this).closest('tr')).data();

                 
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
                                saveEdit(colIndex, gridProveedores.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            } else if (e.key === 'Escape') {
                                cancelEdit();
                            }
                        });

                    var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                        if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                            saveEdit(colIndex, gridProveedores.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
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
                        var originalText = gridProveedores.cell(trElement, colIndex).data();

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
                       
                            rowData[gridProveedores.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo
                       
                        // Actualizar la fila en la tabla con los nuevos datos
                        gridProveedores.row(trElement).data(rowData).draw();

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
                        gridProveedores.cell(cell.index()).data(originalData).draw();
                        isEditing = false;
                    }
                });
            },
});
    } else {
    gridProveedores.clear().rows.add(data).draw();
}
}


function configurarOpcionesColumnas() {
    const grid = $('#grd_Proveedores').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Proveedores_Columnas`; // Clave única para esta pantalla

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

$(document).on('click', function (e) {
    // Verificar si el clic está fuera de cualquier dropdown
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
});

async function guardarCambiosFila(rowData) {
    try {
        const response = await fetch('/Proveedores/Actualizar', {
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
