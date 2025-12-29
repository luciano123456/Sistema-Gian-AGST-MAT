$(document).ready(function () {

    // Verificar si el usuario tiene credenciales guardadas
    if (localStorage.getItem('rememberMe') === 'true') {
        // Si el checkbox estaba seleccionado la última vez
        $("#username").val(localStorage.getItem('username'));
        $("#password").val(localStorage.getItem('password'));
        $("#rememberMe").prop('checked', true);
        $("#checkIcon").show(); // Mostrar el ícono verde de check
    }

    // Al enviar el formulario
    $("#loginForm").on("submit", function (event) {
        event.preventDefault(); // Evitar el envío tradicional del formulario

        var username = $("#username").val(); // Obtener el nombre de usuario
        var password = $("#password").val(); // Obtener la contraseña
        var token = $('input[name="__RequestVerificationToken"]').val(); // Obtener token CSRF
        var rememberMe = $("#rememberMe").prop('checked'); // Obtener el estado del checkbox

        // Crear el objeto de datos para enviar
        var data = {
            Usuario: username,
            Contrasena: password,
            __RequestVerificationToken: token // Enviar el token CSRF
        };

        fetch(loginUrl, { // Aquí usamos la variable generada por Razor
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token // Enviar el token CSRF
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                console.log(response); // Verificar la respuesta
                if (!response.ok) {
                    throw new Error("Error en la respuesta del servidor");
                }
                return response.json(); // Parsear la respuesta JSON
            })
            .then(data => {
                console.log(data); // Verificar los datos recibidos
                if (data.success) {

                    // Si "Recordar credenciales" está seleccionado, guarda las credenciales
                    if (rememberMe) {
                        localStorage.setItem('username', username);
                        localStorage.setItem('password', password);
                        localStorage.setItem('rememberMe', true);
                        $("#checkIcon").show(); // Mostrar el ícono verde de check
                    } else {
                        // Si no está seleccionado, eliminar las credenciales guardadas
                        localStorage.removeItem('username');
                        localStorage.removeItem('password');
                        localStorage.removeItem('rememberMe');
                        $("#checkIcon").hide(); // Ocultar el ícono de check
                    }

                    // Redirigir a la página principal
                    localStorage.setItem('userSession', JSON.stringify(data.user)); // Guardar el usuario

                    redirigirSegunMenu();
                } else {
                    // Mostrar el mensaje de error
                    $(document).ready(function () {
                        // Mostrar el mensaje de error
                        $("#errorMessage").text(data.message).show(); // Establecer el mensaje
                        $("#diverrorMessage").show(); // Mostrar el div

                        // Ocultar el div después de 3 segundos
                        setTimeout(function () {
                            $("#diverrorMessage").fadeOut();
                        }, 3000); // 3000 milisegundos = 3 segundos
                    });


                }
            })
            .catch(error => {
                console.error("Error: " + error);
                $("#errorMessage").text("Hubo un problema al procesar la solicitud. Error: " + error).show();
            });
    });
});


// Al cambiar el estado del checkbox, mostrar u ocultar el ícono
$("#rememberMe").on("change", function () {
    var username = $("#username").val(); // Obtener el nombre de usuario
    var password = $("#password").val(); // Obtener la contraseña
    if ($(this).prop('checked')) {
        $("#checkIcon").show(); // Mostrar el ícono verde de check
        localStorage.setItem('username', username);
        localStorage.setItem('password', password);
        localStorage.setItem('rememberMe', true);
    } else {
        $("#checkIcon").hide(); // Ocultar el ícono de check
        localStorage.removeItem('username');
        localStorage.removeItem('password');
        localStorage.removeItem('rememberMe');
    }
});

// Abrir el modal cuando se hace clic en el enlace
$("#recuperarContrasena").on("click", function () {
    $("#errorMessageRecu").hide()
    $("#diverrorMessageRecu").hide();
    $("#modalRecuperarContrasena").modal("show");
});

// Enviar código al correo
$("#enviarCodigo").on("click", function () {
    var username = $("#usernameRecuperar").val();
    var email = $("#emailRecuperar").val();

    // Validar que los campos no estén vacíos
    if (username && email) {
        var data = {
            Username: username,
            Email: email
        };


       

        fetch(recuperarContrasenaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Mostrar el paso 2 (validación del código)
                    $("#step1").hide();
                    $("#step2").show();
                    $("#errorMessageRecu").hide()
                    $("#diverrorMessageRecu").hide();
                } else {
                    $("#errorMessageRecu").text(data.message).show(); // Establecer el mensaje
                    $("#diverrorMessageRecu").show(); // Mostrar el div

                    // Ocultar el div después de 3 segundos
                    setTimeout(function () {
                        $("#diverrorMessage").fadeOut();
                    }, 3000); // 3000 milisegundos = 3 segundos
                }
            })
            .catch(error => {
                console.error("Error: ", error);
            });
    } else {
        alert("Por favor, ingresa un usuario y correo electrónico.");
    }
});

// Validar código ingresado
$("#validarCodigo").on("click", function () {
    var codigo = $("#codigoRecuperar").val();
    var username = $("#usernameRecuperar").val();

    // Validar que el campo no esté vacío
    if (codigo) {
        var data = {
            Username: username,
            Codigo: codigo
        };

        fetch(validarCodigoUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Mostrar el paso 3 (cambiar la contraseña)
                    $("#errorMessageRecu").hide()
                    $("#diverrorMessageRecu").hide();
                    $("#step2").hide();
                    $("#step3").show();
                } else {
                    $("#errorMessageRecu").text(data.message).show(); // Establecer el mensaje
                    $("#diverrorMessageRecu").show(); // Mostrar el div

                    // Ocultar el div después de 3 segundos
                    setTimeout(function () {
                        $("#diverrorMessage").fadeOut();
                    }, 3000); // 3000 milisegundos = 3 segundos

                }
            })
            .catch(error => {
                console.error("Error: ", error);
            });
    } else {
        alert("Por favor, ingresa el código de recuperación.");
    }
});

// Cambiar la contraseña
$("#cambiarContrasena").on("click", function () {
    var username = $("#usernameRecuperar").val();
    var nuevaContrasena = $("#nuevaContrasena").val();

    // Validar que el campo no esté vacío
    if (nuevaContrasena) {
        var data = {
            Username: username,
            Contrasena: nuevaContrasena
        };

        fetch(nuevaContrasenaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
                if (data) {
                    $("#modalRecuperarContrasena").modal("hide");
                    exitoModal("Contraseña actualizada correctamente.")
                } else {
                    $("#errorMessageRecu").text("Ha ocurrido un error al cambiar la contraseña").show(); // Establecer el mensaje
                    $("#diverrorMessageRecu").show(); // Mostrar el div
                }

                // Ocultar el div después de 3 segundos
                setTimeout(function () {
                    $("#diverrorMessage").fadeOut();
                }, 3000); // 3000 milisegundos = 3 segundos

            })
            .catch(error => {
                console.error("Error: ", error);
            });
    } else {
        alert("Por favor, ingresa la nueva contraseña.");
    }
});



function mostrarModalConContador(modal, texto, tiempo) {
    $(`#${modal}Text`).text(texto);
    $(`#${modal}`).modal('show');

    setTimeout(function () {
        $(`#${modal}`).modal('hide');
    }, tiempo);
}

function exitoModal(texto) {
    mostrarModalConContador('exitoModal', texto, 1000);
}

function errorModal(texto) {
    mostrarModalConContador('ErrorModal', texto, 3000);
}

function advertenciaModal(texto) {
    mostrarModalConContador('AdvertenciaModal', texto, 3000);
}


const LS_MENU_TYPE = 'menu_tipo'; // 'clasico' | 'personalizado'


function redirigirSegunMenu() {
    const menu = localStorage.getItem(LS_MENU_TYPE);

    if (!menu) {
        window.location.href = '/Home/';
        return;
    }

    if (menu === 'personalizado') {
        window.location.href = '/HomePersonalizada';
        return;
    }

    // Default
    window.location.href = '/Home';
}

