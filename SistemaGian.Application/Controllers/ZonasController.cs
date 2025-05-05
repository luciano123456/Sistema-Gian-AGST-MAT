using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class ZonasController : Controller
    {
        private readonly IZonasService _ZonasService;

        public ZonasController(IZonasService ZonasService, IProvinciaService provinciaService)
        {
            _ZonasService = ZonasService;
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
        public async Task<IActionResult> Lista(int IdCliente)
        {
            var Zonas = await _ZonasService.ObtenerPorCliente(IdCliente);

            var lista = Zonas.Select(c => new VMZonas
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Precio = (decimal)c.Precio,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMZonas model)
        {


            var Zona = new Zona
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Precio = model.Precio,
            };

            bool respuesta = await _ZonasService.Insertar(Zona);

            return Ok(new { valor = respuesta });
        }

        [HttpPost]
        public async Task<IActionResult> InsertarZonaCliente([FromBody] VMZonaAsignarCliente model)
        {
            bool respuesta = await _ZonasService.InsertarZonaCliente(model.zonas, model.idCliente);

            return Ok(new { valor = respuesta });

        }
        [HttpPut]
        public async Task<bool> Actualizar([FromBody] VMZonas model)
        {
            bool respuesta = false;

            try
            {

                if (model != null)
                {
                    if (model.IdCliente > 0)
                    {
                        var Zona = new ZonasCliente
                        {
                            IdZona = model.Id,
                            IdCliente = model.IdCliente,
                            Precio = model.Precio
                        };
                        respuesta = await _ZonasService.ActualizarZonaCliente(Zona);
                    }
                    else
                    {
                        var Zona = new Zona
                        {
                            Id = model.Id,
                            Nombre = model.Nombre,
                            Precio = model.Precio,
                        };
                        respuesta = await _ZonasService.Actualizar(Zona);
                    }
                }
    
        } catch(Exception ex)
            {
                return false;
            }

            return respuesta;
        }

[HttpDelete]
public async Task<IActionResult> Eliminar(int id)
{
    bool respuesta = await _ZonasService.Eliminar(id);

    return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
}

[HttpGet]
public async Task<IActionResult> EditarInfo(int id, int idCliente)
{
    var Zona = await _ZonasService.Obtener(id, idCliente);

    if (Zona != null)
    {
        return StatusCode(StatusCodes.Status200OK, Zona);
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