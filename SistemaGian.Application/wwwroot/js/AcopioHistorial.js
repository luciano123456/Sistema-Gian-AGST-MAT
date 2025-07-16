let gridAcopio;
let gridHistorial;

// Se ejecuta al cargar la página
$(document).ready(() => {
    cargarStock();

    $("#selectProductoMovimiento, #selectProveedorMovimiento").select2({
        dropdownParent: $("#modalMovimiento"),
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });
});

    
async function cargarStock() {
    const url = `/Acopio/ListaStock`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarTablaStock(data);
}



async function configurarTablaStock(data) {
    if (!gridAcopio) {
        // Clonar thead
        $('#grd_acopio thead tr').clone(true).addClass('filters').appendTo('#grd_acopio thead');

        gridAcopio = $('#grd_acopio').DataTable({
            data: data,
            language: {
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: 'IdProducto',
                    title: '',
                    width: "1%",
                    render: function (data, type, row) {
                        return `
                            <div class="acciones-menu" data-id="${data}">
                                <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})'>
                                    <i class='fa fa-ellipsis-v fa-lg text-white'></i>
                                </button>
                                <div class="acciones-dropdown" style="display:none;">
                                    <button class='btn btn-sm btnver' onclick='verHistorial(${data})' title='Ver historial'>
                                        <i class='fa fa-eye text-primary'></i> Ver Historial
                                    </button>
                                    <button
                                          class='btn btn-sm btnnuevo'
                                          onclick='nuevoMovimiento(${row.IdProducto}, ${row.IdProveedor})' 
                                          title='Nuevo movimiento'>
                                          <i class='fa fa-plus text-success'></i> Nuevo Movimiento
                                        </button>

                                </div>
                            </div>
                        `;
                    },
                    orderable: false,
                    searchable: false
                },
                { data: 'Proveedor', title: 'Proveedor' },
                { data: 'NombreProducto', title: 'Producto' },
                
                {
                    data: 'CantidadActual',
                    title: 'Stock Actual',
                    render: function (data, type, row) {
                        return `
            <div class="d-flex align-items-center justify-content-center">
                <span>${data}</span>
                <button class='btn btn-sm btnver' onclick='verHistorial(${row.IdProducto})' title='Ver historial'>
                    <i class='fa fa-eye text-primary'></i>
                </button>
            </div>
        `;
                    }
                },
                {
                    data: 'FechaUltimaActualizacion',
                    title: 'Última Actualización',
                    render: f => f ? formatearFechaParaVista(f) : "-"
                }
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'StockAcopio',
                    title: '',
                    className: 'btn-exportar-excel'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: function () {
                const api = this.api();

                // Configurar filtros de texto
                api.columns().every(function (index) {
                    const column = this;
                    if (index === 0) {
                        $('.filters th').eq(index).html('');
                        return;
                    }

                    const input = $('<input type="text" placeholder="Buscar..." />')
                        .appendTo($('.filters th').eq(index).empty())
                        .on('keyup change', function (e) {
                            e.stopPropagation();
                            const val = this.value;
                            const regexr = '({search})';
                            const cursorPosition = this.selectionStart;

                            column
                                .search(val !== '' ? regexr.replace('{search}', '(((' + val + ')))') : '', val !== '', val === '')
                                .draw();

                            $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                        });
                });

                configurarOpcionesColumnas()

                // Ajustar columnas tras renderizado
                setTimeout(() => {
                    gridAcopio.columns.adjust();
                }, 10);

                // Hover cursor
                $('#grd_acopio tbody').on('mouseenter', 'tr', function () {
                    $(this).css('cursor', 'pointer');
                });
            }
        });
    } else {
        gridAcopio.clear().rows.add(data).draw();
    }
}

async function verHistorial(idProducto) {
    const tbody = document.getElementById("tablaHistorialAcopioBody");
    const tfoot = document.getElementById("tablaHistorialAcopioFooter");

    tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center">Cargando...</td>
    </tr>
  `;
    tfoot.innerHTML = "";

    $("#modalHistorialAcopio").modal("show");

    try {
        const response = await fetch(`/Acopio/ListaHistorial?idProducto=${idProducto}`);
        if (!response.ok) throw new Error("Error en la respuesta del servidor");

        const data = await response.json();

        if (!data || data.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No hay movimientos registrados.</td>
        </tr>
      `;
            return;
        }

        let rows = "";
        let totalIngresos = 0;
        let totalEgresos = 0;

        data.forEach(item => {
            const fecha = item.Fecha
                ? formatearFechaParaVista(item.Fecha)
                : "-";

            const ingreso = item.Ingreso && item.Ingreso !== 0
                ? `<span class="text-success fw-bold"><i class="fa fa-plus"></i> ${item.Ingreso}</span>`
                : "-";

            const egreso = item.Egreso && item.Egreso !== 0
                ? `<span class="text-danger fw-bold"><i class="fa fa-minus"></i> ${item.Egreso}</span>`
                : "-";

            totalIngresos += item.Ingreso || 0;
            totalEgresos += item.Egreso || 0;

            const obsTexto = item.Observaciones || "";
            const maxLen = 100;
            const obsMostrada = obsTexto.length > maxLen
                ? obsTexto.substring(0, maxLen) + "..."
                : obsTexto;

            const obsHtml = `<span title="${obsTexto.replace(/"/g, "&quot;")}">${obsMostrada}</span>`;

            rows += `
<tr>
  <td class="text-center">${fecha}</td>
  <td class="text-center">${ingreso}</td>
  <td class="text-center">${egreso}</td>
  <td>${obsHtml}</td>
  <td class="text-center">
    <button class='btn btn-sm btneliminar' onclick='eliminarMovimiento(${item.Id}, ${item.IdProducto})'>
      <i class='fa fa-trash text-danger'></i>
    </button>
  </td>
</tr>
`;

        });

        tbody.innerHTML = rows;

        const saldoFinal = totalIngresos - totalEgresos;

        tfoot.innerHTML = `
    <tr>
        <td colspan="4" class="text-end small">
            <div class="d-flex justify-content-end gap-4">
                <div><strong>Total Ingresos:</strong> <span class="text-success">${totalIngresos} unidades</span></div>
                <div><strong>Total Egresos:</strong> <span class="text-danger">${totalEgresos} unidades</span></div>
                <div><strong>Stock Actual:</strong> <span class="${(totalIngresos - totalEgresos) >= 0 ? 'text-success' : 'text-danger'}">${totalIngresos - totalEgresos} unidades</span></div>
            </div>
        </td>
    </tr>
`;


    } catch (error) {
        console.error(error);
        tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger">Error al cargar historial.</td>
      </tr>
    `;
    }
}
async function nuevoMovimiento(idProducto, idProveedor) {
    $("#txtIngreso").val("");
    $("#txtObservaciones").val("");

    const selectProveedor = $("#selectProveedorMovimiento");
    const selectProducto = $("#selectProductoMovimiento");

    if (idProducto && idProveedor) {
        // Cargar todos los proveedores
        await listaProveedoresEnModal();

        // Seleccionar el proveedor
        selectProveedor.val(idProveedor);

        // Cargar productos del proveedor
        await listaProductosEnModal(idProveedor);

        // Seleccionar el producto
        selectProducto.val(idProducto);
    } else {
        // Si no hay IDs, limpiar todo
        selectProveedor.empty();
        selectProducto.empty();
        await listaProveedoresEnModal();
    }

    $("#modalMovimiento").modal("show");
}


$("#selectProveedorMovimiento").on("change", function () {
    const idProveedor = $(this).val();
    listaProductosEnModal(idProveedor);
});

// Cargar productos en el select si no viene ID
async function listaProveedoresEnModal() {
    const response = await fetch(`/Proveedores/Lista`);
    const data = await response.json();

    const select = $("#selectProveedorMovimiento");
    select.empty().append('<option value="">Seleccione un proveedor...</option>');

    data.forEach(p => {
        select.append(`<option value="${p.Id}">${p.Nombre}</option>`);
    });
}

// Cargar productos en el select si no viene ID
async function listaProductosEnModal(idProveedor) {
    const response = await fetch(`/Productos/ListaProductosProveedor?idProveedor=${idProveedor}`);
    const data = await response.json();

    const select = $("#selectProductoMovimiento");
    select.empty().append('<option value="">Seleccione un producto...</option>');

    data.forEach(p => {
        select.append(`<option value="${p.Id}">${p.Descripcion}</option>`);
    });
}

// Guardar el movimiento
async function guardarMovimiento() {
    const idProducto = $("#selectProductoMovimiento").val();
    const idProveedor = $("#selectProveedorMovimiento").val();
    const ingreso = parseFloat($("#txtIngreso").val()) || 0;
    const observaciones = $("#txtObservaciones").val();

    if (!idProveedor) {
        errorModal("Debe seleccionar un proveedor.");
        return;
    }

    if (!idProducto) {
        errorModal("Debe seleccionar un producto.");
        return;
    }
  
    if (ingreso <= 0) {
        errorModal("Debe ingresar una cantidad mayor a cero.");
        return;
    }

    const model = {
        IdProducto: idProducto,
        IdProveedor: idProveedor,
        Ingreso: ingreso,
        Egreso: 0,
        Observaciones: observaciones
    };

    try {
        const response = await fetch("/Acopio/InsertarMovimiento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(model)
        });

        if (response.ok) {
            $("#modalMovimiento").modal("hide");
            exitoModal("Movimiento registrado correctamente.");
            cargarStock();
        } else {
            errorModal("Error al registrar el movimiento.");
        }
    } catch (error) {
        console.error(error);
        errorModal("Error en la solicitud.");
    }
}

async function eliminarMovimiento(id, idProducto) {
    const confirmado = await confirmarModal("¿Desea eliminar este movimiento?");
    if (!confirmado) return;

    try {
        const response = await fetch(`/Acopio/EliminarMovimiento?id=${id}`, {
            method: "DELETE"
        });

        let data = {};
        if (response.headers.get("content-length") !== "0") {
            data = await response.json();
        }

        if (response.ok && data.valor) {
            exitoModal("Movimiento eliminado correctamente.");
            cargarStock();
            await verHistorial(idProducto);
        } else {
            const mensaje = data.mensaje || "No se pudo eliminar.";
            errorModal(mensaje);
        }
    } catch (error) {
        console.error(error);
        errorModal("Error al eliminar.");
    }
}


// Ocultar menús al hacer clic fuera
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide();
    }
});



async function aplicarFiltros() {
    const fechaDesde = $("#txtFechaDesde").val();
    const fechaHasta = $("#txtFechaHasta").val();

    const url = `/Acopio/ListaStock?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarTablaStock(data);
}


function configurarOpcionesColumnas() {
    const grid = $('#grd_acopio').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Acopios_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "IdProducto") { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = col.title || col.data;

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