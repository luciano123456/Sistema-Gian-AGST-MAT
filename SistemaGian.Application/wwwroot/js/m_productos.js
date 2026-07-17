/**
 * Modal de productos (m_productos) — alta/edición reutilizable en todas las pantallas.
 */
const ProductoModal = (function () {
    let ctx = { idCliente: -1, idProveedor: -1 };
    let onGuardadoCallback = null;
    let initialized = false;

    const $modal = () => $('#modalEdicionProducto');

    function setContext(options = {}) {
        ctx.idCliente = options.idCliente ?? -1;
        ctx.idProveedor = options.idProveedor ?? -1;
    }

    function onGuardado(fn) {
        onGuardadoCallback = typeof fn === 'function' ? fn : null;
    }

    function sumarPorcentaje() {
        const precioCosto = Number($('#txtPrecioCosto').val());
        const porcentajeGanancia = Number($('#txtPorcentajeGanancia').val());
        const productoCantidad = Number($('#txtProductoCantidad').val()) || 1;

        if (!isNaN(precioCosto) && !isNaN(porcentajeGanancia)) {
            let precioVenta = precioCosto + (precioCosto * (porcentajeGanancia / 100));
            const total = precioVenta * productoCantidad;
            precioVenta = precioVenta.toFixed(2);
            $('#txtPrecioVenta').val(precioVenta);
            $('#txtTotal').val(total);
            calcularTotal();
        }
    }

    function calcularTotal() {
        const precioCosto = Number($('#txtPrecioCosto').val());
        const porcentajeGanancia = Number($('#txtPorcentajeGanancia').val());
        const productoCantidad = Number($('#txtProductoCantidad').val()) || 1;

        if (!isNaN(precioCosto) && !isNaN(porcentajeGanancia)) {
            const precioVenta = precioCosto + (precioCosto * (porcentajeGanancia / 100));
            $('#txtTotal').val(precioVenta * productoCantidad);
        }
    }

    function calcularPorcentaje() {
        const precioCosto = Number($('#txtPrecioCosto').val());
        const precioVenta = Number($('#txtPrecioVenta').val());

        if (!isNaN(precioCosto) && !isNaN(precioVenta) && precioCosto !== 0) {
            let porcentajeGanancia = ((precioVenta - precioCosto) / precioCosto) * 100;
            porcentajeGanancia = porcentajeGanancia.toFixed(2);
            $('#txtPorcentajeGanancia').val(porcentajeGanancia);
        }
    }

    function validarCampos() {
        const descripcion = $('#txtDescripcion').val();
        const precioCosto = $('#txtPrecioCosto').val();
        const precioVenta = $('#txtPrecioVenta').val();
        const porcentajeGanancia = $('#txtPorcentajeGanancia').val();

        const descripcionValida = descripcion !== '';
        const precioCostoValido = precioCosto !== '' && !isNaN(precioCosto);
        const precioVentaValido = precioVenta !== '' && !isNaN(precioVenta);
        const porcentajeGananciaValido = porcentajeGanancia !== '' && !isNaN(porcentajeGanancia);

        $('#lblDescripcion').css('color', descripcionValida ? '' : 'red');
        $('#txtDescripcion').css('border-color', descripcionValida ? '' : 'red');
        $('#lblPrecioCosto').css('color', precioCostoValido ? '' : 'red');
        $('#txtPrecioCosto').css('border-color', precioCostoValido ? '' : 'red');
        $('#lblPorcentajeGanancia').css('color', porcentajeGananciaValido ? '' : 'red');
        $('#txtPorcentajeGanancia').css('border-color', porcentajeGananciaValido ? '' : 'red');

        return descripcionValida && precioCostoValido && precioVentaValido && porcentajeGananciaValido;
    }

    function asignarCamposObligatorios() {
        $('#lblDescripcion').css('color', 'red');
        $('#txtDescripcion').css('border-color', 'red');
        $('#lblPrecioCosto').css('color', 'red');
        $('#txtPrecioCosto').css('border-color', 'red');
        $('#lblPorcentajeGanancia').css('color', 'red');
        $('#txtPorcentajeGanancia').css('border-color', 'red');
    }

    function limpiarModal() {
        ['Id', 'Descripcion', 'PrecioCosto', 'PrecioVenta', 'PorcentajeGanancia'].forEach(campo => {
            $(`#txt${campo}`).val('');
        });
        $('#txtActivo').val('');
        $('#txtProductoPeso').val('');
        $('#txtProductoCantidad').val('');
    }

    function actualizarProductoCantidad() {
        const selectedText = $('#UnidadesDeMedidas option:selected').text();
        const idCliente = parseInt(ctx.idCliente, 10) || -1;
        const nombreProducto = document.getElementById('txtDescripcion')?.value || '';

        if (selectedText === 'Pallet' || nombreProducto === 'Fac. IVA') {
            document.getElementById('divProductoCantidad')?.removeAttribute('hidden');
            document.getElementById('divTotalProducto')?.removeAttribute('hidden');
            const qty = document.getElementById('txtProductoCantidad');
            if (qty) {
                if (idCliente > 0) qty.setAttribute('readonly', 'readonly');
                else qty.removeAttribute('readonly');
            }
        } else {
            document.getElementById('divTotalProducto')?.setAttribute('hidden', 'hidden');
            document.getElementById('divProductoCantidad')?.setAttribute('hidden', 'hidden');
        }
    }

    function aplicarModoEdicionRestringida(restringido) {
        const campos = ['Marcas', 'txtDescripcion', 'Categorias', 'Monedas', 'UnidadesDeMedidas'];
        const inputsPrecio = ['txtPrecioCosto', 'txtPorcentajeGanancia', 'txtPrecioVenta'];

        campos.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (restringido) el.setAttribute('disabled', 'disabled');
            else el.removeAttribute('disabled');
        });

        inputsPrecio.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (restringido) el.classList.add('txtEdicion');
            else el.classList.remove('txtEdicion');
        });
    }

    async function cargarSelect(url, selectId) {
        const response = await fetch(url);
        const data = await response.json();
        const select = document.getElementById(selectId);
        if (!select) return;
        $(`#${selectId} option`).remove();
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.Id;
            option.text = item.Nombre;
            select.appendChild(option);
        });
    }

    async function cargarCombos() {
        await Promise.all([
            cargarSelect('/Marcas/Lista', 'Marcas'),
            cargarSelect('/Categorias/Lista', 'Categorias'),
            cargarSelect('/Monedas/Lista', 'Monedas'),
            cargarSelect('/UnidadesDeMedidas/Lista', 'UnidadesDeMedidas')
        ]);
    }

    function habilitarCamposNuevo() {
        aplicarModoEdicionRestringida(false);
        document.getElementById('divTotalProducto')?.setAttribute('hidden', 'hidden');
        document.getElementById('divProductoCantidad')?.setAttribute('hidden', 'hidden');
        document.getElementById('divPeso')?.setAttribute('hidden', 'hidden');
    }

    async function abrirNuevo(options = {}) {
        if (options.idCliente !== undefined || options.idProveedor !== undefined) {
            setContext(options);
        }
        limpiarModal();
        await cargarCombos();
        habilitarCamposNuevo();
        $('#btnGuardarProducto').text('Registrar');
        $('#modalEdicionLabel').text('Nuevo Producto');
        asignarCamposObligatorios();
        $modal().modal('show');
    }

    async function abrirEditar(modelo, options = {}) {
        if (options.idCliente !== undefined || options.idProveedor !== undefined) {
            setContext(options);
        }

        const idCliente = parseInt(ctx.idCliente, 10) || -1;
        const idProveedor = parseInt(ctx.idProveedor, 10) || -1;
        const restringido = idProveedor > 0 || idCliente > 0;

        if (modelo.Descripcion && modelo.Descripcion.toLowerCase().includes('hierro')) {
            document.getElementById('divPeso')?.removeAttribute('hidden');
        } else {
            document.getElementById('divPeso')?.setAttribute('hidden', 'hidden');
        }

        aplicarModoEdicionRestringida(restringido);

        $('#txtId').val(modelo.Id);
        $('#txtActivo').val(modelo.Activo);
        $('#txtDescripcion').val(modelo.Descripcion);

        await cargarCombos();

        $('#txtPrecioCosto').val(modelo.PCosto);
        $('#txtPrecioVenta').val(modelo.PVenta);
        $('#txtPorcentajeGanancia').val(modelo.PorcGanancia);
        $('#Marcas').val(modelo.IdMarca);
        $('#Categorias').val(modelo.IdCategoria);
        $('#Monedas').val(modelo.IdMoneda);
        $('#UnidadesDeMedidas').val(modelo.IdUnidadDeMedida);
        $('#txtProductoCantidad').val(modelo.ProductoCantidad);
        $('#txtProductoPeso').val(modelo.Peso);
        $('#txtTotal').val((modelo.PVenta || 0) * (modelo.ProductoCantidad || 1));

        actualizarProductoCantidad();
        $('#btnGuardarProducto').text('Guardar');
        $('#modalEdicionProductoLabel').text('Editar Producto');
        validarCampos();
        $modal().modal('show');
    }

    async function abrirEditarPorId(id, options = {}) {
        const idCliente = options.idCliente ?? ctx.idCliente ?? -1;
        const idProveedor = options.idProveedor ?? ctx.idProveedor ?? -1;
        const url = `Productos/EditarInfo?id=${id}&idCliente=${idCliente}&idProveedor=${idProveedor}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ha ocurrido un error.');
        const dataJson = await response.json();
        if (dataJson == null) throw new Error('Ha ocurrido un error.');
        await abrirEditar(dataJson, { idCliente, idProveedor });
    }

    function guardar() {
        if (!validarCampos()) {
            errorModal('Debes completar los campos requeridos');
            return;
        }

        const elCliente = document.getElementById('clientesfiltro');
        const elProveedor = document.getElementById('Proveedoresfiltro');
        if (elCliente || elProveedor) {
            setContext({
                idCliente: elCliente ? (parseInt(elCliente.value, 10) || -1) : ctx.idCliente,
                idProveedor: elProveedor ? (parseInt(elProveedor.value, 10) || -1) : ctx.idProveedor
            });
        } else if (typeof idClienteFiltro !== 'undefined' && typeof idProveedorFiltro !== 'undefined') {
            setContext({ idCliente: idClienteFiltro, idProveedor: idProveedorFiltro });
        }

        calcularTotal();
        const productoCantidad = $('#txtProductoCantidad').val();
        const idProducto = $('#txtId').val();
        const nuevoModelo = {
            IdCliente: ctx.idCliente,
            IdProveedor: ctx.idProveedor,
            Id: idProducto !== '' ? idProducto : 0,
            Descripcion: $('#txtDescripcion').val(),
            IdMarca: $('#Marcas').val(),
            IdCategoria: $('#Categorias').val(),
            IdMoneda: $('#Monedas').val(),
            IdUnidadDeMedida: $('#UnidadesDeMedidas').val(),
            PCosto: parseDecimal($('#txtPrecioCosto').val()),
            PVenta: parseDecimal($('#txtPrecioVenta').val()),
            PorcGanancia: parseDecimal($('#txtPorcentajeGanancia').val()),
            Peso: parseDecimal($('#txtProductoPeso').val()),
            ProductoCantidad: (isNaN(productoCantidad) || productoCantidad === null || String(productoCantidad).trim() === '')
                ? 1
                : parseFloat(productoCantidad),
            Image: null,
            Activo: idProducto !== '' ? $('#txtActivo').val() : 1
        };

        const url = idProducto === '' ? 'Productos/Insertar' : 'Productos/Actualizar';
        const method = idProducto === '' ? 'POST' : 'PUT';

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(() => {
                const mensaje = idProducto === '' ? 'Producto registrado correctamente' : 'Producto modificado correctamente';
                $modal().modal('hide');
                exitoModal(mensaje);
                if (onGuardadoCallback) onGuardadoCallback();
                $(document).trigger('producto:guardado');
            })
            .catch(err => console.error('ProductoModal.guardar:', err));
    }

    function bindEvents() {
        $('#btnGuardarProducto').off('click.productoModal').on('click.productoModal', guardar);

        $('#txtDescripcion, #txtPorcentajeGanancia').off('input.productoModal').on('input.productoModal', validarCampos);
        $('#txtPrecioCosto').off('input.productoModal').on('input.productoModal', validarCampos);
        $('#txtProductoCantidad').off('input.productoModal').on('input.productoModal', function () {
            validarCampos();
            sumarPorcentaje();
        });
        $('#txtPorcentajeGanancia').off('input.productoModal').on('input.productoModal', sumarPorcentaje);
        $('#txtPrecioVenta').off('input.productoModal').on('input.productoModal', function () {
            calcularPorcentaje();
            calcularTotal();
        });
        $('#txtProductoCantidad').off('input blur.productoModal').on('input blur.productoModal', calcularTotal);

        $('#UnidadesDeMedidas').off('change.productoModal').on('change.productoModal', function () {
            document.getElementById('txtProductoCantidad').value = 1;
            actualizarProductoCantidad();
        });

        $('#txtDescripcion').off('change.productoModal').on('change.productoModal', actualizarProductoCantidad);

        $('#txtDescripcion').off('input blur.productoModal').on('input blur.productoModal', function () {
            if (this.value.includes('Hierro')) {
                document.getElementById('txtProductoPeso').value = 0;
                document.getElementById('divPeso')?.removeAttribute('hidden');
            } else {
                document.getElementById('txtProductoPeso').value = 0;
                document.getElementById('divPeso')?.setAttribute('hidden', 'hidden');
            }
        });
    }

    function init() {
        if (initialized || !document.getElementById('modalEdicionProducto')) return;
        initialized = true;
        bindEvents();
    }

    return {
        init,
        setContext,
        onGuardado,
        abrirNuevo,
        abrirEditar,
        abrirEditarPorId,
        guardar,
        validarCampos,
        limpiarModal
    };
})();

/** Compatibilidad con onclick existentes (Home, Productos, etc.) */
function nuevoProducto() {
    const elCliente = document.getElementById('clientesfiltro');
    const elProveedor = document.getElementById('Proveedoresfiltro');
    const idCliente = elCliente ? parseInt(elCliente.value, 10) : -1;
    const idProveedor = elProveedor ? parseInt(elProveedor.value, 10) : -1;
    ProductoModal.abrirNuevo({
        idCliente: !isNaN(idCliente) && idCliente > 0 ? idCliente : -1,
        idProveedor: !isNaN(idProveedor) && idProveedor > 0 ? idProveedor : -1
    });
}

function guardarCambios() {
    ProductoModal.guardar();
}

$(document).ready(function () {
    ProductoModal.init();
});
