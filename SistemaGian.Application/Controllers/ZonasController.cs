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

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Zonas = await _ZonasService.ObtenerTodos();

            var lista = Zonas.Select(c => new VMZonas
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Precio = c.Precio,
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
                Precio = model.Precio
            };

            bool respuesta = await _ZonasService.Insertar(Zona);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMZonas model)
        {
            var Zona = new Zona
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Precio = model.Precio
            };

            bool respuesta = await _ZonasService.Actualizar(Zona);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _ZonasService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
             var Zona = await _ZonasService.Obtener(id);

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