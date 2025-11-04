using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SistemaGian.Application.Hubs;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class ProveedoresController : Controller
    {
        private readonly IProveedorService _ProveedorService;
        private readonly IHubContext<NotificacionesHub> _hubContext;


        public ProveedoresController(IProveedorService ProveedorService, IHubContext<NotificacionesHub> hubContext)
        {
            _ProveedorService = ProveedorService;
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

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Proveedores = await _ProveedorService.ObtenerTodos();

            var lista = Proveedores.Select(c => new VMProveedor
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Apodo = c.Apodo,
                Ubicacion = c.Ubicacion,
                Telefono = c.Telefono,
            }).ToList();

            return Ok(lista);
        }

        [HttpGet]
        public async Task<IActionResult> ListaPorCliente(int idcliente)
        {
            var Proveedores = await _ProveedorService.ObtenerTodosCliente(idcliente);

            var lista = Proveedores.Select(c => new VMProveedor
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Apodo = c.Apodo,
                Ubicacion = c.Ubicacion,
                Telefono = c.Telefono,
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProveedor model)
        {
            var Proveedor = new Proveedor
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Apodo = model.Apodo,
                Ubicacion = model.Ubicacion,
                Telefono = model.Telefono,
            };

            bool respuesta = await _ProveedorService.Insertar(Proveedor);

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = Proveedor.Id,
                    UsuarioModificado = model.Nombre,
                    Tipo = "Creado",
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProveedor model)
        {
            var Proveedor = new Proveedor
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Apodo = model.Apodo,
                Ubicacion = model.Ubicacion,
                Telefono = model.Telefono,
            };

            bool respuesta = await _ProveedorService.Actualizar(Proveedor);

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

            Proveedor proveedor = await _ProveedorService.Obtener(id);

            bool respuesta = await _ProveedorService.Eliminar(id);

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = id,
                    Tipo = "Eliminado",
                    UsuarioModificado = proveedor.Nombre,
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Proveedor = await _ProveedorService.Obtener(id);

            if (Proveedor != null)
            {
                return StatusCode(StatusCodes.Status200OK, Proveedor);
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