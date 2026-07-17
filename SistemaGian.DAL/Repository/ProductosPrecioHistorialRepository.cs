using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Newtonsoft.Json;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaGian.DAL.Repository
{
    public class ProductosPrecioHistorialRepository : IProductosPrecioHistorialRepository<ProductosPreciosHistorial>
    {

        private readonly SistemaGianContext _dbcontext;


        public ProductosPrecioHistorialRepository(SistemaGianContext context)
        {
            _dbcontext = context;

        }

        public async Task<bool> Insertar(ProductosPreciosHistorial model)
        {
            try
            {
                _dbcontext.ProductosPreciosHistorial.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch { return false; }
        }

        public async Task<bool> Actualizar(ProductosPreciosHistorial model)
        {
            try
            {
                _dbcontext.ProductosPreciosHistorial.Update(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch { return false; }
        }

        public async Task<ProductosPreciosHistorial> Obtener(int idProducto, int idProveedor, int idCliente)
        {
            try
            {
                ProductosPreciosHistorial result = await _dbcontext.ProductosPreciosHistorial
                    .Where(x => x.IdProducto == idProducto && (x.IdCliente == idCliente || idCliente == -1) && (x.IdProveedor == idProveedor || idProveedor == -1))
                    .Include(p => p.IdProductoNavigation)
                    .Include(p => p.IdClienteNavigation)
                    .Include(p => p.IdProveedorNavigation)
                    .OrderBy(x => x.Id)
                    .LastOrDefaultAsync()
                    ;
                return result;
            }
            catch { return null; }
        }




        public async Task<ProductosPreciosHistorial> ObtenerFecha(int idProducto, int idProveedor, int idCliente, DateTime Fecha)
        {
            ProductosPreciosHistorial result = await _dbcontext.ProductosPreciosHistorial
                .Where(x => x.IdProducto == idProducto && (x.IdCliente == idCliente || idCliente == -1) && (x.IdProveedor == idProveedor || idProveedor == -1) && x.Fecha.Date == Fecha.Date)
                .Include(p => p.IdProductoNavigation)
                .Include(p => p.IdClienteNavigation)
                .Include(p => p.IdProveedorNavigation)
                .OrderBy(x => x.Id)
                .LastOrDefaultAsync();

            return result;
        }

        //public async Task<List<ProductosPreciosHistorial>> ObtenerUltimosPrecios(int idProveedor, int idCliente)
        //{
        //    try
        //    {
        //        // Obtener todos los productos
        //        var productos = await _dbcontext.Productos
        //            .Include(p => p.ProductosPreciosHistorial)
        //            .ToListAsync();

        //        var resultados = new List<ProductosPreciosHistorial>();

        //        foreach (var producto in productos)
        //        {
        //            // Filtra el historial de precios para el producto actual y el cliente específico
        //            var historialPrecios = producto.ProductosPreciosHistorial
        //                .Where(h => h.IdCliente == idCliente || idCliente == -1 && h.IdProveedor == idProveedor || idProveedor == -1)
        //                .OrderByDescending(h => h.Id) // Ordenar por Id descendente para obtener los precios más recientes
        //                .Take(3) // Tomar los últimos 3 precios
        //                .ToList();

        //            if (historialPrecios.Any())
        //            {
        //                // Si hay historial, agrega esos precios
        //                resultados.AddRange(historialPrecios);
        //            }
        //            else
        //            {
        //                // Si no hay historial, agrega un nuevo objeto usando el precio base del producto
        //                resultados.Add(new ProductosPreciosHistorial
        //                {
        //                    IdProducto = producto.Id,
        //                    PVentaNuevo = producto.PVenta, // Precio base del producto
        //                    IdCliente = idCliente,
        //                    IdProveedor = idProveedor,
        //                    IdProductoNavigation = producto
        //                });
        //            }
        //        }

        //        return resultados;
        //    }
        //    catch (Exception ex)
        //    {
        //        Console.WriteLine($"Error al obtener los últimos precios: {ex.Message}");
        //        throw;
        //    }
        //}

        public async Task<List<ProductosPreciosHistorial>> ObtenerUltimosPrecios(int idProveedor, int idCliente)
        {
            try
            {
                var productos = await _dbcontext.Productos
                    .Include(p => p.ProductosPreciosHistorial)
                    .Include(p => p.ProductosPreciosProveedor)
                    .Where(p =>
                        p.ProductosPreciosProveedor.Any(pp =>
                            pp.IdProveedor == idProveedor &&
                            pp.Activo == 1
                        )
                    )
                    .ToListAsync();

                var resultados = new List<ProductosPreciosHistorial>();

                foreach (var producto in productos)
                {
                    var historialPrecios = producto.ProductosPreciosHistorial
                        .Where(h =>
                            (idCliente == -1 && h.IdProveedor == idProveedor) ||
                            (h.IdProveedor == idProveedor && h.IdCliente == idCliente)
                        )
                        .OrderByDescending(h => h.Id)
                        .Take(3)
                        .ToList();

                    if (historialPrecios.Any())
                    {
                        resultados.AddRange(historialPrecios);
                    }
                    else
                    {
                        // fallback: usar precio del proveedor, NO del producto base
                        var precioProveedor = producto.ProductosPreciosProveedor
                            .FirstOrDefault(pp => pp.IdProveedor == idProveedor && pp.Activo == 1);

                        if (precioProveedor != null)
                        {
                            resultados.Add(new ProductosPreciosHistorial
                            {
                                IdProducto = producto.Id,
                                IdProveedor = idProveedor,
                                IdCliente = idCliente,
                                PVentaNuevo = precioProveedor.PVenta,
                                PCostoNuevo = precioProveedor.PCosto,
                                PorGananciaNuevo = precioProveedor.PorcGanancia,
                                Fecha = DateTime.Now,
                                IdProductoNavigation = producto
                            });
                        }
                    }
                }

                return resultados;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener los últimos precios: {ex.Message}");
                throw;
            }
        }

        public async Task<List<ProductosPreciosHistorial>> ObtenerUltimosPreciosProducto(int idProveedor, int idCliente, int idProducto)
        {
            try
            {

                var producto = await _dbcontext.Productos
           .Include(p => p.ProductosPreciosHistorial)
           .Include(p => p.IdUnidadDeMedidaNavigation)
           .Include(p => p.ProductosPreciosProveedor) // Incluye la relación con ProductosPreciosProveedores
           .Where(p => p.ProductosPreciosProveedor.Any(ppp => ppp.IdProveedor == idProveedor)) // Filtra por proveedor específico
           .FirstOrDefaultAsync(p => p.Id == idProducto);

                if (producto == null)
                {
                    throw new Exception("Producto no encontrado");
                }

                // Filtrar el historial de precios para el producto específico, el cliente y el proveedor
                var historialPrecios = producto.ProductosPreciosHistorial
                    .Where(h =>
                    (idCliente == -1 && idProveedor == -1) || // Si ambos son -1, traer todos
                    (idCliente == -1 && h.IdProveedor == idProveedor) || // Si idCliente es -1, coincidir por proveedor
                    (idProveedor == -1 && h.IdCliente == idCliente) || // Si idProveedor es -1, coincidir por cliente
                    (h.IdCliente == idCliente && h.IdProveedor == idProveedor)) // Coincidencia exacta
                    .OrderByDescending(h => h.Id) // Ordenar por Id descendente para obtener los precios más recientes
                    .Take(3) // Tomar los últimos 3 precios
                    .ToList();

                if (!historialPrecios.Any())
                {
                    // Si no hay historial, agrega un nuevo objeto usando el precio base del producto
                    historialPrecios.Add(new ProductosPreciosHistorial
                    {
                        IdProducto = producto.Id,
                        PVentaNuevo = producto.PVenta, // Precio base del producto
                        PCostoNuevo = producto.PCosto, // Precio base del producto
                        IdCliente = idCliente,
                        IdProveedor = idProveedor,
                        IdProductoNavigation = producto
                    });
                }

                return historialPrecios;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener los últimos precios: {ex.Message}");
                throw;
            }
        }

        public async Task<List<ProductosPreciosHistorial>> ObtenerUltimosPreciosProductoFecha(int idProducto, int idProveedor, int idCliente, DateTime FechaDesde, DateTime FechaHasta)
        {
            try
            {
                FechaHasta = FechaHasta.Date.AddDays(1).AddTicks(-1);

                var query = _dbcontext.ProductosPreciosHistorial
                    .Include(p => p.IdProductoNavigation)
                    .Where(x => x.Fecha >= FechaDesde && x.Fecha <= FechaHasta);

                if (idProducto > 0)
                    query = query.Where(x => x.IdProducto == idProducto);

                if (idProveedor > 0)
                    query = query.Where(x => x.IdProveedor == idProveedor);

                if (idCliente > 0)
                    query = query.Where(x => x.IdCliente == idCliente);
                else
                    query = query.Where(x => x.IdCliente == null);

                return await query.ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener los últimos precios: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> RevertirPrecioAsync(int idHistorial, string tipo)
        {
            await using var trx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var historial = await _dbcontext.ProductosPreciosHistorial
                    .FirstOrDefaultAsync(x => x.Id == idHistorial);
                if (historial == null)
                    return false;

                var revertirCosto = string.Equals(tipo, "costo", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(tipo, "ambos", StringComparison.OrdinalIgnoreCase);
                var revertirVenta = string.Equals(tipo, "venta", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(tipo, "ambos", StringComparison.OrdinalIgnoreCase);

                if (!revertirCosto && !revertirVenta)
                    return false;

                decimal costoAntes;
                decimal ventaAntes;
                decimal porcNuevo;

                if (historial.IdCliente.HasValue && historial.IdCliente > 0)
                {
                    var precioCliente = await _dbcontext.ProductosPreciosClientes
                        .FirstOrDefaultAsync(x => x.IdProducto == historial.IdProducto
                            && x.IdProveedor == historial.IdProveedor
                            && x.IdCliente == historial.IdCliente);
                    if (precioCliente == null)
                        return false;

                    costoAntes = precioCliente.PCosto;
                    ventaAntes = precioCliente.PVenta;

                    if (revertirCosto) precioCliente.PCosto = historial.PCostoAnterior;
                    if (revertirVenta) precioCliente.PVenta = historial.PVentaAnterior;
                    if (precioCliente.PCosto > 0)
                        precioCliente.PorcGanancia = ((precioCliente.PVenta - precioCliente.PCosto) / precioCliente.PCosto) * 100;

                    porcNuevo = precioCliente.PorcGanancia;
                    precioCliente.FechaActualizacion = DateTime.Now;
                }
                else if (historial.IdProveedor.HasValue && historial.IdProveedor > 0)
                {
                    var precioProveedor = await _dbcontext.ProductosPreciosProveedores
                        .FirstOrDefaultAsync(x => x.IdProducto == historial.IdProducto
                            && x.IdProveedor == historial.IdProveedor);
                    if (precioProveedor == null)
                        return false;

                    costoAntes = precioProveedor.PCosto;
                    ventaAntes = precioProveedor.PVenta;

                    if (revertirCosto) precioProveedor.PCosto = historial.PCostoAnterior;
                    if (revertirVenta) precioProveedor.PVenta = historial.PVentaAnterior;
                    if (precioProveedor.PCosto > 0)
                        precioProveedor.PorcGanancia = ((precioProveedor.PVenta - precioProveedor.PCosto) / precioProveedor.PCosto) * 100;

                    porcNuevo = precioProveedor.PorcGanancia;
                    precioProveedor.FechaActualizacion = DateTime.Now;
                }
                else
                {
                    return false;
                }

                _dbcontext.ProductosPreciosHistorial.Add(new ProductosPreciosHistorial
                {
                    IdProducto = historial.IdProducto,
                    IdProveedor = historial.IdProveedor,
                    IdCliente = historial.IdCliente,
                    Fecha = DateTime.Now,
                    PCostoAnterior = costoAntes,
                    PCostoNuevo = revertirCosto ? historial.PCostoAnterior : costoAntes,
                    PVentaAnterior = ventaAntes,
                    PVentaNuevo = revertirVenta ? historial.PVentaAnterior : ventaAntes,
                    PorcGananciaAnterior = historial.PorGananciaNuevo,
                    PorGananciaNuevo = porcNuevo,
                    ProductoCantidad = historial.ProductoCantidad
                });

                await _dbcontext.SaveChangesAsync();
                await trx.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await trx.RollbackAsync();
                Console.WriteLine($"RevertirPrecioAsync: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                var entity = await _dbcontext.ProductosPreciosHistorial.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return false;

                _dbcontext.ProductosPreciosHistorial.Remove(entity);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }




    }
}
