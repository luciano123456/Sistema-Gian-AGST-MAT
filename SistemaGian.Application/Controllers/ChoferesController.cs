using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SistemaGian.Application.Hubs;

namespace SistemaGian.Application.Controllers
{

    [Authorize]
    public class ChoferesController : Controller
    {
        private readonly IChoferService _Chofereservice;
        private readonly IProvinciaService _provinciaService;
        private readonly IUsuariosService _userService;
        private readonly IHubContext<NotificacionesHub> _hubContext;

        public ChoferesController(IChoferService Chofereservice, IProvinciaService provinciaService, IUsuariosService userService, IHubContext<NotificacionesHub> hubContext)
        {
            _Chofereservice = Chofereservice;
            _provinciaService = provinciaService;
            _userService = userService;
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

            // Si no está en modo vendedor, continúa con el flujo normal
            return View();
        }


        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Choferes = await _Chofereservice.ObtenerTodos();

            var lista = Choferes.Select(c => new VMChofer
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Telefono = c.Telefono,
                Direccion = c.Direccion
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMChofer model)
        {
            var Chofer = new Chofer
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                Direccion = model.Direccion
            };

            bool respuesta = await _Chofereservice.Insertar(Chofer);

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = Chofer.Id,
                    UsuarioModificado = model.Nombre,
                    Tipo = "Creado",
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMChofer model)
        {
            var Chofer = new Chofer
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                Direccion = model.Direccion,
            };

            bool respuesta = await _Chofereservice.Actualizar(Chofer);

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

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Chofereservice.Eliminar(id);


            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = id,
                    Tipo = "Eliminado",
                    UsuarioModificado = userSession.Nombre,
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }


            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Chofer = await _Chofereservice.Obtener(id);

            if (Chofer != null)
            {
                return StatusCode(StatusCodes.Status200OK, Chofer);
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