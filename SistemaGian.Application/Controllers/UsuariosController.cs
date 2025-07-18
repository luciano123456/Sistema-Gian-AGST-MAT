using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;
using System.Net.Mail;
using System.Net;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.SignalR;
using SistemaGian.Application.Hubs;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class UsuariosController : Controller
    {
        private readonly IUsuariosService _Usuarioservice;
        private readonly SessionHelper _sessionHelper;  // Inyección de SessionHelper
        private readonly IHubContext<NotificacionesHub> _hubContext;

        public UsuariosController(IUsuariosService Usuarioservice, IHubContext<NotificacionesHub> hubContext)
        {
            _Usuarioservice = Usuarioservice;
            _hubContext = hubContext;
        }

        public async Task<IActionResult> Index()
        {
            // Obtener el usuario actual desde la sesión usando el helper inyectado
            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            // Si no se pudo obtener el usuario de la sesión
            if (userSession != null)
            {
                // Verificar si el usuario está en modo vendedor
                if (userSession.ModoVendedor == 1)
                {
                    return RedirectToAction("Index", "Home");
                }
            }
            return View();
        }


        public async Task<IActionResult> Configuracion()
        {
            // Obtener el usuario actual desde la sesión usando el helper inyectado
            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            // Si no se pudo obtener el usuario de la sesión
            if (userSession == null)
            {
                return RedirectToAction("Login", "Index");
            }

            // Obtener los detalles del usuario desde la base de datos
            var user = await _Usuarioservice.Obtener(userSession.Id);

            // Si el usuario no existe, redirigir al login
            if (user == null)
            {
                return RedirectToAction("Login", "Index");
            }

            // Pasar los datos del usuario a la vista
            return View(user);
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Usuarios = await _Usuarioservice.ObtenerTodos();

            var lista = Usuarios.Select(c => new VMUser
            {
                Id = c.Id,
                Usuario = c.Usuario,
                Nombre = c.Nombre,
                Apellido = c.Apellido,
                Dni = c.Dni,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                IdRol = c.IdRol,
                Rol = c.IdRolNavigation.Nombre,
                IdEstado = c.IdEstado,
                Estado = c.IdEstadoNavigation.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMUser model)
        {

            var passwordHasher = new PasswordHasher<User>();


            var Usuario = new User
            {
                Usuario = model.Usuario,
                Nombre = model.Nombre,
                Apellido = model.Apellido,
                Dni = model.Dni,
                Telefono = model.Telefono,
                Direccion = model.Direccion,
                IdRol = model.IdRol,
                IdEstado = model.IdEstado,
                Contrasena = passwordHasher.HashPassword(null, model.Contrasena),
                Correo = model.Correo,
                ModoVendedor = 0
            };

            bool respuesta = await _Usuarioservice.Insertar(Usuario);

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = Usuario.Id,
                    UsuarioModificado = model.Nombre,
                    Tipo = "Creado",
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }


            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMUser model)
        {
            var passwordHasher = new PasswordHasher<User>();

            // Obtiene el usuario de la base de datos
            User userbase = await _Usuarioservice.Obtener(model.Id);


            if (model.CambioAdmin != 1) //YA QUE DESDE EL EDITAR DESDE EL ADMIN, NO VAMOS A MANDARLE LA CONTRASENA, SE LA CAMBIA DE UNA
            {
                var result = passwordHasher.VerifyHashedPassword(null, userbase.Contrasena, model.Contrasena);
                if (result != PasswordVerificationResult.Success)
                {
                    return Ok(new { valor = "Contrasena" });
                }
            }

            // Si se proporciona una contraseña nueva, úsala; de lo contrario, mantén la contraseña actual
            var passnueva = !string.IsNullOrEmpty(model.ContrasenaNueva)
                ? passwordHasher.HashPassword(null, model.ContrasenaNueva) // Hashea la nueva contraseña si es proporcionada
                : userbase.Contrasena; // Mantén la contraseña actual si no se proporciona una nueva

            // Actualiza las propiedades del objeto ya cargado
            userbase.Nombre = model.Nombre;
            userbase.Apellido = model.Apellido;
            userbase.Dni = model.Dni;
            userbase.Telefono = model.Telefono;
            userbase.Direccion = model.Direccion;
            userbase.IdEstado = model.IdEstado > 0 ? model.IdEstado : userbase.IdEstado;
            userbase.Correo = model.Correo;
            userbase.Contrasena = passnueva; // Asigna la nueva contraseña hasheada

            // Realiza la actualización en la base de datos
            bool respuesta = await _Usuarioservice.Actualizar(userbase);

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = model.Id,
                    Tipo = "Actualizado",
                    UsuarioModificado = model.Nombre,
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }

            return Ok(new { valor = respuesta ? "OK" : "Error" });
        }


        [HttpPut]
        public async Task<IActionResult> ActualizarModoVendedor(int id, int modo)
        {
            var passwordHasher = new PasswordHasher<User>();

            // Obtiene el usuario de la base de datos
            User userbase = await _Usuarioservice.Obtener(id);

            if (userbase != null)
            {
                // Actualiza las propiedades del objeto ya cargado
                userbase.ModoVendedor = modo;
         

                // Realiza la actualización en la base de datos
                bool respuesta = await _Usuarioservice.Actualizar(userbase);

                if (respuesta)
                {
                    var vmUser = new VMUser
                    {
                        Id = userbase.Id,
                        Usuario = userbase.Usuario,
                        IdRol = userbase.IdRol,
                        Nombre = userbase.Nombre,
                        Apellido = userbase.Apellido,
                        Direccion = userbase.Direccion,
                        Dni = userbase.Dni,
                        Telefono = userbase.Telefono,
                        ModoVendedor = userbase.ModoVendedor,
                    };

                    // Cerrar sesión vieja
                    await SessionHelper.CerrarSession(HttpContext);

                    // SignOut si estás usando cookies de autenticación
                    await HttpContext.SignOutAsync();

                    // Guardar la nueva sesión
                    await SessionHelper.SetUsuarioSesion(vmUser, HttpContext);

                    // Prueba leyendo de nuevo
                    var testSession = await SessionHelper.GetUsuarioSesion(HttpContext);
                    Console.WriteLine($"TEST Sesion después de setear: {testSession.ModoVendedor}");
                }


                return Ok(new { valor = respuesta ? "OK" : "Error" });
            } else
            {
                return StatusCode(StatusCodes.Status404NotFound);
            }
        }


        [HttpGet]
        public async Task<IActionResult> Obtener(int id)
        {

            // Obtiene el usuario de la base de datos
            User userbase = await _Usuarioservice.Obtener(id);

            if (userbase != null)
            {
                // Retorna la propiedad ModoVendedor
                return Ok(userbase.ModoVendedor); // Usamos Ok() para devolver una respuesta HTTP correcta.
            }
            else
            {
                // Si el usuario no existe, retornamos un NotFound
                return NotFound(); // En caso de que no se encuentre el usuario, retornamos 404
            }
        }




        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {

            User user = await _Usuarioservice.Obtener(id);

            bool respuesta = await _Usuarioservice.Eliminar(id);

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = id,
                    Tipo = "Eliminado",
                    UsuarioModificado = user.Nombre,
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Usuario = await _Usuarioservice.Obtener(id);

            if (Usuario != null)
            {
                return StatusCode(StatusCodes.Status200OK, Usuario);
            }
            else
            {
                return StatusCode(StatusCodes.Status404NotFound);
            }
        }

        

       

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}