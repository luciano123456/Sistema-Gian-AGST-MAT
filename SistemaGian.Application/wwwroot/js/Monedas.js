let cacheMonedasLista = [];

function escMoneda(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setModalMonedaAbierto(abierto) {
    const el = document.getElementById('modalEdicion');
    if (!el) return;
    if (typeof bootstrap !== 'undefined') {
        const inst = bootstrap.Modal.getOrCreateInstance(el);
        abierto ? inst.show() : inst.hide();
    } else if (typeof $ !== 'undefined' && $.fn?.modal) {
        $(el).modal(abierto ? 'show' : 'hide');
    }
}

const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },

];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Cotizacion: "",
    Image: "",
}

$(document).ready(() => {

    listaMonedas();

    document.getElementById('btnExportarMonedas')?.addEventListener('click', exportarListadoMonedas);

    $('#txtNombre').on('input', function () {
        validarCampos()
    });
})

function exportarListadoMonedas() {
    SistemaExport.abrir({
        titulo: 'Monedas',
        subtitulo: 'Cotizaciones vigentes',
        archivo: 'monedas',
        validar: () => (!cacheMonedasLista.length ? 'No hay monedas para exportar.' : null),
        getPayload: () => ({
            titulo: 'Monedas',
            filtros: 'Listado de cotizaciones',
            generado: new Date().toLocaleString('es-AR'),
            hojas: [{
                nombre: 'Monedas',
                headers: ['Nombre', 'Cotización'],
                rows: cacheMonedasLista.map(m => [
                    m.Nombre || '',
                    Number(String(m.Cotizacion).replace(',', '.')) || 0
                ])
            }]
        })
    });
}



function guardarCambios() {
    if (validarCampos()) {
        const idMoneda = $("#txtId").val();
        const nuevoModelo = {
            "Id": idMoneda !== "" ? idMoneda : 0,
            "Nombre": $("#txtNombre").val(),
            "Cotizacion": $("#txtCotizacion").val(),
            "Image": document.getElementById("imgMon").value,
           
        };

        const url = idMoneda === "" ? "Monedas/Insertar" : "Monedas/Actualizar";
        const method = idMoneda === "" ? "POST" : "PUT";

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
                const mensaje = idMoneda === "" ? "Moneda registrada correctamente" : "Moneda modificada correctamente";
                setModalMonedaAbierto(false);
                exitoModal(mensaje);
                listaMonedas();
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

    $("#txtNombre").css("border-color", camposValidos ? "" : "#ff5a6a");

    return camposValidos;
}
function nuevoMoneda() {
    limpiarModal();
    setModalMonedaAbierto(true);
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nueva moneda");
    $('#txtNombre').css('border-color', '#ff5a6a');
}


async function mostrarModal(modelo) {
    const campos = ["Id", "Nombre", "Cotizacion", "Image"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });

    $("#imgMoneda").attr("src", "data:image/png;base64," + modelo.Image);
    $("#imgMon").val(modelo.Image);


    setModalMonedaAbierto(true);
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar moneda");
    $('#txtNombre').css('border-color', '');
}




function limpiarModal() {
    const campos = ["Id", "Nombre", "Cotizacion", "ImgMoneda"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });


    $("#imgMoneda").attr("src", "");
    $("#txtNombre").css("border-color", "");
}


async function listaMonedas() {
    const container = document.getElementById('monedasContainer');
    if (!container) return;

    container.innerHTML = `<div class="monedas-loading"><i class="fa fa-spinner fa-spin d-block"></i>Cargando monedas…</div>`;

    try {
        const response = await fetch('/Monedas/Lista');
        if (!response.ok) throw new Error();
        const data = await response.json();
        cacheMonedasLista = data || [];
        renderMonedasGrid(cacheMonedasLista);
    } catch {
        container.innerHTML = `<div class="monedas-empty"><i class="fa fa-exclamation-circle d-block mb-2"></i>No se pudieron cargar las monedas.</div>`;
        cacheMonedasLista = [];
    }

    const kpi = document.getElementById('kpiMonedasCount');
    if (kpi) kpi.textContent = String(cacheMonedasLista.length);
}

function renderMonedasGrid(data) {
    const container = document.getElementById('monedasContainer');
    if (!container) return;

    const cards = (data || []).map(m => `
        <article class="moneda-card" data-id="${m.Id}">
            <div class="moneda-card__media">
                <img src="data:image/png;base64,${m.Image || ''}" alt="${escMoneda(m.Nombre)}" loading="lazy" />
            </div>
            <div class="moneda-card__body">
                <h3 class="moneda-card__name">${escMoneda(m.Nombre)}</h3>
                <p class="moneda-card__rate-label">Cotización</p>
                <p class="moneda-card__rate">${formatNumber(m.Cotizacion)}</p>
            </div>
            <div class="moneda-card__actions">
                <button type="button" class="btn-moneda-action btn-moneda-action--edit" data-action="edit" data-id="${m.Id}">
                    <i class="fa fa-pencil me-1"></i> Editar
                </button>
                <button type="button" class="btn-moneda-action btn-moneda-action--del" data-action="del" data-id="${m.Id}">
                    <i class="fa fa-trash-o me-1"></i> Eliminar
                </button>
            </div>
        </article>
    `).join('');

    container.innerHTML = cards + `
        <article class="moneda-card moneda-card--add" id="btnNuevaMonedaCard" role="button" tabindex="0" aria-label="Agregar moneda">
            <div class="moneda-card--add__inner">
                <div class="moneda-card--add__icon"><i class="fa fa-plus"></i></div>
                <p class="moneda-card--add__title">Nueva moneda</p>
                <p class="moneda-card--add__sub">Agregar cotización</p>
            </div>
        </article>
    `;

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            editarMoneda(parseInt(btn.dataset.id, 10));
        });
    });
    container.querySelectorAll('[data-action="del"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            eliminarMoneda(parseInt(btn.dataset.id, 10));
        });
    });

    const addBtn = document.getElementById('btnNuevaMonedaCard');
    if (addBtn) {
        const openNew = () => nuevoMoneda();
        addBtn.addEventListener('click', openNew);
        addBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openNew();
            }
        });
    }
}


const editarMoneda = id => {
    fetch("Monedas/EditarInfo?id=" + id)
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
async function eliminarMoneda(id) {
    let resultado = window.confirm("¿Desea eliminar la Moneda?");

    if (resultado) {
        try {
            const response = await fetch("Monedas/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar la Moneda.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaMonedas();
                exitoModal("Moneda eliminada correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}


const fileInput = document.getElementById("Imagen");

fileInput.addEventListener("change", (e) => {
    var files = e.target.files
    let base64String = "";
    let baseTotal = "";

    // get a reference to the file
    const file = e.target.files[0];



    // encode the file using the FileReader API
    const reader = new FileReader();
    reader.onloadend = () => {
        // use a regex to remove data url part

        base64String = reader.result
            .replace("data:", "")
            .replace(/^.+,/, "");


        var inputImg = document.getElementById("imgMon");
        inputImg.value = base64String;

        $("#imgMoneda").removeAttr('hidden');
        $("#imgMoneda").attr("src", "data:image/png;base64," + base64String);

    };

    reader.readAsDataURL(file);

}
);
