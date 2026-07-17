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
        public async Task<IActionResult> Lista(int idProducto, int idProveedor, int idCliente = -1, DateTime? FechaDesde = null, DateTime? FechaHasta = null)
        {
            var desde = FechaDesde ?? DateTime.Today.AddDays(-30);
            var hasta = FechaHasta ?? DateTime.Today;

            var historialPrecios = await _historialService.ObtenerHistorialProducto(idProducto, idProveedor, idCliente, desde, hasta);

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
                    IdProveedor = c.IdProveedor,
                    IdCliente = c.IdCliente,
                    Producto = c.IdProductoNavigation.Descripcion,
                    PVentaNuevo = c.PVentaNuevo,
                    PVentaAnterior = c.PVentaAnterior,
                    PCostoNuevo = c.PCostoNuevo,
                    PCostoAnterior = c.PCostoAnterior,
                    Fecha = c.Fecha
                })
                .ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> RevertirPrecio(int id, string tipo)
        {
            if (id <= 0 || string.IsNullOrWhiteSpace(tipo))
                return BadRequest(new { valor = false, mensaje = "Datos inválidos." });

            var ok = await _historialService.RevertirPrecio(id, tipo.Trim());
            if (!ok)
                return StatusCode(StatusCodes.Status500InternalServerError, new { valor = false, mensaje = "No se pudo revertir el precio. Verificá que el producto tenga precio cargado para ese cliente/proveedor." });

            return Ok(new { valor = true });
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
