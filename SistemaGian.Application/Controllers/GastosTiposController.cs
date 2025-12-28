using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;

namespace SistemaGian.Application.ContGastosTipolers
{
    [Authorize]
    public class GastosTiposController : Controller
    {
        private readonly IGastosTiposService _GastosTiposService;

        public GastosTiposController(IGastosTiposService GastosTiposService, IProvinciaService provinciaService)
        {
            _GastosTiposService = GastosTiposService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var GastosTipos = await _GastosTiposService.ObtenerTodos();

            var lista = GastosTipos.Select(c => new VMGastosTipos
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGastosTipos model)
        {
            var GastosTipo = new GastosTipo
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _GastosTiposService.Insertar(GastosTipo);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGastosTipos model)
        {
            var GastosTipo = new GastosTipo
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _GastosTiposService.Actualizar(GastosTipo);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _GastosTiposService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
             var GastosTipo = await _GastosTiposService.Obtener(id);

            if (GastosTipo != null)
            {
                return StatusCode(StatusCodes.Status200OK, GastosTipo);
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