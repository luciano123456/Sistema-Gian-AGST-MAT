using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using SistemaGian.Application.Hubs;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class ProductosController : Controller
    {
        private readonly IProductoService _Productoservice;
        private readonly IMarcaService _Marcaservice;
        private readonly ICategoriaService _Categoriaservice;
        private readonly IUnidadDeMedidaService _UnidadDeMedidaService;
        private readonly IProductosPrecioProveedorService _productoprecioProveedorService;
        private readonly IProductosPrecioClienteService _productoPrecioClienteService;
        private readonly IProveedorService _proveedorService;
        private readonly IClienteService _clienteService;
        private readonly IHubContext<NotificacionesHub> _hubContext;

        public ProductosController(IProductoService Productoservice, IMarcaService marcaservice, ICategoriaService categoriaservice, IUnidadDeMedidaService unidadDeMedidaService, IProductosPrecioProveedorService productoprecioProveedorService, IProductosPrecioClienteService productoPrecioClienteService, IProveedorService proveedorService, IClienteService clienteService, IHubContext<NotificacionesHub> hubContext)
        {
            _Productoservice = Productoservice;
            _Marcaservice = marcaservice;
            _Categoriaservice = categoriaservice;
            _UnidadDeMedidaService = unidadDeMedidaService;
            _productoprecioProveedorService = productoprecioProveedorService;
            _productoPrecioClienteService = productoPrecioClienteService;
            _proveedorService = proveedorService;
            _clienteService = clienteService;
            _hubContext = hubContext;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AsignarProveedor([FromBody] VMAsignarProveedores modelo)
        {
            try
            {
                // ✅ Pasamos productos (como string) y lista de IDs
                var result = await _productoprecioProveedorService.AsignarProveedor(modelo.productos, modelo.idProveedores);
                return Json(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return Json(null);
            }
        }



        [HttpPost]
        public async Task<IActionResult> DuplicarProductos([FromBody] VMDuplicarProductos modelo)
        {
            try
            {
                var result = await _Productoservice.DuplicarProductos(modelo.productos);

                var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

                if (result)
                {
                    var ids = modelo.productos.Split(',', StringSplitOptions.RemoveEmptyEntries);

                    await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                    {
                        Tipo = "CreadoMasivo",
                        Cliente = "",
                        Cantidad = ids.Length, // ✅ Cantidad real de productos
                        Proveedor = "",
                        Usuario = userSession.Nombre,
                        IdUsuario = userSession.Id
                    });
                }

                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(null);
            }
        }


        [HttpPost]
        public async Task<IActionResult> DuplicarProducto(int idProducto)
        {
            try
            {
                var result = await _Productoservice.DuplicarProducto(idProducto);



                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(null);
            }

        }

        [HttpPost]
        public async Task<IActionResult> GuardarOrden([FromBody] VMOrdenProducto model)
        {
            try
            {



                // Obtener filtros desde query o header si los estás usando
                var idProveedor = Convert.ToInt32(HttpContext.Request.Headers["idProveedor"]);
                var idCliente = Convert.ToInt32(HttpContext.Request.Headers["idCliente"]);

                var producto = await _Productoservice.Obtener(model.Id, idCliente, idProveedor);

                bool result;

                if (idProveedor > 0 && idCliente > 0)
                {
                    // Guardar en la tabla cliente-proveedor
                    result = await _productoPrecioClienteService.GuardarOrden(model.Id, idCliente, idProveedor, model.Orden);
                }
                else if (idProveedor > 0)
                {
                    // Guardar en la tabla proveedor
                    result = await _productoprecioProveedorService.GuardarOrden(model.Id, idProveedor, model.Orden);
                }
                else
                {
                    // Guardar en la tabla base
                    result = await _Productoservice.GuardarOrden(model.Id, model.Orden);
                }

                var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

                if (result)
                {
                    await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                    {
                        Id = model.Id,
                        Tipo = "Actualizado",
                        Producto = producto.Descripcion,
                        Cliente = idCliente > 0 ? _clienteService.Obtener(idCliente).Result.Nombre : "",
                        Proveedor = idProveedor > 0 ? _proveedorService.Obtener(idProveedor).Result.Nombre : "",
                        Usuario = userSession.Nombre,
                        IdUsuario = userSession.Id
                    });
                }

                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(false);
            }
        }


        [HttpPost]
        public async Task<IActionResult> GuardarOrdenMasivo([FromBody] List<VMOrdenProducto> productos)
        {
            try
            {
                var idProveedor = Convert.ToInt32(HttpContext.Request.Headers["idProveedor"]);
                var idCliente = Convert.ToInt32(HttpContext.Request.Headers["idCliente"]);

                foreach (var p in productos)
                {
                    if (idProveedor > 0 && idCliente > 0)
                    {
                        await _productoPrecioClienteService.GuardarOrden(p.Id, idCliente, idProveedor, p.Orden);
                    }
                    else if (idProveedor > 0)
                    {
                        await _productoprecioProveedorService.GuardarOrden(p.Id, idProveedor, p.Orden);
                    }
                    else
                    {
                        await _Productoservice.GuardarOrden(p.Id, p.Orden);
                    }
                }

                return Ok(true);
            }
            catch (Exception ex)
            {
                return BadRequest("Error al guardar el orden");
            }
        }



        [HttpPost]
        public async Task<IActionResult> AumentarPrecios([FromBody] VMAumentoProductos modelo)
        {
            try
            {
                var result = await _Productoservice.AumentarPrecios(modelo.productos, modelo.idCliente, modelo.idProveedor, modelo.porcentajeCosto, modelo.porcentajeVenta);

                var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

                if (result)
                {
                    var ids = modelo.productos.Split(',', StringSplitOptions.RemoveEmptyEntries);

                    await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                    {
                        Tipo = "ActualizadoMasivo",
                        Cliente = modelo.idCliente > 0 ? _clienteService.Obtener(modelo.idCliente).Result.Nombre : "",
                        Cantidad = ids.Length, // ✅ ahora calcula bien la cantidad
                        Proveedor = modelo.idProveedor > 0 ? _proveedorService.Obtener(modelo.idProveedor).Result.Nombre : "",
                        Usuario = userSession.Nombre,
                        IdUsuario = userSession.Id
                    });
                }

                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(null);
            }
        }


        [HttpPost]
        public async Task<IActionResult> BajarPrecios([FromBody] VMAumentoProductos modelo)
        {
            try
            {
                var result = await _Productoservice.BajarPrecios(modelo.productos, modelo.idCliente, modelo.idProveedor, modelo.porcentajeCosto, modelo.porcentajeVenta);

                var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

                if (result)
                {


                    var ids = modelo.productos.Split(',', StringSplitOptions.RemoveEmptyEntries);
                    await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                    {

                        Tipo = "ActualizadoMasivo",
                        Cliente = modelo.idCliente > 0 ? _clienteService.Obtener(modelo.idCliente).Result.Nombre : "",
                        Cantidad = ids.Length, // ✅ ahora calcula bien la cantidad
                        Proveedor = modelo.idProveedor > 0 ? _proveedorService.Obtener(modelo.idProveedor).Result.Nombre : "",
                        Usuario = userSession.Nombre,
                        IdUsuario = userSession.Id
                    });
                }

                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(null);
            }


        }



        [HttpPost]
        public async Task<IActionResult> AsignarCliente([FromBody] VMAsignarClientes modelo)
        {
            try
            {
                var result = await _productoPrecioClienteService.AsignarCliente(
                    modelo.productos,
                    modelo.idClientes,
                    modelo.idProveedor
                );

                var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

                if (result)
                {
                    await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                    {
                        Tipo = "ActualizadoMasivo",
                        Cliente = "Varios clientes",
                        Cantidad = modelo.productos.Length,
                        Proveedor = modelo.idProveedor > 0 ? _proveedorService.Obtener(modelo.idProveedor).Result.Nombre : "",
                        Usuario = userSession.Nombre,
                        IdUsuario = userSession.Id
                    });
                }

                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(null);
            }
        }


        [HttpGet]
        public async Task<IActionResult> Lista()
        {

            try { 
            var productos = await _Productoservice.ObtenerTodos();

            var baseList = productos.Select(c => new VMProducto
            {
                Id = c.Id,
                FechaActualizacion = c.FechaActualizacion,
                Descripcion = c.Descripcion,
                Marca = c.IdMarcaNavigation != null ? c.IdMarcaNavigation.Nombre : "",
                Categoria = c.IdCategoriaNavigation != null ? c.IdCategoriaNavigation.Nombre : "",
                UnidadDeMedida = c.IdUnidadDeMedidaNavigation != null ? c.IdUnidadDeMedidaNavigation.Nombre : "",
                Moneda = c.IdMonedaNavigation != null ? c.IdMonedaNavigation.Nombre : "",
                IdMoneda = c.IdMoneda,
                IdUnidadDeMedida = c.IdUnidadDeMedida,
                IdMarca = c.IdMarca,
                IdCategoria = c.IdCategoria,
                PCosto = c.PCosto,
                PVenta = c.PVenta,
                PorcGanancia = c.PorcGanancia,
                ProductoCantidad = c.ProductoCantidad,
                Total = c.PVenta * (decimal)c.ProductoCantidad,
                Image = c.Image,
                Activo = c.Activo != null ? (int)c.Activo : 1,
                Orden = c.Orden != null ? c.Orden : 0,
                Peso = c.Peso != null ? (decimal)c.Peso : 0
            }).ToList();

                // 1) Con orden (>0), ordenados ascendente
                var conOrden = baseList
                    .Where(p => p.Orden > 0)
                    .OrderBy(p => p.Orden);

                // 2) Sin orden (<=0), enviados al final con Orden = 0
                var sinOrden = baseList
                    .Where(p => p.Orden <= 0)
                    .Select(p => { p.Orden = 0; return p; });

                var resultado = conOrden.Concat(sinOrden).ToList();

                return Ok(resultado);

            } catch (Exception ex)
            {
                return BadRequest($"Error al obtener los productos: {ex.Message}");
            }
        }


        [HttpGet]
        public async Task<IActionResult> ListaProductosProveedor(int idProveedor)
        {
            try
            {
                var productos = await _Productoservice.ListaProductosFiltro(-1, idProveedor, -1);

                var baseList = productos.Select(c => new VMProducto
                {
                    Id = c.Id,
                    FechaActualizacion = c.FechaActualizacion,
                    Descripcion = c.Descripcion,
                    Marca = c.IdMarcaNavigation != null ? c.IdMarcaNavigation.Nombre : string.Empty,
                    Categoria = c.IdCategoriaNavigation != null ? c.IdCategoriaNavigation.Nombre : string.Empty,
                    UnidadDeMedida = c.IdUnidadDeMedidaNavigation != null ? c.IdUnidadDeMedidaNavigation.Nombre : string.Empty,
                    Moneda = c.IdMonedaNavigation != null ? c.IdMonedaNavigation.Nombre : string.Empty,
                    Proveedor = c.IdProveedor > 0 ? _proveedorService.Obtener((int)c.IdProveedor).Result.Nombre : null,
                    IdMoneda = c.IdMoneda,
                    IdUnidadDeMedida = c.IdUnidadDeMedida,
                    IdMarca = c.IdMarca,
                    IdCategoria = c.IdCategoria,
                    PCosto = c.PCosto,
                    PVenta = c.PVenta,
                    PorcGanancia = c.PorcGanancia,
                    ProductoCantidad = c.ProductoCantidad,
                    Total = c.PVenta * (decimal)c.ProductoCantidad,
                    Image = c.Image,
                    Activo = (int)c.Activo,
                    Orden = c.Orden ?? 0 // 👈 Asegurate que c.Orden venga correctamente desde el servicio
                }).ToList();

                var conOrden = baseList
                                 .Where(p => p.Orden > 0)
                                 .OrderBy(p => p.Orden);

                // 2) Sin orden (<=0), enviados al final con Orden = 0
                var sinOrden = baseList
                    .Where(p => p.Orden <= 0)
                    .Select(p => { p.Orden = 0; return p; });

                var resultado = conOrden.Concat(sinOrden).ToList();

                return Ok(resultado);

            }
            catch (Exception ex)
            {
                return BadRequest($"Error al obtener los productos: {ex.Message}");
            }
        }



        [HttpGet]
        public async Task<IActionResult> ListaProductosFiltro(int idCliente, int idProveedor, int producto)
        {
            try
            {
                var productos = await _Productoservice.ListaProductosFiltro(idCliente, idProveedor, producto);

                var baseList = productos.Select(c => new VMProducto
                {
                    Id = c.Id,
                    FechaActualizacion = c.FechaActualizacion,
                    Descripcion = c.Descripcion,
                    Marca = c.IdMarcaNavigation != null ? c.IdMarcaNavigation.Nombre : string.Empty,
                    Categoria = c.IdCategoriaNavigation != null ? c.IdCategoriaNavigation.Nombre : string.Empty,
                    UnidadDeMedida = c.IdUnidadDeMedidaNavigation != null ? c.IdUnidadDeMedidaNavigation.Nombre : string.Empty,
                    Moneda = c.IdMonedaNavigation != null ? c.IdMonedaNavigation.Nombre : string.Empty,
                    Proveedor = c.IdProveedor > 0 ? _proveedorService.Obtener((int)c.IdProveedor).Result.Nombre : null,
                    IdMoneda = c.IdMoneda,
                    IdUnidadDeMedida = c.IdUnidadDeMedida,
                    IdMarca = c.IdMarca,
                    IdCategoria = c.IdCategoria,
                    PCosto = c.PCosto,
                    PVenta = c.PVenta,
                    PorcGanancia = c.PorcGanancia,
                    ProductoCantidad = c.ProductoCantidad,
                    Total = c.PVenta * (decimal)c.ProductoCantidad,
                    Image = c.Image,
                    Activo = (int)c.Activo,
                    Orden = c.Orden ?? 0 // 👈 Asegurate que c.Orden venga correctamente desde el servicio
                }).ToList();

                // ✅ Si se está filtrando por un producto específico, no ordenar
                if (producto > 0)
                {
                    return Ok(baseList);
                }

                // 1) Con orden (>0), ordenados ascendente
                var conOrden = baseList
                    .Where(p => p.Orden > 0)
                    .OrderBy(p => p.Orden);

                // 2) Sin orden (<=0), enviados al final con Orden = 0
                var sinOrden = baseList
                    .Where(p => p.Orden <= 0)
                    .Select(p => { p.Orden = 0; return p; });

                var resultado = conOrden.Concat(sinOrden).ToList();

                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error al obtener los productos: {ex.Message}");
            }
        }










        [HttpPost]
        public async Task<IActionResult> EditarActivo([FromBody] VMEstadoProductos model)
        {
            try
            {

                var result = await _Productoservice.EditarActivo(model.Id, (int)model.activo);

                if (result)
                {

                    var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

                    await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                    {
                        Id = model.Id,
                        Tipo = "Actualizado",
                        Producto = model.Id > 0 ? _Productoservice.Obtener(model.Id, -1, -1).Result.Descripcion : "",
                        Cliente =  "",
                        Proveedor =  "",
                        Usuario = userSession.Nombre,
                        IdUsuario = userSession.Id
                    });

                    return Json(new { Status = true });

                }
                else
                {
                    return Json(new { Status = false });
                }
            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }

        }



        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProducto model)
        {
            var Producto = new Producto
            {
                Id = model.Id,
                FechaActualizacion = model.FechaActualizacion,
                Descripcion = model.Descripcion,
                IdMarca = model.IdMarca,
                IdCategoria = model.IdCategoria,
                IdUnidadDeMedida = model.IdUnidadDeMedida,
                IdMoneda = model.IdMoneda,
                PCosto = model.PCosto,
                PVenta = model.PVenta,
                PorcGanancia = model.PorcGanancia,
                ProductoCantidad = model.ProductoCantidad != null ? model.ProductoCantidad : 1,
                Image = model.Image,
                Activo = 1,
                Peso = model.Peso
            };

            bool respuesta = await _Productoservice.Insertar(Producto);


            await _Productoservice.Actualizar(Producto);

            if (respuesta)
            {

                var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = model.Id,
                    Tipo = "Creado",
                    Producto = model.Descripcion,
                    Cliente = "",
                    Proveedor = "",
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });

            }

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProducto model)
        {

            var respuesta = false;



            var Producto = new Producto
            {
                Id = model.Id,
                FechaActualizacion = model.FechaActualizacion,
                Descripcion = model.Descripcion,
                IdMarca = model.IdMarca,
                IdCategoria = model.IdCategoria,
                IdUnidadDeMedida = model.IdUnidadDeMedida,
                IdMoneda = model.IdMoneda,
                PCosto = model.PCosto,
                PVenta = model.PVenta,
                PorcGanancia = model.PorcGanancia,
                ProductoCantidad = model.ProductoCantidad,
                Image = model.Image,
                Activo = model.Activo,
                Peso = model.Peso
            };


            if (model.IdProveedor > 0 && model.IdCliente <= 0)
            {
                respuesta = await _productoprecioProveedorService.ActualizarProductoProveedor(Producto, model.IdProveedor);
            }
            else if (model.IdProveedor > 0 && model.IdCliente > 0)
            {
                respuesta = await _productoPrecioClienteService.ActualizarProductoCliente(Producto, model.IdCliente, model.IdProveedor);
            }
            else
            {
                respuesta = await _Productoservice.Actualizar(Producto);
            }


            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = model.Id,
                    Tipo = "Actualizado",
                    Producto = Producto.Descripcion,
                    Cliente = model.IdCliente > 0 ? _clienteService.Obtener(model.IdCliente).Result.Nombre : "",
                    Proveedor = model.IdProveedor > 0 ? _proveedorService.Obtener(model.IdProveedor).Result.Nombre : "",
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }


            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id, int idProveedor, int idCliente)
        {

            bool respuesta = false;

            var nombreProducto = _Productoservice.Obtener(id, -1, -1).Result.Descripcion;

            if (idProveedor > 0 && idCliente <= 0)
            {
                respuesta = await _productoprecioProveedorService.Eliminar(id, idProveedor);
            }
            else if (idProveedor > 0 && idCliente > 0)
            {
                respuesta = await _productoPrecioClienteService.Eliminar(id, idCliente, idProveedor);
            }
            else
            {
                respuesta = await _Productoservice.Eliminar(id);
            }

            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            if (respuesta)
            {
                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = id,
                    Tipo = "Eliminado",
                    Producto = nombreProducto,
                    Cliente = idCliente > 0 ? _clienteService.Obtener(idCliente).Result.Nombre : "",
                    Proveedor = idProveedor > 0 ? _proveedorService.Obtener(idProveedor).Result.Nombre : "",
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });
            }

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }


        [HttpPost]
        public async Task<IActionResult> EditarActivoProveedor([FromBody] VMEstadoProductosProveedor model)
        {
            try
            {
                if (model.IdProveedor <= 0)
                    return BadRequest("Proveedor inválido");

                var result = await _productoprecioProveedorService.EditarActivo(
                    model.Id,
                    model.IdProveedor,
                    model.activo
                );

                if (!result)
                    return Json(new { Status = false });

                var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

                await _hubContext.Clients.All.SendAsync("ActualizarSignalR", new
                {
                    Id = model.Id,
                    Tipo = "Actualizado",
                    Producto = _Productoservice.Obtener(model.Id, -1, -1).Result.Descripcion,
                    Cliente = "",
                    Proveedor = _proveedorService.Obtener(model.IdProveedor).Result.Nombre,
                    Usuario = userSession.Nombre,
                    IdUsuario = userSession.Id
                });

                return Json(new { Status = true });
            }
            catch
            {
                return Json(new { Status = false });
            }
        }



        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id, int idCliente, int idProveedor)
        {
            var model = await _Productoservice.Obtener(id, idCliente, idProveedor);

            var Producto = new VMProducto
            {
                Id = model.Id,
                Descripcion = model.Descripcion,
                IdMarca = model.IdMarca,
                IdCategoria = model.IdCategoria,
                IdUnidadDeMedida = model.IdUnidadDeMedida,
                IdMoneda = model.IdMoneda,
                PCosto = model.PCosto,
                PVenta = model.PVenta,
                PorcGanancia = model.PorcGanancia,
                ProductoCantidad = model.ProductoCantidad != null ? model.ProductoCantidad : 1,
                Image = model.Image,
                Peso = (decimal)model.Peso,
                Activo = model.Activo != null ? (int)model.Activo : 1
            };


            if (Producto != null)
            {
                return StatusCode(StatusCodes.Status200OK, Producto);
            }
            else
            {
                return StatusCode(StatusCodes.Status404NotFound);
            }
        }
        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}