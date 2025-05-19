using Newtonsoft.Json;
using SistemaGian.DAL.Repository;
using SistemaGian.Models;
using System.Data;

namespace SistemaGian.BLL.Service
{
    public class ProductoService : IProductoService
    {


        private readonly IProductoRepository _contactRepo;
        private readonly IProductosPrecioProveedorRepository<ProductosPreciosProveedor> _proveedorRepo;
        private readonly IProductosPrecioClienteRepository<ProductosPreciosCliente> _clienteRepo;
        private readonly IProductosPrecioHistorialRepository<ProductosPreciosHistorial> _productohistorialRepo;
        public ProductoService(IProductoRepository contactRepo, IProductosPrecioProveedorRepository<ProductosPreciosProveedor> proveedorRepo, IProductosPrecioClienteRepository<ProductosPreciosCliente> clienteRepo, IProductosPrecioHistorialRepository<ProductosPreciosHistorial> productohistorialRepo)
        {
            _contactRepo = contactRepo;
            _proveedorRepo = proveedorRepo;
            _clienteRepo = clienteRepo;
            _productohistorialRepo = productohistorialRepo;
        }
        public async Task<bool> Actualizar(Producto model)
        {
            var respProducto = await _contactRepo.Actualizar(model);

            if (respProducto)
            {
                var resultHistorial = await _productohistorialRepo.ObtenerFecha(model.Id, -1, -1, DateTime.Now);

                if (resultHistorial != null)
                {
                    resultHistorial.Fecha = DateTime.Now;
                    resultHistorial.PCostoAnterior = resultHistorial.PCostoNuevo;
                    resultHistorial.PCostoNuevo = model.PCosto;
                    resultHistorial.PVentaAnterior = resultHistorial.PVentaNuevo;
                    resultHistorial.PVentaNuevo = model.PVenta;
                    resultHistorial.PorcGananciaAnterior = resultHistorial.PorGananciaNuevo;
                    resultHistorial.PorGananciaNuevo = model.PorcGanancia;

                    var resultActualizarHistorial = await _productohistorialRepo.Actualizar(resultHistorial);
                }
                else
                {
                    var productoHistorial = new ProductosPreciosHistorial
                    {
                        Fecha = DateTime.Now,
                        IdProducto = model.Id,
                        PCostoAnterior = model.PCosto,
                        PCostoNuevo = model.PCosto,
                        PVentaAnterior = model.PVenta,
                        PVentaNuevo = model.PVenta,
                        PorcGananciaAnterior = model.PorcGanancia,
                        PorGananciaNuevo = model.PorcGanancia,
                    };

                    var resultInsertHistorial = await _productohistorialRepo.Insertar(productoHistorial);
                }
            }

            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }


        public async Task<bool> Insertar(Producto model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Producto> Obtener(int id, int idCliente, int idProveedor)
        {
            var producto = await _contactRepo.Obtener(id);
            ProductosPreciosCliente ProductoPrecioCliente = null;
            ProductosPreciosProveedor ProductoPrecioProveedor = null;
            ProductosPreciosProveedor ProductoPrecioProveedorDos = null;

            if (idProveedor > 0 && idCliente <= 0)
            {
                ProductoPrecioProveedor = await _proveedorRepo.ObtenerProductoProveedor(idProveedor, id);
            } else if(idProveedor > 0 && idCliente > 0){
                ProductoPrecioCliente = await _clienteRepo.ObtenerProductoCliente(idCliente,idProveedor, id);
                ProductoPrecioProveedorDos = await _proveedorRepo.ObtenerProductoProveedor(idProveedor, id);
            }

            if (ProductoPrecioProveedor != null || ProductoPrecioCliente != null)
            {
                // Crear un nuevo Producto para evitar modificar el objeto original directamente
                var productoConPrecio = new Producto
                {
                    Id = producto.Id,
                    Descripcion = producto.Descripcion,
                    IdMarca = producto.IdMarca,
                    IdCategoria = producto.IdCategoria,
                    IdUnidadDeMedida = producto.IdUnidadDeMedida,
                    IdMoneda = producto.IdMoneda,
                    PCosto = ProductoPrecioCliente != null ? ProductoPrecioCliente.PCosto : ProductoPrecioProveedor.PCosto,
                    PVenta = ProductoPrecioCliente != null ? ProductoPrecioCliente.PVenta : ProductoPrecioProveedor.PVenta,
                    PorcGanancia = ProductoPrecioCliente != null ? ProductoPrecioCliente.PorcGanancia : ProductoPrecioProveedor.PorcGanancia,
                    Image = producto.Image,
                    ProductoCantidad = ProductoPrecioCliente != null ? ProductoPrecioProveedorDos.ProductoCantidad : ProductoPrecioProveedor.ProductoCantidad,
                };

                return productoConPrecio;
            }

            return producto;
        }


        public async Task<IQueryable<Producto>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }

        public async Task<Producto> ObtenerDatos(int idProducto)
        {
            return await _contactRepo.ObtenerDatos(idProducto);
        }


        public async Task<IQueryable<Producto>> ListaProductosFiltro(int idCliente, int idProveedor, string productoFiltro)
        {
            try { 
            // Obtén todos los productos
            var productos = await _contactRepo.ObtenerTodos();

            // Diccionarios para almacenar precios por proveedor y cliente
            Dictionary<int, ProductosPreciosProveedor> preciosProveedorDict = new Dictionary<int, ProductosPreciosProveedor>();
            Dictionary<int, ProductosPreciosCliente> preciosClienteDict = new Dictionary<int, ProductosPreciosCliente>();

            // Lista para almacenar Proveedores y precios específicos del producto
            List<ProductosPreciosProveedor> ProveedoresPrecios = new List<ProductosPreciosProveedor>();

            // Obtener precios según las condiciones
            if (!string.IsNullOrEmpty(productoFiltro))
            {
                ProveedoresPrecios = await _proveedorRepo.ObtenerProveedoresProducto(productoFiltro);
            }
            else if (idProveedor > 0 && idCliente <= 0)
            {
                var preciosProveedor = (await _proveedorRepo.ObtenerProductosProveedor(idProveedor)).ToList();
                preciosProveedorDict = preciosProveedor.ToDictionary(p => p.IdProducto);
            }
            else if (idCliente > 0 && idProveedor > 0)
            {
                var preciosCliente = await _clienteRepo.ObtenerProductosCliente(idCliente, idProveedor);
                preciosClienteDict = preciosCliente.ToDictionary(p => p.IdProducto);
            }

            // Lista para almacenar los productos filtrados
            List<Producto> listaFiltrada = new List<Producto>();

            // Crear productos basados en Proveedores y precios
            if (!string.IsNullOrEmpty(productoFiltro))
            {
                foreach (var proveedorPrecio in ProveedoresPrecios)
                {
                    // Obtener el producto correspondiente
                    var prod = productos.FirstOrDefault(p => p.Id == proveedorPrecio.IdProducto);

                    if (prod != null)
                    {
                        // Crear una copia del producto con el precio actualizado
                        var productoNuevo = new Producto
                        {
                            Id = prod.Id,
                            Descripcion = prod.Descripcion,
                            FechaActualizacion = prod.FechaActualizacion,
                            IdMarca = prod.IdMarca,
                            IdCategoria = prod.IdCategoria,
                            IdUnidadDeMedida = prod.IdUnidadDeMedida,
                            IdMoneda = prod.IdMoneda,
                            PCosto = proveedorPrecio.PCosto,
                            PVenta = proveedorPrecio.PVenta,
                            PorcGanancia = proveedorPrecio.PorcGanancia,
                            IdProveedor = proveedorPrecio.IdProveedor,
                            IdMarcaNavigation = prod.IdMarcaNavigation,
                            IdCategoriaNavigation = prod.IdCategoriaNavigation,
                            IdUnidadDeMedidaNavigation = prod.IdUnidadDeMedidaNavigation,
                            IdMonedaNavigation = prod.IdMonedaNavigation,
                            Image = prod.Image,
                            ProductoCantidad = prod.ProductoCantidad
                        };

                        listaFiltrada.Add(productoNuevo);
                    }
                }
            }
            else
            {
                listaFiltrada = productos.Where(c => idProveedor == -1 ||
                                                     preciosProveedorDict.ContainsKey(c.Id) ||
                                                     preciosClienteDict.ContainsKey(c.Id)).ToList();

                // Actualiza la información de costos y precios en la lista filtrada
                foreach (var producto in listaFiltrada)
                {
                    if (preciosProveedorDict.TryGetValue(producto.Id, out var precioProveedor))
                    {
                        producto.PCosto = precioProveedor.PCosto;
                        producto.PVenta = precioProveedor.PVenta;
                        producto.PorcGanancia = precioProveedor.PorcGanancia;
                        producto.ProductoCantidad = precioProveedor.ProductoCantidad;
                    }
                    else if (preciosClienteDict.TryGetValue(producto.Id, out var precioCliente))
                    {
                        producto.PCosto = precioCliente.PCosto;
                        producto.PVenta = precioCliente.PVenta;
                        producto.PorcGanancia = precioCliente.PorcGanancia;
                        var productoProveedor = await _proveedorRepo.ObtenerProductoProveedor(idProveedor, producto.Id);

                        // Verificando si ProductoCantidad tiene valor
                        producto.ProductoCantidad = productoProveedor.ProductoCantidad ?? 0;
                    }
                }
            }

            return listaFiltrada.AsQueryable();
            } catch (Exception ex)
            {
                return null;
            }
        }



        public async Task<bool> AumentarPrecios(string productos, int idCliente, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta)
        {
            bool resp;

            

            if (idProveedor > 0 && idCliente <= 0)
            {
                resp = await _proveedorRepo.AumentarPrecio(productos, idProveedor, porcentajeCosto, porcentajeVenta);
            }
            else if (idProveedor > 0 && idCliente > 0)
            {
                resp = await _clienteRepo.AumentarPrecio(productos, idCliente, idProveedor, porcentajeCosto, porcentajeVenta);
            }
            else
            {
                resp = await _contactRepo.AumentarPrecio(productos, porcentajeCosto, porcentajeVenta);
            }

            return resp;
        }

        public async Task<bool> BajarPrecios(string productos, int idCliente, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta)
        {
            bool resp;



            if (idProveedor > 0 && idCliente <= 0)
            {
                resp = await _proveedorRepo.BajarPrecio(productos, idProveedor, porcentajeCosto, porcentajeVenta);
            }
            else if (idProveedor > 0 && idCliente > 0)
            {
                resp = await _clienteRepo.BajarPrecio(productos, idCliente, idProveedor, porcentajeCosto, porcentajeVenta);
            }
            else
            {
                resp = await _contactRepo.BajarPrecio(productos, porcentajeCosto, porcentajeVenta);
            }

            return resp;
        }

        public async Task<List<ProductosPreciosHistorial>> ObtenerUltimosPrecios(int idCliente, int idProveedor)
        {
            var prodPrecios = await _productohistorialRepo.ObtenerUltimosPrecios(idProveedor, idCliente);

            return prodPrecios;
        }

        public async Task<List<ProductosPreciosHistorial>> ObtenerUltimosPreciosProducto(int idCliente, int idProveedor, int idProducto)
        {
            var prodPrecios = await _productohistorialRepo.ObtenerUltimosPreciosProducto(idProveedor, idCliente, idProducto);

            return prodPrecios;
        }

        public async Task<bool> DuplicarProductos(string productos)
        {
            var duplicados = await _contactRepo.DuplicarProductos(productos);

            return duplicados;
        }

        public async Task<bool> DuplicarProducto(int idProducto)
        {
            var duplicado = await _contactRepo.DuplicarProducto(idProducto);

            return duplicado;
        }

        public async Task<bool> EditarActivo(int id, int activo)
        {
            var resp = await _contactRepo.EditarActivo(id, activo);
            return resp;
        }
    }
}
