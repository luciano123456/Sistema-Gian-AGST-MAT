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
    public class HistorialPreciosController : Controller
    {
        private readonly IProductosPrecioHistorialService _historialService;

        public HistorialPreciosController(IProductosPrecioHistorialService historialService)
        {
            _historialService = historialService;
        }

        public async Task<IActionResult> Index()
        {
            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (userSession != null && userSession.ModoVendedor == 1)
            {
                return RedirectToAction("Index", "Home");
            }

            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista(int idProducto, int idProveedor, DateTime FechaDesde, DateTime FechaHasta)
        {
            var historialPrecios = await _historialService.ObtenerHistorialProducto(idProducto, idProveedor, FechaDesde, FechaHasta);

            if (historialPrecios == null)
            {
                return Ok(null);
            }

            var lista = historialPrecios
                .OrderByDescending(c => c.Fecha)
                .Select(c => new VMProductosPreciosHistorial
                {
                    Id = c.Id,
                    IdProducto = c.IdProducto,
                    Producto = c.IdProductoNavigation.Descripcion,
                    PVentaNuevo = c.PVentaNuevo,
                    PCostoNuevo = c.PCostoNuevo,
                    Fecha = c.Fecha
                })
                .ToList();

            return Ok(lista);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var eliminado = await _historialService.Eliminar(id);

            if (eliminado)
                return StatusCode(StatusCodes.Status200OK, new { valor = eliminado });
            else
                return StatusCode(StatusCodes.Status500InternalServerError, new { valor = eliminado, mensaje = "Error al eliminar el registro." });
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
