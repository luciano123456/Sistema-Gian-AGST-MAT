using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Newtonsoft.Json;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaGian.DAL.Repository
{
    public class ProductosPrecioProveedorRepository : IProductosPrecioProveedorRepository<ProductosPreciosProveedor>
    {

        private readonly SistemaGianContext _dbcontext;
        private readonly IProductosPrecioHistorialRepository<ProductosPreciosHistorial> _productoshistorialrepo;

        private readonly IProductosPrecioClienteRepository<ProductosPreciosCliente> _productosPrecioClienteRepo;

        public ProductosPrecioProveedorRepository(
            SistemaGianContext context,
            IProductosPrecioHistorialRepository<ProductosPreciosHistorial> productoshistorialrepo,
            IProductosPrecioClienteRepository<ProductosPreciosCliente> productosPrecioClienteRepo)
        {
            _dbcontext = context;
            _productoshistorialrepo = productoshistorialrepo;
            _productosPrecioClienteRepo = productosPrecioClienteRepo;
        }



        public async Task<bool> AsignarProveedor(List<ProductosPreciosProveedor> productos)
        {
            try
            {
                // Agrupar por proveedor para evitar múltiples queries por cada producto
                var proveedoresIds = productos.Select(p => p.IdProveedor).Distinct().ToList();

                // Obtener todos los clientes por proveedor de una sola vez
                var clientesPorProveedor = await _dbcontext.ProductosPreciosClientes
                    .Where(x => proveedoresIds.Contains(x.IdProveedor))
                    .GroupBy(x => x.IdProveedor)
                    .ToDictionaryAsync(g => g.Key, g => g.Select(x => x.IdCliente).Distinct().ToList());

                // Obtener todos los productosPreciosClientes existentes para evitar consultas individuales
                var combinacionesExistentes = await _dbcontext.ProductosPreciosClientes
                    .Select(x => new { x.IdProducto, x.IdProveedor, x.IdCliente })
                    .ToListAsync();

                foreach (var producto in productos)
                {
                    _dbcontext.ProductosPreciosProveedores.Add(producto);

                    if (clientesPorProveedor.TryGetValue(producto.IdProveedor, out var clientes))
                    {
                        foreach (var idCliente in clientes)
                        {
                            bool yaExiste = combinacionesExistentes.Any(x =>
                                x.IdCliente == idCliente &&
                                x.IdProveedor == producto.IdProveedor &&
                                x.IdProducto == producto.IdProducto);

                            if (!yaExiste)
                            {
                                var nuevo = new ProductosPreciosCliente
                                {
                                    IdCliente = idCliente,
                                    IdProveedor = producto.IdProveedor,
                                    IdProducto = producto.IdProducto,
                                    PCosto = producto.PCosto,
                                    PVenta = producto.PVenta,
                                    PorcGanancia = producto.PorcGanancia,
                                    FechaActualizacion = DateTime.Now
                                };

                                _dbcontext.ProductosPreciosClientes.Add(nuevo);
                            }
                        }
                    }
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }


        public async Task<bool> Actualizar(ProductosPreciosProveedor model)
        {
            ProductosPreciosProveedor modelProveedor = await ObtenerUltimoRegistro(model.IdProducto, model.IdProveedor);

            await ActualizarOInsertarHistorial(model, modelProveedor);

            _dbcontext.ProductosPreciosProveedores.Update(model);
            await _dbcontext.SaveChangesAsync();

            // Obtener todos los clientes que tienen algún producto con este proveedor
            var clientes = await _dbcontext.ProductosPreciosClientes
                .Where(x => x.IdProveedor == model.IdProveedor)
                .Select(x => x.IdCliente)
                .Distinct()
                .ToListAsync();

            foreach (var idCliente in clientes)
            {
                var clienteModel = await _dbcontext.ProductosPreciosClientes
                    .FirstOrDefaultAsync(x =>
                        x.IdProducto == model.IdProducto &&
                        x.IdProveedor == model.IdProveedor &&
                        x.IdCliente == idCliente);

                if (clienteModel != null)
                {
                    // Historial previo del cliente
                    var anterior = new ProductosPreciosProveedor
                    {
                        IdProducto = clienteModel.IdProducto,
                        IdProveedor = clienteModel.IdProveedor,
                        PCosto = clienteModel.PCosto,
                        PVenta = clienteModel.PVenta,
                        PorcGanancia = clienteModel.PorcGanancia
                    };

                    await ActualizarOInsertarHistorial(model, anterior);

                    // Actualizar si ya lo tiene
                    clienteModel.PCosto = model.PCosto;
                    clienteModel.PVenta = model.PVenta;
                    clienteModel.PorcGanancia = model.PorcGanancia;

                    await _productosPrecioClienteRepo.Actualizar(clienteModel);
                }
                else
                {
                    // Insertar si no lo tiene
                    var nuevo = new ProductosPreciosCliente
                    {
                        IdCliente = idCliente,
                        IdProveedor = model.IdProveedor,
                        IdProducto = model.IdProducto,
                        PCosto = model.PCosto,
                        PVenta = model.PVenta,
                        PorcGanancia = model.PorcGanancia,
                        FechaActualizacion = DateTime.Now
                    };

                    _dbcontext.ProductosPreciosClientes.Add(nuevo);

                    // Crear historial como si fuera desde 0
                    await ActualizarOInsertarHistorial(model, null);
                }
            }

            await _dbcontext.SaveChangesAsync();

            return true;
        }

        private async Task<ProductosPreciosProveedor> ObtenerUltimoRegistro(int idProducto, int idProveedor)
        {
            return await _dbcontext.ProductosPreciosProveedores
                .Where(x => x.IdProducto == idProducto && x.IdProveedor == idProveedor)
                .OrderByDescending(x => x.FechaActualizacion)
                .FirstOrDefaultAsync();
        }

        private async Task ActualizarOInsertarHistorial(ProductosPreciosProveedor model, ProductosPreciosProveedor modelProveedor)
        {
            var resultHistorial = await _productoshistorialrepo.ObtenerFecha(model.IdProducto, model.IdProveedor, -1, DateTime.Now);

            if (resultHistorial != null)
            {
                // Actualizar el historial existente
                resultHistorial.PVentaAnterior = resultHistorial.PVentaNuevo;
                resultHistorial.PVentaNuevo = model.PVenta;
                resultHistorial.PCostoAnterior = resultHistorial.PCostoNuevo;
                resultHistorial.PCostoNuevo = model.PCosto;
                resultHistorial.PorcGananciaAnterior = resultHistorial.PorGananciaNuevo;
                resultHistorial.PorGananciaNuevo = ((model.PVenta - model.PCosto) / model.PCosto) * 100;
                await _productoshistorialrepo.Actualizar(resultHistorial);
            }
            else
            {
                // Obtener el último historial existente
                resultHistorial = await _productoshistorialrepo.Obtener(model.IdProducto, model.IdProveedor, -1);

                // Insertar un nuevo historial
                var productoHistorial = new ProductosPreciosHistorial
                {
                    IdProducto = model.IdProducto,
                    IdProveedor = model.IdProveedor,
                    PVentaAnterior = resultHistorial != null ? resultHistorial.PVentaNuevo : model.PVenta,
                    PVentaNuevo = model.PVenta,
                    PCostoAnterior = resultHistorial != null ? resultHistorial.PCostoNuevo : model.PCosto,
                    PCostoNuevo = model.PCosto,
                    Fecha = DateTime.Now,
                    PorcGananciaAnterior = resultHistorial != null ? resultHistorial.PorGananciaNuevo : model.PorcGanancia,
                    PorGananciaNuevo = ((model.PVenta - model.PCosto) / model.PCosto) * 100,
                };
                await _productoshistorialrepo.Insertar(productoHistorial);
            }
        }

        public async Task<bool> Eliminar(int id, int idProveedor)
        {
            try
            {
                var model = await _dbcontext.ProductosPreciosProveedores
                    .FirstOrDefaultAsync(c => c.IdProducto == id && c.IdProveedor == idProveedor);

                if (model == null)
                    return false;

                // Eliminar historial relacionado
                var historialRelacionado = _dbcontext.ProductosPreciosHistorial
                    .Where(h => h.IdProducto == id && h.IdProveedor == idProveedor);

                _dbcontext.ProductosPreciosHistorial.RemoveRange(historialRelacionado);

                // Eliminar el precio proveedor
                _dbcontext.ProductosPreciosProveedores.Remove(model);

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }



        public async Task<ProductosPreciosProveedor> ObtenerProductoProveedor(int idproveedor, int idproducto)
        {

            var prod = await _dbcontext.ProductosPreciosProveedores
          .Where(x => x.IdProveedor == idproveedor && x.IdProducto == idproducto)
          .Include(p => p.IdProductoNavigation)
          .Include(p => p.IdProveedorNavigation)
          .FirstOrDefaultAsync();

            return prod;
        }

        public async Task<List<ProductosPreciosProveedor>> ObtenerProveedoresProducto(int producto)
        {
            var proveedoresProductos = await _dbcontext.ProductosPreciosProveedores
                .Where(ppp => ppp.IdProducto == producto)
                .Include(ppp => ppp.IdProductoNavigation)
                .Include(ppp => ppp.IdProveedorNavigation)
                .ToListAsync();

            return proveedoresProductos;
        }




        public Task<IQueryable<Models.ProductosPreciosProveedor>> ObtenerProductosProveedor(int idProveedor)
        {
            IQueryable<Models.ProductosPreciosProveedor> productos = _dbcontext.ProductosPreciosProveedores.Where(x => x.IdProveedor == idProveedor);

            return Task.FromResult(productos);
        }


            public async Task<bool> AumentarPrecio(string productos, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta)
        {
            return await ModificarPrecio(productos, idProveedor, porcentajeCosto, porcentajeVenta, true);
        }

        public async Task<bool> BajarPrecio(string productos, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta)
        {
            return await ModificarPrecio(productos, idProveedor, porcentajeCosto, porcentajeVenta, false);
        }

        private async Task<bool> ModificarPrecio(string productos, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta, bool esAumento)
        {
            try
            {
                var lstProductos = JsonConvert.DeserializeObject<List<int>>(productos);

                foreach (var prod in lstProductos)
                {
                    ProductosPreciosProveedor model = await ObtenerUltimoRegistroProveedor(prod, idProveedor);

                    List<ProductosPreciosCliente> modelCliente = _dbcontext.ProductosPreciosClientes
                        .Where(x => x.IdProducto == prod && x.IdProveedor == idProveedor)
                        .ToList();

                    // Modificar precios para todos los clientes de este proveedor
                    foreach (var cliente in modelCliente)
                    {
                        cliente.PCosto = ModificarValor(cliente.PCosto, porcentajeCosto, esAumento);
                        cliente.PorcGanancia = ((cliente.PVenta - cliente.PCosto) / cliente.PCosto) * 100;
                    }

                    var resultHistorial = await _productoshistorialrepo.ObtenerFecha(prod, idProveedor, -1, DateTime.Now);

                    if (resultHistorial != null)
                    {
                        ActualizarHistorial(resultHistorial, model, porcentajeCosto, porcentajeVenta, esAumento);
                        await _productoshistorialrepo.Actualizar(resultHistorial);
                    }
                    else
                    {
                        resultHistorial = await _productoshistorialrepo.Obtener(prod, idProveedor, -1);

                        var productoHistorial = CrearNuevoHistorial(prod, idProveedor, resultHistorial, model, porcentajeCosto, porcentajeVenta, esAumento);
                        await _productoshistorialrepo.Insertar(productoHistorial);
                    }

                    // Actualizar precios en el modelo del proveedor
                    model.PVenta = ModificarValor(model.PVenta, porcentajeVenta, esAumento);
                    model.PCosto = ModificarValor(model.PCosto, porcentajeCosto, esAumento);
                    model.PorcGanancia = ((model.PVenta - model.PCosto) / model.PCosto) * 100;
                    _dbcontext.ProductosPreciosProveedores.Update(model);
                }
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                // Manejar excepciones según sea necesario
                return false;
            }
        }

        private async Task<ProductosPreciosProveedor> ObtenerUltimoRegistroProveedor(int idProducto, int idProveedor)
        {
            return await _dbcontext.ProductosPreciosProveedores
                .Where(x => x.IdProducto == idProducto && x.IdProveedor == idProveedor)
                .OrderByDescending(x => x.FechaActualizacion) // Asegúrate de que 'FechaActualizacion' es el nombre correcto de la columna de fecha
                .FirstOrDefaultAsync();
        }

        private void ActualizarHistorial(ProductosPreciosHistorial resultHistorial, ProductosPreciosProveedor model, decimal porcentajeCosto, decimal porcentajeVenta, bool esAumento)
        {
            resultHistorial.PVentaAnterior = resultHistorial.PVentaNuevo;
            resultHistorial.PVentaNuevo = ModificarValor(model.PVenta, porcentajeVenta, esAumento);
            resultHistorial.PCostoAnterior = resultHistorial.PCostoNuevo;
            resultHistorial.PCostoNuevo = ModificarValor(model.PCosto, porcentajeCosto, esAumento);
            resultHistorial.PorcGananciaAnterior = resultHistorial.PorGananciaNuevo;
            resultHistorial.PorGananciaNuevo = ((model.PVenta - model.PCosto) / model.PCosto) * 100;
        }

        private ProductosPreciosHistorial CrearNuevoHistorial(int prod, int idProveedor, ProductosPreciosHistorial resultHistorial, ProductosPreciosProveedor model, decimal porcentajeCosto, decimal porcentajeVenta, bool esAumento)
        {
            return new ProductosPreciosHistorial
            {
                IdProducto = prod,
                IdProveedor = idProveedor,
                PVentaAnterior = resultHistorial != null ? resultHistorial.PVentaNuevo : model.PVenta,
                PVentaNuevo = ModificarValor(model.PVenta, porcentajeVenta, esAumento),
                PCostoAnterior = resultHistorial != null ? resultHistorial.PCostoNuevo : model.PCosto,
                PCostoNuevo = ModificarValor(model.PCosto, porcentajeCosto, esAumento),
                Fecha = DateTime.Now,
                PorcGananciaAnterior = resultHistorial != null ? resultHistorial.PorGananciaNuevo : model.PorcGanancia,
                PorGananciaNuevo = ((model.PVenta - model.PCosto) / model.PCosto) * 100,
            };
        }

        private decimal ModificarValor(decimal valor, decimal porcentaje, bool esAumento)
        {
            return esAumento ? valor * (1 + porcentaje / 100.0m) : valor * (1 - porcentaje / 100);
        }

        public async Task<bool> GuardarOrden(int idProducto, int idProveedor, int Orden)
        {
            var producto = await _dbcontext.ProductosPreciosProveedores
                .Where(x => x.IdProducto == idProducto && x.IdProveedor == idProveedor)
                .OrderByDescending(x => x.FechaActualizacion) // Asegúrate de que 'FechaActualizacion' es el nombre correcto de la columna de fecha
                .FirstOrDefaultAsync();

            producto.Orden = Orden;
            await _dbcontext.SaveChangesAsync();
            return true;
        }
    }
}
