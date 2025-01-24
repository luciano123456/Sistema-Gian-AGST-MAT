﻿let gridChoferes;

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
    const url = `/Choferes/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
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

            },
});
    } else {
    gridChoferes.clear().rows.add(data).draw();
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