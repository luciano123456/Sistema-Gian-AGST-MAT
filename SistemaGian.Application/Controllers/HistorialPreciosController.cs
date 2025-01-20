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

        public IActionResult Index()
        {
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


    

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}