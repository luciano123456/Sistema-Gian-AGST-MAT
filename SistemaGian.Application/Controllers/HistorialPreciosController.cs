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
        private readonly IProductosPrecioHistorialService _ProductosPrecioHistorialService;

        public HistorialPreciosController(IProductosPrecioHistorialService ProductosPrecioHistorialService)
        {
            _ProductosPrecioHistorialService = ProductosPrecioHistorialService;
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
        public async Task<IActionResult> Lista(int idProducto, int idProveedor, DateTime FechaDesde, DateTime FechaHasta)
        {
            var historialPrecios = await _ProductosPrecioHistorialService.ObtenerHistorialProducto(idProducto, idProveedor, FechaDesde, FechaHasta);

            if(historialPrecios == null)
            {
                return Ok(null);
            }
            var lista = historialPrecios.Select(c => new VMProductosPreciosHistorial
            { 
                  Fecha = c.Fecha,
                  Id = c.Id,
                  IdProducto = c.IdProducto,
                  PVentaNuevo = c.PVentaNuevo,
                  PCostoNuevo = c.PCostoNuevo,
                  Producto = c.IdProductoNavigation.Descripcion,
            }).ToList();

            return Ok(lista);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var eliminado = await _ProductosPrecioHistorialService.Eliminar(id);
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