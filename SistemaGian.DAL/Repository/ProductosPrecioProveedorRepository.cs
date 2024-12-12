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

        public ProductosPrecioProveedorRepository(SistemaGianContext context, IProductosPrecioHistorialRepository<ProductosPreciosHistorial> productoshistorialrepo)
        {
            _dbcontext = context;
            _productoshistorialrepo = productoshistorialrepo;
        }


       
        public async Task<bool> AsignarProveedor(List<Models.ProductosPreciosProveedor> productos)
        {
            foreach (Models.ProductosPreciosProveedor producto in productos)
            {
                _dbcontext.ProductosPreciosProveedores.Add(producto);
            }

            await _dbcontext.SaveChangesAsync();

            return true;
        }

        public async Task<bool> Actualizar(ProductosPreciosProveedor model)
        {
            // Obtener el registro más reciente
            ProductosPreciosProveedor modelProveedor = await ObtenerUltimoRegistro(model.IdProducto, model.IdProveedor);

            // Actualizar o insertar el historial de precios
            await ActualizarOInsertarHistorial(model, modelProveedor);

            // Actualizar el registro del cliente
            _dbcontext.ProductosPreciosProveedores.Update(model);
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
                Models.ProductosPreciosProveedor model = _dbcontext.ProductosPreciosProveedores
                    .FirstOrDefault(c => c.IdProducto == id && c.IdProveedor == idProveedor);

                if (model == null)
                {
                    // No se encontró el registro
                    return false;
                }

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

        public async Task<List<ProductosPreciosProveedor>> ObtenerProveedoresProducto(string producto)
        {
            // Primero, busca todos los productos que contengan la palabra especificada
            var productosIds = await _dbcontext.Productos
                .Where(p => p.Descripcion.Contains(producto))
                .Select(p => p.Id)
                .ToListAsync();

            // Luego, busca todos los registros en ProductosPreciosProveedor que coincidan con los productos encontrados
            var ProveedoresProductos = await _dbcontext.ProductosPreciosProveedores
                .Where(ppp => productosIds.Contains(ppp.IdProducto))
                .Include(ppp => ppp.IdProductoNavigation)
                .Include(ppp => ppp.IdProveedorNavigation)
                .ToListAsync();

            return ProveedoresProductos;
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
            return esAumento ? valor * (1 + porcentaje / 100.0m) : valor * (1 - porcentaje / 100.0m);
        }



    }
}
