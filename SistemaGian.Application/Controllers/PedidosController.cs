using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;

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

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPedido model)
        {

         
            var pedido = new Pedido
            {
                Fecha = model.Fecha ?? DateTime.Now,
                IdCliente = model.IdCliente ?? 0,
                FechaEntrega = model.FechaEntrega,
                NroRemito = model.NroRemito,
                CostoFlete = model.CostoFlete ?? 0m,
                IdProveedor = model.IdProveedor ?? 0, 
                IdZona = model.IdZona,
                IdChofer = model.IdChofer,
                TotalCliente = model.TotalCliente ?? 0m, 
                RestanteCliente = model.RestanteCliente ?? 0m,
                TotalProveedor = model.TotalProveedor ?? 0m,
                RestanteProveedor = model.RestanteProveedor ?? 0m,
                Estado = model.Estado ?? "Pendiente",
                Observacion = model.Observacion
            };


            bool respuesta = await _pedidoservice.NuevoPedido(pedido);

            List<PagosPedidosCliente> pagosCliente = new List<PagosPedidosCliente>();
            List<PagosPedidosProveedor> pagosProveedor = new List<PagosPedidosProveedor>();
            List<PedidosProducto> pedidosProducto = new List<PedidosProducto>();

            // Agregar los pagos de clientes
            if (model.PagosPedidosClientes != null && model.PagosPedidosClientes.Any())
            {
                foreach (var pagoCliente in model.PagosPedidosClientes)
                {
                    var nuevoPagoCliente = new PagosPedidosCliente
                    {
                        IdPedido = pedido.Id,
                        Fecha = pagoCliente.Fecha,
                        IdMoneda = pagoCliente.IdMoneda,
                        Cotizacion = pagoCliente.Cotizacion,
                        Total = pagoCliente.Total,
                        TotalArs = pagoCliente.TotalArs,
                        Observacion = pagoCliente.Observacion
                    };
                    pagosCliente.Add(nuevoPagoCliente);
                }
            }

            // Agregar los pagos de proveedores
            if (model.PagosPedidosProveedores != null && model.PagosPedidosProveedores.Any())
            {
                foreach (var pagoProveedor in model.PagosPedidosProveedores)
                {
                    var nuevoPagoProveedor = new PagosPedidosProveedor
                    {
                        IdPedido = pedido.Id,
                        Fecha = pagoProveedor.Fecha,
                        IdMoneda = pagoProveedor.IdMoneda,
                        Cotizacion = pagoProveedor.Cotizacion,
                        Total = pagoProveedor.Total,
                        TotalArs = pagoProveedor.TotalArs,
                        Observacion = pagoProveedor.Observacion
                    };
                    pagosProveedor.Add(nuevoPagoProveedor);
                }
            }

            // Agregar los pagos de clientes
            if (model.PedidosProductos != null && model.PedidosProductos.Any())
            {
                foreach (var producto in model.PedidosProductos)
                {
                    var nuevoProducto = new PedidosProducto
                    {
                        IdPedido = pedido.Id,
                        IdProducto = producto.IdProducto,
                        Precio = producto.Precio,
                        Cantidad = producto.Cantidad,
                    };
                    pedidosProducto.Add(nuevoProducto);
                }
            }

            bool resppagoscliente = await _pedidoservice.InsertarPagosCliente(pagosCliente);
            bool resppagosproveedor = await _pedidoservice.InsertarPagosProveedor(pagosProveedor);
            bool respproductos = await _pedidoservice.InsertarProductos(pedidosProducto);


            return Ok(new { valor = respuesta && resppagoscliente && resppagosproveedor && respproductos });
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
                        Precios = g.Select(async p => new
                        {
                            Id = p.Id,
                            PrecioVenta = p.PVentaNuevo, // O el precio que desees mostrar
                            PrecioCosto = p.PCostoNuevo
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
                            PrecioVenta = p.PVentaNuevo, // O el precio que desees mostrar
                            PrecioCosto = p.PCostoNuevo
                        }).ToList()
                    }).ToList();

                return Ok(new { valor = productosDto });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error al obtener los productos: {ex.Message}");
            }
        }



        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
