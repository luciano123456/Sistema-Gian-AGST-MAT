using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;

namespace SistemaGian.Application.Controllers
{
    public class MonedasController : Controller
    {
        private readonly IMonedaService _Monedaservice;

        public MonedasController(IMonedaService Monedaservice)
        {
            _Monedaservice = Monedaservice;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Monedas = await _Monedaservice.ObtenerTodos();

            var lista = Monedas.Select(c => new VMMoneda
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Cotizacion = c.Cotizacion,
                Image = c.Image,
               
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMMoneda model)
        {
            var Moneda = new Moneda
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Cotizacion = model.Cotizacion,
                Image = model.Image,
            };

            bool respuesta = await _Monedaservice.Insertar(Moneda);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMMoneda model)
        {
            var Moneda = new Moneda
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Cotizacion = model.Cotizacion,
                Image = model.Image,
            };

            bool respuesta = await _Monedaservice.Actualizar(Moneda);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Monedaservice.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Moneda = await _Monedaservice.Obtener(id);

            if (Moneda != null)
            {
                return StatusCode(StatusCodes.Status200OK, Moneda);
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