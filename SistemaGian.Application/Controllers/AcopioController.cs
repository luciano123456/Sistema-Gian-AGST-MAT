using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using SistemaGian.Application.Models.ViewModels;
using System.Diagnostics;
using SistemaGian.Application.Models;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class AcopioController : Controller
    {
        private readonly IAcopioHistorialService _historialService;
        private readonly IAcopioStockActualService _stockService;

        public AcopioController(
            IAcopioHistorialService historialService,
            IAcopioStockActualService stockService)
        {
            _historialService = historialService;
            _stockService = stockService;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> ListaStock()
        {
            var data = await _stockService.ObtenerTodos();
            var lista = data.Select(c => new VMAcopioStockActual
            {
                IdProducto = c.IdProducto,
                CantidadActual = c.CantidadActual,
                FechaUltimaActualizacion = c.FechaUltimaActualizacion,
                NombreProducto = c.IdProductoNavigation.Descripcion,
                Proveedor = c.IdProveedorNavigation.Nombre,
                IdProveedor = (int)c.IdProveedor
            }).ToList();

            return Ok(lista);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerStock(int idProducto, int idProveedor)
        {
            var c = await _stockService.Obtener(idProducto, idProveedor);

            if (c == null)
                return NotFound();

            var vm = new VMAcopioStockActual
            {
                IdProducto = c.IdProducto,
                CantidadActual = c.CantidadActual,
                FechaUltimaActualizacion = c.FechaUltimaActualizacion,
                NombreProducto = c.IdProductoNavigation.Descripcion,
            };

            return Ok(vm);
        }


        [HttpGet]
        public async Task<IActionResult> ListaHistorial(int idProducto)
        {
            var data = await _historialService.ObtenerPorProducto(idProducto);
            var lista = data.Select(c => new VMAcopioHistorial
            {
                Id = c.Id,
                IdProducto = c.IdProducto,
                Ingreso = c.Ingreso,
                Egreso = c.Egreso,
                Observaciones = c.Observaciones,
                Fecha = c.Fecha,
                NombreProducto = c.IdProductoNavigation?.Descripcion,
                Proveedor = c.IdProveedorNavigation?.Nombre
            }).ToList();

            return Ok(lista);
        }
        [HttpPost]
        public async Task<IActionResult> InsertarMovimiento([FromBody] VMAcopioHistorial model)
        {
            // 1) Crear historial
            var historialEntity = new AcopioHistorial
            {
                IdProducto = model.IdProducto,
                Ingreso = model.Ingreso,
                Egreso = model.Egreso,
                Observaciones = model.Observaciones,
                IdProveedor = model.IdProveedor,
                Fecha = DateTime.Now
            };

            var resHistorial = await _historialService.Insertar(historialEntity);

            // 2) Actualizar o insertar stock actual
            var stockActual = await _stockService.Obtener(model.IdProducto, model.IdProveedor);
            if (stockActual != null)
            {
                // Sumar ingresos, restar egresos
                stockActual.CantidadActual += (model.Ingreso ?? 0) - (model.Egreso ?? 0);
                stockActual.FechaUltimaActualizacion = DateTime.Now;

                await _stockService.Actualizar(stockActual);
            }
            else
            {
                // Si no existe, crearlo
                var nuevoStock = new AcopioStockActual
                {
                    IdProducto = model.IdProducto,
                    IdProveedor = model.IdProveedor,
                    CantidadActual = (model.Ingreso ?? 0) - (model.Egreso ?? 0),
                    FechaUltimaActualizacion = DateTime.Now
                  
                };
                await _stockService.Insertar(nuevoStock);
            }

            return Ok(new { valor = resHistorial });
        }


        [HttpDelete]
        public async Task<IActionResult> EliminarMovimiento(int id)
        {
            // Recuperar el movimiento
            var movimiento = await _historialService.Obtener(id);
            if (movimiento == null)
                return NotFound(new { valor = false, mensaje = "Movimiento no encontrado." });

            // Ajustar el stock
            var resAjuste = await _stockService.AjustarStockAlEliminarMovimiento(movimiento);
            if (!resAjuste)
                return StatusCode(500, new { valor = false, mensaje = "Error al ajustar stock." });

            // Eliminar historial
            var resEliminar = await _historialService.Eliminar(id);
            if (!resEliminar)
                return StatusCode(500, new { valor = false, mensaje = "Error al eliminar historial." });

            return Ok(new { valor = true });
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
