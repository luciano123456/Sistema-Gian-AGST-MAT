using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class GastosController : Controller
    {
        private readonly IGastosService _service;

        public GastosController(IGastosService service)
        {
            _service = service;
        }

        public IActionResult Index() => View();

        [HttpPost]
        public async Task<IActionResult> Lista([FromBody] VMGastosFiltro vm)
        {
            // normalización (-1/0 -> null)
            DateTime? fd = vm.FechaDesde;
            DateTime? fh = vm.FechaHasta;
            int? idMoneda = (vm.IdMoneda > 0) ? vm.IdMoneda : null;
            int? idTipo = (vm.IdTipo > 0) ? vm.IdTipo : null;

            var q = await _service.Listar(fd, fh, idMoneda, idTipo);

            var lista = q.Select(x => new VMGastos
            {
                Id = x.Id,
                Fecha = x.Fecha,
                IdTipo = x.IdTipo,
                Tipo = x.IdTipoNavigation.Nombre,
                IdMoneda = x.IdMoneda,
                Moneda = x.IdMonedaNavigation.Nombre,
                Importe = x.Importe,
                Cotizacion = x.Cotizacion,
                ImporteArs = x.ImporteArs,
                Concepto = x.Concepto
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Resumen([FromBody] VMGastosFiltro vm)
        {
            DateTime? fd = vm.FechaDesde;
            DateTime? fh = vm.FechaHasta;
            int? idMoneda = (vm.IdMoneda > 0) ? vm.IdMoneda : null;
            int? idTipo = (vm.IdTipo > 0) ? vm.IdTipo : null;

            var rows = await _service.ResumenPorMoneda(fd, fh, idMoneda, idTipo);

            var lista = rows.Select(x => new VMGastosResumen
            {
                IdMoneda = x.IdMoneda,
                Moneda = x.Moneda,
                Cantidad = x.Cantidad,
                Total = x.Total
            }).ToList();

            return Ok(lista);
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var g = await _service.Obtener(id);
            if (g == null) return NotFound();
            return Ok(g);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGastos model)
        {
            var g = new Gasto
            {
                Fecha = model.Fecha,
                IdMoneda = model.IdMoneda,
                IdTipo = model.IdTipo,
                Importe = model.Importe,
                Cotizacion = model.Cotizacion,
                ImporteArs = model.ImporteArs,
                Concepto = model.Concepto
            };

            var ok = await _service.Insertar(g);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGastos model)
        {
            var g = new Gasto
            {
                Id = model.Id,
                Fecha = model.Fecha,
                IdMoneda = model.IdMoneda,
                IdTipo = model.IdTipo,
                Importe = model.Importe,
                Cotizacion = model.Cotizacion,
                ImporteArs = model.ImporteArs,
                Concepto = model.Concepto
            };

            var ok = await _service.Actualizar(g);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var ok = await _service.Eliminar(id);
            return Ok(new { valor = ok });
        }

    }
}
