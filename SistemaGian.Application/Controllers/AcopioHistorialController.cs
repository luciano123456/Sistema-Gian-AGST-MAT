using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class AcopioHistorialController : Controller
    {
        private readonly IAcopioHistorialService _service;

        public AcopioHistorialController(IAcopioHistorialService service)
        {
            _service = service;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var data = await _service.ObtenerTodos();
            var lista = data
                .OrderByDescending(c => c.Fecha)
                .Select(c => new VMAcopioHistorial
                {
                    Id = c.Id,
                    IdProducto = c.IdProducto,
                    Ingreso = c.Ingreso,
                    Egreso = c.Egreso,
                    Observaciones = c.Observaciones,
                    Fecha = c.Fecha,
                    NombreProducto = c.IdProductoNavigation.Descripcion
                })
                .ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMAcopioHistorial model)
        {
            var entity = new AcopioHistorial
            {
                IdProducto = model.IdProducto,
                Ingreso = model.Ingreso,
                Egreso = model.Egreso,
                Observaciones = model.Observaciones,
                Fecha = DateTime.Now
            };
            bool res = await _service.Insertar(entity);
            return Ok(new { valor = res });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMAcopioHistorial model)
        {
            var entity = new AcopioHistorial
            {
                Id = model.Id,
                IdProducto = model.IdProducto,
                Ingreso = model.Ingreso,
                Egreso = model.Egreso,
                Observaciones = model.Observaciones,
                Fecha = model.Fecha
            };
            bool res = await _service.Actualizar(entity);
            return Ok(new { valor = res });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool res = await _service.Eliminar(id);
            return Ok(new { valor = res });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await _service.Obtener(id);

            if (entity != null)
            {
                var vm = new VMAcopioHistorial
                {
                    Id = entity.Id,
                    IdProducto = entity.IdProducto,
                    Ingreso = entity.Ingreso,
                    Egreso = entity.Egreso,
                    Observaciones = entity.Observaciones,
                    Fecha = entity.Fecha,
                    NombreProducto = entity.IdProductoNavigation.Descripcion
                };
                return Ok(vm);
            }
            else
            {
                return NotFound();
            }
        }
    }
}
