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

        public async Task<List<ProductosPreciosHistorial>> ObtenerUltimosPrecios(int idProveedor, int idCliente)
        {
            try
            {
                // Obtener todos los productos
                var productos = await _dbcontext.Productos
                    .Include(p => p.ProductosPreciosHistorial)
                    .ToListAsync();

                var resultados = new List<ProductosPreciosHistorial>();

                foreach (var producto in productos)
                {

                    // Filtra el historial de precios para el producto actual y el cliente específico
                    var historialPrecios = producto.ProductosPreciosHistorial
                        .Where(h =>
                    (idCliente == -1 && idProveedor == -1) || // Si ambos son -1, traer todos
                    (idCliente == -1 && h.IdProveedor == idProveedor) || // Si idCliente es -1, coincidir por proveedor
                    (idProveedor == -1 && h.IdCliente == idCliente) || // Si idProveedor es -1, coincidir por cliente
                    (h.IdCliente == idCliente && h.IdProveedor == idProveedor) // Coincidencia exacta
                )
                        .OrderByDescending(h => h.Id) // Ordenar por Id descendente para obtener los precios más recientes
                        .Take(3) // Tomar los últimos 3 precios
                        .ToList();

                    if (historialPrecios.Any())
                    {
                        // Si hay historial, agrega esos precios
                        resultados.AddRange(historialPrecios);
                    }
                    else
                    {
                        // Si no hay historial, agrega un nuevo objeto usando el precio base del producto
                        resultados.Add(new ProductosPreciosHistorial
                        {
                            IdProducto = producto.Id,
                            PVentaNuevo = producto.PVenta, // Precio base del producto
                            PCostoNuevo = producto.PCosto, // Precio base del producto
                            IdCliente = idCliente,
                            IdProveedor = idProveedor,
                            IdProductoNavigation = producto
                        });
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
                // Obtener el producto específico
                var producto = await _dbcontext.Productos
                    .Include(p => p.ProductosPreciosHistorial)
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

        public async Task<List<ProductosPreciosHistorial>> ObtenerUltimosPreciosProductoFecha(int idProducto, int idProveedor, DateTime FechaDesde, DateTime FechaHasta)
        {
            try
            {
                // Ajustar FechaHasta al final del día
                FechaHasta = FechaHasta.Date.AddDays(1).AddTicks(-1);

                var historialPrecios = await _dbcontext.ProductosPreciosHistorial
                    .Include(p => p.IdProductoNavigation)
                    .Where(x => x.IdProveedor == idProveedor && x.IdCliente == null
                                && x.IdProducto == idProducto
                                && x.Fecha >= FechaDesde
                                && x.Fecha <= FechaHasta)
                    .ToListAsync();

                return historialPrecios;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener los últimos precios: {ex.Message}");
                throw;
            }
        }



    }
}
