document.addEventListener("DOMContentLoaded", async function () {

    var userSession = JSON.parse(localStorage.getItem('userSession'));

  

    // Configura el estado del switch



    if (userSession) {
        // Si el usuario está en el localStorage, actualizar el texto del enlace
        var userFullName = userSession.Nombre + ' ' + userSession.Apellido;
        $("#userName").html('<i class="fa fa-user"></i> ' + userFullName); // Cambiar el contenido del enlace

        document.getElementById('modoVendedorSwitch').checked = userSession.ModoVendedor;

        if (userSession.ModoVendedor == 1) {
            // Ocultar todas las opciones excepto "Nuevo Pedido"
            document.querySelectorAll('.btnMenu').forEach(btn => {
                if (!btn.textContent.includes('Nuevo Pedido') && !btn.textContent.includes('Pedidos') && !btn.textContent.includes('Ventas')) {
                    btn.closest('.col').style.display = 'none';
                }
            });
        }

    }
    // Busca todos los elementos con la clase "dropdown-toggle"
    var dropdownToggleList = document.querySelectorAll('.dropdown-toggle');

    // Itera sobre cada elemento y agrega un evento de clic
    dropdownToggleList.forEach(function (dropdownToggle) {
        dropdownToggle.addEventListener('click', function (event) {
            event.preventDefault(); // Evita la acción predeterminada del enlace

            // Obtiene el menú desplegable correspondiente
            var dropdownMenu = dropdownToggle.nextElementSibling;

            // Cambia el atributo "aria-expanded" para alternar la visibilidad del menú desplegable
            var isExpanded = dropdownToggle.getAttribute('aria-expanded') === 'true';
            dropdownToggle.setAttribute('aria-expanded', !isExpanded);
            dropdownMenu.classList.toggle('show'); // Agrega o quita la clase "show" para mostrar u ocultar el menú desplegable
        });
    });

    // Agrega un manejador de eventos de clic al documento para ocultar el menú desplegable cuando se hace clic en cualquier lugar que no sea el menú desplegable
    document.addEventListener('click', function (event) {
        var isDropdownToggle = event.target.closest('.dropdown-toggle'); // Verifica si el elemento clicado es un elemento con la clase "dropdown-toggle"
        var isDropdownMenu = event.target.closest('.dropdown-menu'); // Verifica si el elemento clicado es un menú desplegable

        // Si el elemento clicado no es un menú desplegable ni un elemento con la clase "dropdown-toggle", oculta todos los menús desplegables
        if (!isDropdownToggle && !isDropdownMenu) {
            var dropdownMenus = document.querySelectorAll('.dropdown-menu.show');
            dropdownMenus.forEach(function (dropdownMenu) {
                dropdownMenu.classList.remove('show');
                var dropdownToggle = dropdownMenu.previousElementSibling;
                dropdownToggle.setAttribute('aria-expanded', 'false');
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
