// =====================================================================
// CONFIGURACIÓN GLOBAL
// =====================================================================
const LS_MENU_TYPE = 'menu_tipo'; // 'clasico' | 'personalizado'


// =====================================================================
// MENÚ — UTILIDADES (ÚNICO SISTEMA)
// =====================================================================

// Marca visualmente el menú activo usando data-menu
function marcarMenuActivo(tipo) {
    document.querySelectorAll('.menu-option').forEach(btn => {
        btn.classList.remove('active');

        if ((btn.dataset.menu || '').toLowerCase() === (tipo || '').toLowerCase()) {
            btn.classList.add('active');
        }
    });
}

// Guarda el menú elegido
function setMenuTipo(tipo) {
    const t = (tipo || '').toLowerCase();
    if (t !== 'clasico' && t !== 'personalizado') return;

    localStorage.setItem(LS_MENU_TYPE, t);
    marcarMenuActivo(t);
}

// Selección desde navbar / selector
function seleccionarMenuNavbar(tipo) {
    const t = (tipo || '').toLowerCase();
    if (t !== 'clasico' && t !== 'personalizado') return;

    const actual = (localStorage.getItem(LS_MENU_TYPE) || '').toLowerCase();

    // Guardar selección
    localStorage.setItem(LS_MENU_TYPE, t);
    marcarMenuActivo(t);

    // Si ya estaba seleccionado, no hace falta recargar
    if (actual === t) return;

    // Redirigir según el menú elegido
    if (t === 'personalizado') {
        window.location.href = '/HomePersonalizada';
    } else {
        window.location.href = '/Home';
    }
}


// Redirección centralizada (Login / Home / Selector)
function redirigirSegunMenu() {
    const menu = localStorage.getItem(LS_MENU_TYPE);

    if (!menu) {
        window.location.href = '/Home/Selector';
        return;
    }

    if (menu === 'personalizado') {
        window.location.href = '/HomePersonalizada';
        return;
    }

    // Default
    window.location.href = '/Home';
}


// =====================================================================
// DOM READY — INICIALIZACIÓN GENERAL
// =====================================================================
document.addEventListener("DOMContentLoaded", async function () {

    // ==========================================================
    // MENÚ — INIT (NO rompe nada)
    // ==========================================================
    let menuActual = localStorage.getItem(LS_MENU_TYPE);
    if (!menuActual) {
        menuActual = 'clasico';
        localStorage.setItem(LS_MENU_TYPE, menuActual);
    }
    marcarMenuActivo(menuActual);
    // ==========================================================


    // ==========================================================
    // TU LÓGICA EXISTENTE — USER SESSION
    // ==========================================================
    var userSession = JSON.parse(localStorage.getItem('userSession'));

    if (userSession) {
        var userFullName = userSession.Nombre + ' ' + userSession.Apellido;
        $("#userName").html('<i class="fa fa-user"></i> ' + userFullName);

        document.getElementById('modoVendedorSwitch').checked = userSession.ModoVendedor;

        if (userSession.ModoVendedor == 1) {
            // Ocultar opciones no permitidas
            document.querySelectorAll('.btnMenu').forEach(btn => {
                if (
                    !btn.textContent.includes('Nuevo Pedido') &&
                    !btn.textContent.includes('Pedidos') &&
                    !btn.textContent.includes('Lista de Productos') &&
                    !btn.textContent.includes('Ventas')
                ) {
                    btn.closest('.col').style.display = 'none';
                }
            });
        }
    }

    // ==========================================================
    // TU LÓGICA EXISTENTE — MENÚ USUARIO
    // ==========================================================
    var userMenuToggle = document.getElementById('navbarDropdown');
    var userMenu = document.getElementById('userMenu');

    if (userMenuToggle && userMenu) {

        userMenuToggle.addEventListener('click', function (event) {
            event.preventDefault();

            var isExpanded = userMenuToggle.getAttribute('aria-expanded') === 'true';
            userMenuToggle.setAttribute('aria-expanded', !isExpanded);
            userMenu.classList.toggle('show');
        });

        // Cerrar menú usuario al clickear afuera
        document.addEventListener('click', function (event) {
            var isUserMenu = event.target.closest('#userMenu');
            var isUserToggle = event.target.closest('#navbarDropdown');

            if (!isUserMenu && !isUserToggle) {
                userMenu.classList.remove('show');
                userMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Cerrar otros dropdowns
        document.addEventListener('click', function (event) {
            var isDropdownToggle = event.target.closest('.dropdown-toggle');
            var isDropdownMenu = event.target.closest('.dropdown-menu');

            if (!isDropdownToggle && !isDropdownMenu) {
                document.querySelectorAll('.dropdown-menu.show').forEach(function (dropdownMenu) {
                    if (dropdownMenu !== userMenu) {
                        dropdownMenu.classList.remove('show');
                        var dropdownToggle = dropdownMenu.previousElementSibling;
                        if (dropdownToggle) {
                            dropdownToggle.setAttribute('aria-expanded', 'false');
                        }
                    }
                });
            }
        });
    }
});


// =====================================================================
// TU CÓDIGO ORIGINAL — FUNCIONES (NO TOCADO)
// =====================================================================
async function obtenerDataUser(id) {
    const url = `/Usuarios/Obtener?id=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function toggleModoVendedor(activar) {

    var userSession = JSON.parse(localStorage.getItem('userSession'));

    if (!userSession) {
        console.error("No hay información de sesión");
        return;
    }

    const modo = activar ? 1 : 0;

    userSession.ModoVendedor = modo;
    localStorage.setItem('userSession', JSON.stringify(userSession));

    const url = `/Usuarios/ActualizarModoVendedor?id=${userSession.Id}&modo=${modo}`;

    fetch(url, {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    })
        .then(response => {
            if (!response.ok) throw new Error(response.statusText);
            return response.json();
        })
        .then(dataJson => {
            console.log(dataJson);
        })
        .catch(error => {
            console.error('Error:', error);
        });

    window.location.href = '/Home';
}
