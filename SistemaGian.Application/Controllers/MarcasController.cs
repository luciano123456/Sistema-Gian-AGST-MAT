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

    public class MarcasController : Controller
    {
        private readonly IMarcaService _Marcaservice;
        private readonly IProvinciaService _provinciaService;

        public MarcasController(IMarcaService Marcaservice)
        {
            _Marcaservice = Marcaservice;
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
            var Marcas = await _Marcaservice.ObtenerTodos();

            var lista = Marcas.Select(c => new VMProductoMarca
            {
                Id = c.Id,
                Nombre = c.Nombre,
            
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProductoMarca model)
        {
            var Marca = new ProductosMarca
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _Marcaservice.Insertar(Marca);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProductoMarca model)
        {
            var Marca = new ProductosMarca
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _Marcaservice.Actualizar(Marca);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Marcaservice.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Marca = await _Marcaservice.Obtener(id);

            if (Marca != null)
            {
                return StatusCode(StatusCodes.Status200OK, Marca);
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