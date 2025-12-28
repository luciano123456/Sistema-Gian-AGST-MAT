using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;
using System.Text.Json.Serialization;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using SistemaGian.Application.Hubs;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class PedidosController : Controller
    {

        private readonly IPedidoService _pedidoservice;
        private readonly IProductoService _Productoservice;
        private readonly IZonasService _zonaService;
        private readonly IChoferService _choferService;
        private readonly IMonedaService _monedaService;
        private readonly IProductosPrecioProveedorService _productosPrecioProveedorService;
        private readonly IClienteService _clienteService;
        private readonly IHubContext<NotificacionesHub> _hubContext;

        public PedidosController(
                                 IPedidoService pedidoservice,
                                 IProductoService Productoservice,
                                 IZonasService zonaService,
                                 IMonedaService monedaService,
                                 IChoferService choferService,
                                 IProductosPrecioProveedorService productosPrecioProveedorService,
                                 IClienteService clienteService,
                                 IHubContext<NotificacionesHub> hubContext // <-- AGREGAR
                             )
        {
                                _pedidoservice = pedidoservice;
                                _Productoservice = Productoservice;
                                _zonaService = zonaService;
                                _monedaService = monedaService;
                                _choferService = choferService;
                                _productosPrecioProveedorService = productosPrecioProveedorService;
                                _clienteService = clienteService;
                                _hubContext = hubContext; // <-- AGREGAR
        }

        public async Task<IActionResult> Index()
        {
            // Obtener el usuario actual desde la sesión usando el helper inyectado
            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);


            return View();
        }

        public async Task<IActionResult> NuevoModif(int? id)
        {
            if (id.HasValue)
            {
                // Modo edición
                var pedido = await _pedidoservice.ObtenerPedido(id.Value);

                if (pedido != null)
                {
                    var vmPedido = new VMPedido
                    {
                        Id = pedido.Id,
                        Fecha = pedido.Fecha,
                        FechaEntrega = pedido.FechaEntrega,
                        NroRemito = pedido.NroRemito,
                        CostoFlete = pedido.CostoFlete,
                        IdCliente = pedido.IdCliente,
                        IdProveedor = pedido.IdProveedor,
                        IdZona = pedido.IdZona,
                        IdChofer = pedido.IdChofer,
                        Cliente = pedido.IdClienteNavigation?.Nombre,
                        Proveedor = pedido.IdProveedorNavigation?.Nombre,
                        TotalCliente = pedido.TotalCliente,
                        RestanteCliente = pedido.RestanteCliente,
                        TotalProveedor = pedido.TotalProveedor,
                        RestanteProveedor = pedido.RestanteProveedor,
                        TotalGanancia = pedido.TotalGanancia,
                        PorcGanancia = pedido.PorcGanancia,
                        Estado = pedido.Estado,
                        Observacion = pedido.Observacion,
                        SaldoAFavor = pedido.IdClienteNavigation?.SaldoAfavor ?? 0,
                        Zona = pedido.IdZona.HasValue && pedido.IdZona.Value > 0
                            ? (await _zonaService.Obtener(pedido.IdZona.Value, -1)).Nombre
                            : ""
                    };

                    ViewBag.Data = vmPedido;
                }
                else
                {
                    ViewBag.Error = "No se encontró el pedido.";
                }
            }

            return View();
        }


        [HttpGet]
        public async Task<IActionResult> ObtenerProximoNroRemito()
        {
            int respuesta = await _pedidoservice.ObtenerUltimoNroRemito();
            return Ok(new { valor = respuesta });
        }

        // Método de ejemplo para obtener datos
        private object ObtenerDatosPorId(int id)
        {
            // Aquí puedes implementar la lógica para obtener los datos relacionados al ID
            return new { Id = id, Nombre = "Ejemplo" };
        }


        [HttpGet]
        public async Task<IActionResult> Lista(DateTime FechaDesde, DateTime FechaHasta, int IdProveedor = -1, int IdCliente = -1)
        {
            var clientes = await _pedidoservice.ObtenerTodos();

            var lista = clientes.Select(p => new VMPedido
            {
                Id = p.Id,
                Fecha = p.Fecha,
                FechaEntrega = p.FechaEntrega,
                NroRemito = p.NroRemito,
                CostoFlete = p.CostoFlete,
                IdCliente = p.IdCliente,
                IdProveedor = p.IdProveedor,
                IdZona = p.IdZona,
                IdChofer = p.IdChofer,
                Cliente = p.IdClienteNavigation.Nombre,
                Proveedor = p.IdProveedorNavigation.Nombre,
                TotalCliente = p.TotalCliente,
                RestanteCliente = p.RestanteCliente,
                TotalProveedor = p.TotalProveedor,
                RestanteProveedor = p.RestanteProveedor,
                TotalGanancia = p.TotalGanancia,
                PorcGanancia = p.PorcGanancia,
                Estado = p.Estado,
                Observacion = p.Observacion,
            }).Where(x => x.Estado == "Pendiente" && x.Fecha >= FechaDesde && x.Fecha <= FechaHasta && (x.IdCliente == IdCliente || IdCliente == -1) && (x.IdProveedor == IdProveedor || IdProveedor == -1)).ToList();

            return Ok(lista);
        }

        [HttpGet]
        public async Task<IActionResult> ListaEntregados(DateTime FechaDesde, DateTime FechaHasta, int IdProveedor = -1, int IdCliente = -1)
        {
            var clientes = await _pedidoservice.ObtenerTodos();

            var lista = clientes.Select(p => new VMPedido
            {
                Id = p.Id,
                Fecha = p.Fecha,
                FechaEntrega = p.FechaEntrega,
                NroRemito = p.NroRemito,
                CostoFlete = p.CostoFlete,
                IdCliente = p.IdCliente,
                IdProveedor = p.IdProveedor,
                IdZona = p.IdZona,
                IdChofer = p.IdChofer,
                Cliente = p.IdClienteNavigation.Nombre,
                Proveedor = p.IdProveedorNavigation.Nombre,
                TotalCliente = p.TotalCliente,
                RestanteCliente = p.RestanteCliente,
                TotalProveedor = p.TotalProveedor,
                RestanteProveedor = p.RestanteProveedor,
                TotalGanancia = p.TotalGanancia,
                PorcGanancia = p.PorcGanancia,
                Estado = p.Estado,
                Observacion = p.Observacion,
            }).Where(x => x.Estado == "Entregado" && x.FechaEntrega >= FechaDesde && x.FechaEntrega <= FechaHasta && (x.IdCliente == IdCliente || IdCliente == -1) && (x.IdProveedor == IdProveedor || IdProveedor == -1)).ToList();

            return Ok(lista);
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMPedido model)
        {
            Pedido pedido = await _pedidoservice.ObtenerPedido((int)model.Id);

            if (pedido != null)
            {

                pedido.Fecha = model.Fecha ?? DateTime.Now;
                pedido.IdCliente = model.IdCliente;
                pedido.FechaEntrega = model.FechaEntrega;
                pedido.NroRemito = model.NroRemito;
                pedido.CostoFlete = model.CostoFlete;
                pedido.IdProveedor = model.IdProveedor;
                pedido.IdZona = model.IdZona;
                pedido.IdChofer = model.IdChofer;
                pedido.TotalCliente = model.TotalCliente;
                pedido.RestanteCliente = model.RestanteCliente;
                pedido.TotalProveedor = model.TotalProveedor;
                pedido.RestanteProveedor = model.RestanteProveedor;
                pedido.TotalGanancia = model.TotalGanancia;
                pedido.PorcGanancia = model.PorcGanancia;
                pedido.Estado = model.Estado ?? "Pendiente";
                pedido.Observacion = model.Observacion;
            }

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
                        Id = pagoCliente.Id,
                        IdPedido = pedido.Id,
                        Fecha = pagoCliente.Fecha,
                        IdMoneda = pagoCliente.IdMoneda,
                        Cotizacion = pagoCliente.Cotizacion,
                        Total = pagoCliente.Total,
                        TotalArs = pagoCliente.TotalArs,
                        Observacion = pagoCliente.Observacion,
                        SaldoUsado = pagoCliente.SaldoUsado
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
                        Id = pagoProveedor.Id,
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
                        Id = producto.Id,
                        IdProducto = producto.IdProducto,
                        PrecioCosto = producto.PrecioCosto,
                        PrecioVenta = producto.PrecioVenta,
                        ProductoCantidad = producto.ProductoCantidad,
                        Cantidad = producto.Cantidad,
                        CantidadUsadaAcopio = producto.CantidadUsadaAcopio,
                        // 🔥 MONEDA
                        IdMoneda = producto.IdMoneda,
                        Cotizacion = producto.Cotizacion,
                        PrecioCostoArs = producto.PrecioCosto * producto.Cotizacion,
                        PrecioVentaArs = producto.PrecioVenta * producto.Cotizacion,
                        TotalArs = producto.TotalArs
                    };
                    pedidosProducto.Add(nuevoProducto);
                }
            }

            var respuesta = await _pedidoservice.Actualizar(pedido, pagosCliente, pagosProveedor, pedidosProducto);

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if(model.Estado != pedido.Estado)
            {

                await _hubContext.Clients.All.SendAsync("PedidoActualizado", new
                {
                    IdPedido = pedido.Id,
                    Cliente = pedido.IdClienteNavigation.Nombre,
                    Tipo = "Actualizado",
                    Fecha = pedido.Fecha,
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("PedidoActualizado", new
                {
                    IdPedido = pedido.Id,
                    Cliente = pedido.IdClienteNavigation.Nombre,
                    Tipo = "Actualizado",
                    Fecha = pedido.Fecha,
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }

            return Ok(new { valor = respuesta });
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPedido model)
        {


            var pedido = new Pedido
            {
                Fecha = model.Fecha ?? DateTime.Now,
                IdCliente = model.IdCliente,
                FechaEntrega = model.FechaEntrega,
                NroRemito = model.NroRemito,
                CostoFlete = model.CostoFlete,
                IdProveedor = model.IdProveedor,
                IdZona = model.IdZona,
                IdChofer = model.IdChofer,
                TotalCliente = model.TotalCliente,
                RestanteCliente = model.RestanteCliente,
                TotalProveedor = model.TotalProveedor,
                RestanteProveedor = model.RestanteProveedor,
                TotalGanancia = model.TotalGanancia,
                PorcGanancia = model.PorcGanancia,
                Estado = model.Estado ?? "Pendiente",
                Observacion = model.Observacion
            };

            bool respSaldo = true;

            List<PagosPedidosCliente> pagosCliente = new List<PagosPedidosCliente>();
            List<PagosPedidosProveedor> pagosProveedor = new List<PagosPedidosProveedor>();
            List<PedidosProducto> pedidosProducto = new List<PedidosProducto>();


            if (model.SaldoUsado > 0)
            {
                var observacion = $"Se resta el saldo por el pago de {model.SaldoUsado} en el pedido Nro {pedido.Id}";

                respSaldo = await _clienteService.RestarSaldo((int)model.IdCliente, (decimal)model.SaldoUsado, observacion);
            }


            if (respSaldo)
            {
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
                            Observacion = pagoCliente.Observacion,
                            SaldoUsado = pagoCliente.SaldoUsado
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
                            PrecioCosto = producto.PrecioCosto,
                            PrecioVenta = producto.PrecioVenta,
                            ProductoCantidad = producto.ProductoCantidad,
                            Cantidad = producto.Cantidad,
                            CantidadUsadaAcopio = producto.CantidadUsadaAcopio,
                            // 🔥 MONEDA
                            IdMoneda = producto.IdMoneda,
                            Cotizacion = producto.Cotizacion,
                            PrecioCostoArs = producto.PrecioCosto * producto.Cotizacion,
                            PrecioVentaArs = producto.PrecioVenta * producto.Cotizacion,
                            TotalArs = producto.PrecioVenta * producto.Cantidad * producto.Cotizacion
                        };
                        pedidosProducto.Add(nuevoProducto);
                    }
                }


            }

            bool respuesta = await _pedidoservice.Insertar(pedido, pagosCliente, pagosProveedor, pedidosProducto);

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);


            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("PedidoActualizado", new
                {
                    IdPedido = pedido.Id,
                    Cliente = pedido.IdClienteNavigation != null ? pedido.IdClienteNavigation.Nombre : "",
                    Proveedor = pedido.IdProveedorNavigation != null ? pedido.IdProveedorNavigation.Nombre : "",
                    Tipo = "Creado",
                    Fecha = pedido.Fecha,
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }


            return Ok(new { valor = respuesta });

        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _pedidoservice.Eliminar(id);

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("PedidoActualizado", new
                {
                    IdPedido = id,
                    Tipo = "Eliminado",
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
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

            if (idPedido > 0)
            {

                var pedido = await _pedidoservice.ObtenerPedido(idPedido);

                var pedidoJson = new VMPedido
                {
                    Id = pedido.Id,
                    Fecha = pedido.Fecha ?? DateTime.Now,
                    IdCliente = pedido.IdCliente,
                    FechaEntrega = pedido.FechaEntrega,
                    NroRemito = pedido.NroRemito,
                    CostoFlete = pedido.CostoFlete,
                    IdProveedor = pedido.IdProveedor,
                    IdZona = pedido.IdZona,
                    IdChofer = pedido.IdChofer,
                    TotalCliente = pedido.TotalCliente,
                    RestanteCliente = pedido.RestanteCliente,
                    TotalProveedor = pedido.TotalProveedor,
                    RestanteProveedor = pedido.RestanteProveedor,
                    TotalGanancia = pedido.TotalGanancia,
                    PorcGanancia = pedido.PorcGanancia,
                    Estado = pedido.Estado ?? "Pendiente",
                    Cliente = pedido.IdClienteNavigation?.Nombre,
                    DniCliente = pedido.IdClienteNavigation?.Dni,
                    TelefonoCliente = pedido.IdClienteNavigation?.Telefono,
                    DireccionCliente = pedido.IdClienteNavigation?.Direccion,
                    Proveedor = pedido.IdProveedorNavigation?.Nombre,
                    ApodoProveedor = pedido.IdProveedorNavigation?.Apodo,
                    TelefonoProveedor = pedido.IdProveedorNavigation?.Telefono,
                    DireccionProveedor = pedido.IdProveedorNavigation?.Ubicacion,
                    Observacion = pedido.Observacion,
                    Zona = pedido.IdZona.HasValue && pedido.IdZona.Value > 0 ? (await _zonaService.Obtener(pedido.IdZona.Value, -1)).Nombre : "",
                    Chofer = pedido.IdChofer.HasValue && pedido.IdChofer.Value > 0 ? (await _choferService.Obtener(pedido.IdChofer.Value)).Nombre : "",
                    SaldoAFavor = pedido.IdClienteNavigation.SaldoAfavor

                };

                var pagosaProveedores = await _pedidoservice.ObtenerPagosaProveedores(idPedido);
                var pagosClientes = await _pedidoservice.ObtenerPagosClientes(idPedido);
                var productos = await _pedidoservice.ObtenerProductosPedido(idPedido);

                var productosJson = productos.Select(p => new VMPedidosProducto
                {
                    Id = p.Id,
                    IdPedido = p.IdPedido,
                    IdProducto = p.IdProducto,
                    Cantidad = p.Cantidad,
                    PrecioCosto = p.PrecioCosto,
                    PrecioVenta = p.PrecioVenta,
                    ProductoCantidad = p.ProductoCantidad,
                    Nombre = p.IdProductoNavigation.Descripcion,
                    Total = p.PrecioVenta * p.Cantidad,
                    Peso = p.IdProductoNavigation.Peso,
                    UnidadMedida = p.IdProductoNavigation.IdUnidadDeMedidaNavigation.Nombre,
                    CantidadUsadaAcopio = (decimal)p.CantidadUsadaAcopio,

                     // 🔥 MONEDA
                   IdMoneda = (int)p.IdMoneda,
                    Moneda = p.IdMonedaNavigation.Nombre,
                    Cotizacion = (decimal)p.Cotizacion,
                    PrecioCostoArs = (decimal)p.PrecioCostoArs,
                    PrecioVentaArs = (decimal)p.PrecioVentaArs,
                    TotalArs = (decimal)p.TotalArs,

                }).ToList();


                var pagosaProveedoresJson = new List<VMPagosPedidosProveedor>();

                foreach (var p in pagosaProveedores)
                {
                    var monedaNombre = p.IdMoneda > 0 ? (await _monedaService.Obtener(p.IdMoneda)).Nombre : "";

                    pagosaProveedoresJson.Add(new VMPagosPedidosProveedor
                    {
                        Id = p.Id,
                        IdPedido = p.IdPedido,
                        Cotizacion = p.Cotizacion,
                        Fecha = p.Fecha,
                        IdMoneda = p.IdMoneda,
                        Observacion = p.Observacion,
                        Total = p.Total,
                        TotalArs = p.TotalArs,
                        Moneda = monedaNombre
                    });
                }

                var pagosClientesJson = new List<VMPagosPedidosCliente>();

                foreach (var p in pagosClientes)
                {
                    var monedaNombre = p.IdMoneda > 0 ? (await _monedaService.Obtener(p.IdMoneda)).Nombre : "";

                    pagosClientesJson.Add(new VMPagosPedidosCliente
                    {
                        Id = p.Id,
                        IdPedido = p.IdPedido,
                        Cotizacion = p.Cotizacion,
                        Fecha = p.Fecha,
                        IdMoneda = p.IdMoneda,
                        Observacion = p.Observacion,
                        Total = p.Total,
                        TotalArs = p.TotalArs,
                        Moneda = monedaNombre,
                        SaldoUsado = p.SaldoUsado
                    });
                }



                result.Add("pedido", pedidoJson);
                result.Add("pagosaProveedores", pagosaProveedoresJson);
                result.Add("pagosClientes", pagosClientesJson);
                result.Add("productos", productosJson);

                // Serialize with ReferenceHandler.Preserve to handle circular references
                var jsonOptions = new JsonSerializerOptions
                {
                    ReferenceHandler = ReferenceHandler.Preserve
                };

                return Ok(System.Text.Json.JsonSerializer.Serialize(result, jsonOptions));
            }

            return Ok(new { });

        }

        [HttpGet]
        public async Task<IActionResult> ListaUltimosPrecios(int idCliente, int idProveedor)
        {
            try
            {
                // Obtener los productos con sus precios históricos
                var productos = await _Productoservice.ObtenerUltimosPrecios(idCliente, idProveedor);

                // Crear una lista para almacenar los DTO
                var productosDto = new List<object>();

                foreach (var grupo in productos.GroupBy(p => p.IdProducto))
                {
                    var primerProducto = grupo.FirstOrDefault();

                    // Obtener datos adicionales para el producto
                    var productoDatos = await _Productoservice.ObtenerDatos(primerProducto.IdProducto);

                    // Resolver ProductoCantidad
                    var productoCantidad = await _productosPrecioProveedorService.ObtenerProductoProveedor(primerProducto.IdProducto, idProveedor);
                    var cantidadFinal = productoCantidad?.ProductoCantidad ?? productoDatos.ProductoCantidad;

                    // Crear DTO del producto
                    var productoDto = new
                    {
                        IdProducto = grupo.Key,
                        Nombre = productoDatos.Descripcion, // Asumiendo que Descripcion es el nombre del producto
                        ProductoCantidad = cantidadFinal,
                        UnidadMedida = productoDatos.IdUnidadDeMedidaNavigation.Nombre,
                        Peso = productoDatos.Peso,
                        IdMoneda = productoDatos.IdMoneda,
                        Precios = grupo.Select(p => new
                        {
                            Id = p.Id,
                            PrecioVenta = Math.Round(p.PVentaNuevo, 2),
                            PrecioCosto = Math.Round(p.PCostoNuevo, 2)
                        }).ToList()
                    };

                    productosDto.Add(productoDto);
                }

                // Retornar los resultados
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
                        ProductoCantidad = _Productoservice.ObtenerDatos(g.FirstOrDefault().IdProducto).Result.ProductoCantidad, // Suponiendo que Nombre es un campo del producto
                        UnidadMedida = _Productoservice.ObtenerDatos(g.FirstOrDefault().IdProducto).Result.IdUnidadDeMedidaNavigation.Nombre, // Suponiendo que Nombre es un campo del producto
                        Peso = _Productoservice.ObtenerDatos(g.FirstOrDefault().IdProducto).Result.Peso,
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
