using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;

namespace SistemaGian.Application.Controllers
{
    public class ChoferesController : Controller
    {
        private readonly IChoferService _Chofereservice;
        private readonly IProvinciaService _provinciaService;

        public ChoferesController(IChoferService Chofereservice, IProvinciaService provinciaService)
        {
            _Chofereservice = Chofereservice;
            _provinciaService = provinciaService;
        }

        public IActionResult Index()
        {
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

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Chofereservice.Eliminar(id);

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