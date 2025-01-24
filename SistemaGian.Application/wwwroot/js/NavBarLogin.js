document.addEventListener("DOMContentLoaded", async function () {
    var userSession = JSON.parse(localStorage.getItem('userSession'));

    // Configura el estado del switch
    if (userSession) {
        var userFullName = userSession.Nombre + ' ' + userSession.Apellido;
        $("#userName").html('<i class="fa fa-user"></i> ' + userFullName);

        document.getElementById('modoVendedorSwitch').checked = userSession.ModoVendedor;

        if (userSession.ModoVendedor == 1) {
            // Ocultar todas las opciones excepto "Nuevo Pedido", "Pedidos", y "Ventas"
            document.querySelectorAll('.btnMenu').forEach(btn => {
                if (!btn.textContent.includes('Nuevo Pedido') &&
                    !btn.textContent.includes('Pedidos') &&
                    !btn.textContent.includes('Lista de Productos') &&
                    !btn.textContent.includes('Ventas')) {
                    btn.closest('.col').style.display = 'none';
                }
            });
        }
    }

    // Manejo del menú desplegable del usuario
    var userMenuToggle = document.getElementById('navbarDropdown');
    var userMenu = document.getElementById('userMenu');

    userMenuToggle.addEventListener('click', function (event) {
        event.preventDefault();

        // Alterna el menú del usuario
        var isExpanded = userMenuToggle.getAttribute('aria-expanded') === 'true';
        userMenuToggle.setAttribute('aria-expanded', !isExpanded);
        userMenu.classList.toggle('show');
    });

    // Cierra el menú del usuario si se hace clic fuera de él
    document.addEventListener('click', function (event) {
        var isUserMenu = event.target.closest('#userMenu');
        var isUserToggle = event.target.closest('#navbarDropdown');

        if (!isUserMenu && !isUserToggle) {
            userMenu.classList.remove('show');
            userMenuToggle.setAttribute('aria-expanded', 'false');
        }
    });

    // Cierra otros menús desplegables al interactuar fuera del navbar
    document.addEventListener('click', function (event) {
        var isDropdownToggle = event.target.closest('.dropdown-toggle');
        var isDropdownMenu = event.target.closest('.dropdown-menu');

        if (!isDropdownToggle && !isDropdownMenu) {
            document.querySelectorAll('.dropdown-menu.show').forEach(function (dropdownMenu) {
                if (dropdownMenu !== userMenu) { // No cerrar el menú de usuario
                    dropdownMenu.classList.remove('show');
                    var dropdownToggle = dropdownMenu.previousElementSibling;
                    if (dropdownToggle) {
                        dropdownToggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        }
    });
});

async function obtenerDataUser(id) {

    const url = `/Usuarios/Obtener?id=${id}`;
    const response = await fetch(url);
    const data = await response.json();

    return data;

}



async function toggleModoVendedor(activar) {

    // Obtener el objeto userSession desde localStorage
    var userSession = JSON.parse(localStorage.getItem('userSession'));

    // Si no existe userSession, no hacer nada (puedes manejar el error si es necesario)
    if (!userSession) {
        console.error("No hay información de sesión");
        return;
    }

    // Establecer el modo dependiendo de activar (1 para true, 0 para false)
    const modo = activar ? 1 : 0;

    // Actualizar el valor de ModoVendedor en el objeto userSession
    userSession.ModoVendedor = modo;

    // Guardar el objeto userSession actualizado en localStorage
    localStorage.setItem('userSession', JSON.stringify(userSession));

    // Construir la URL con los parámetros como query string
    const url = `/Usuarios/ActualizarModoVendedor?id=${userSession.Id}&modo=${modo}`;

    const method = "PUT";

    // Enviar la solicitud PUT con los parámetros en la URL
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    })
        .then(response => {
            if (!response.ok) throw new Error(response.statusText);
            return response.json();
        })
        .then(dataJson => {
            console.log(dataJson); // Manejar la respuesta si es necesario
        })
        .catch(error => {
            console.error('Error:', error);
        });

    window.location.href = '/Home'; // Redirige a la home
}
