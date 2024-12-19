using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class PedidosController : Controller
    {

        private readonly IPedidoService _pedidoservice;
        private readonly IProductoService _Productoservice;

        public PedidosController(IPedidoService pedidoservice, IProductoService Productoservice)
        {
            _pedidoservice = pedidoservice;
            _Productoservice = Productoservice;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult NuevoModif()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerPedido(int idPedido)
        {
            var result = await _pedidoservice.ObtenerPedido(idPedido);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerPagosClientes(int idPedido)
        {
            var result = await _pedidoservice.ObtenerPagosClientes(idPedido);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerPagosaProveedores(int idPedido)
        {
            var result = await _pedidoservice.ObtenerPagosaProveedores(idPedido);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerDatosPedido(int idPedido)
        {
            Dictionary<string, object> result = new Dictionary<string, object>();

            var pedido = await _pedidoservice.ObtenerPedido(idPedido);
            var pagosaProveedores = await _pedidoservice.ObtenerPagosaProveedores(idPedido);
            var pagosClientes = await _pedidoservice.ObtenerPagosClientes(idPedido);
            var productos = await _pedidoservice.ObtenerProductosPedido(idPedido);

            result.Add("pedido", pedido);
            result.Add("pagosaProveedores", pagosaProveedores);
            result.Add("pagosClientes", pagosClientes);
            result.Add("productos", productos);

            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> ListaUltimosPrecios(int idCliente, int idProveedor)
        {
            try
            {
                // Obtener los productos
                var productos = await _Productoservice.ObtenerUltimosPrecios(idCliente, idProveedor);

                // Mapea los productos a DTO
                var productosDto = productos.GroupBy(p => p.IdProducto) // Agrupar por IdProducto
                    .Select(g => new
                    {
                        IdProducto = g.Key,
                        Nombre = _Productoservice.ObtenerDatos(g.FirstOrDefault().IdProducto).Result.Descripcion, // Suponiendo que Nombre es un campo del producto
                        Precios = g.Select(p => new
                        {
                            Id = p.Id,
                            Monto = p.PVentaNuevo // O el precio que desees mostrar
                        }).ToList()
                    }).ToList();

                return Ok(new { valor = productosDto });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error al obtener los productos: {ex.Message}");
            }
        }

        [HttpGet]
        public async Task<IActionResult> ListaUltimosPreciosProducto(int idCliente, int idProveedor, int idProducto)
        {
            try
            {
                // Obtener los productos
                var productos = await _Productoservice.ObtenerUltimosPreciosProducto(idCliente, idProveedor, idProducto);

                // Mapea los productos a DTO
                var productosDto = productos.GroupBy(p => p.IdProducto) // Agrupar por IdProducto
                    .Select(g => new
                    {
                        IdProducto = g.Key,
                        Nombre = _Productoservice.ObtenerDatos(g.FirstOrDefault().IdProducto).Result.Descripcion, // Suponiendo que Nombre es un campo del producto
                        Precios = g.Select(p => new
                        {
                            Id = p.Id,
                            Monto = p.PVentaNuevo // O el precio que desees mostrar
                        }).ToList()
                    }).ToList();

                return Ok(new { valor = productosDto });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error al obtener los productos: {ex.Message}");
            }
        }




    }
}
