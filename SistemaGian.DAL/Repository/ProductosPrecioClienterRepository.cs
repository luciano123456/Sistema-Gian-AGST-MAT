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
    public class ProductosPrecioClienteRepository : IProductosPrecioClienteRepository<ProductosPreciosCliente>

    {

        private readonly SistemaGianContext _dbcontext;
        private readonly IProductosPrecioHistorialRepository<ProductosPreciosHistorial> _productoshistorialrepo;

        public ProductosPrecioClienteRepository(SistemaGianContext context, IProductosPrecioHistorialRepository<ProductosPreciosHistorial> productoshistorialrepo)
        {
            _dbcontext = context;
            _productoshistorialrepo = productoshistorialrepo;

        }



        public async Task<bool> AsignarCliente(List<ProductosPreciosCliente> productos)
        {
            foreach (ProductosPreciosCliente producto in productos)
            {
                _dbcontext.ProductosPreciosClientes.Add(producto);
            }

            await _dbcontext.SaveChangesAsync();

            return true;
        }


        public async Task<bool> EliminarProductosClienteProveedor(int idProducto, int idProveedor)
        {
            // Obtener todos los precios del cliente y proveedor para el producto
            var preciosClientesProveedores = await _dbcontext.ProductosPreciosClientes
                .Where(c => c.IdProducto == idProducto && c.IdProveedor == idProveedor)
                .ToListAsync();

            // Verificar si se encontraron registros para eliminar
            if (preciosClientesProveedores != null && preciosClientesProveedores.Count > 0)
            {
                _dbcontext.ProductosPreciosClientes.RemoveRange(preciosClientesProveedores);
                await _dbcontext.SaveChangesAsync(); // Guardar los cambios en la base de datos
            }

            return true;
        }


        public async Task<bool> Actualizar(ProductosPreciosCliente model)
        {
            // Obtener el registro más reciente
            ProductosPreciosCliente modelCliente = await ObtenerUltimoRegistro(model.IdProducto, model.IdCliente, model.IdProveedor);

            // Actualizar o insertar el historial de precios
            await ActualizarOInsertarHistorial(model, modelCliente);

            // Actualizar el registro del cliente
            _dbcontext.ProductosPreciosClientes.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        private async Task<ProductosPreciosCliente> ObtenerUltimoRegistro(int idProducto, int idCliente, int idProveedor)
        {
            return await _dbcontext.ProductosPreciosClientes
                .Where(x => x.IdProducto == idProducto && x.IdCliente == idCliente && x.IdProveedor == idProveedor)
                .OrderByDescending(x => x.FechaActualizacion)
                .FirstOrDefaultAsync();
        }

        private async Task ActualizarOInsertarHistorial(ProductosPreciosCliente model, ProductosPreciosCliente modelCliente)
        {
            var resultHistorial = await _productoshistorialrepo.ObtenerFecha(model.IdProducto, model.IdProveedor, model.IdCliente, DateTime.Now);

            if (resultHistorial != null)
            {
                // Actualizar el historial existente
                resultHistorial.PVentaAnterior = resultHistorial.PVentaNuevo;
                resultHistorial.PVentaNuevo = model.PVenta;
                resultHistorial.PCostoAnterior = resultHistorial.PCostoNuevo;
                resultHistorial.PCostoNuevo = model.PCosto;
                resultHistorial.PorcGananciaAnterior = resultHistorial.PorGananciaNuevo;
                resultHistorial.PorGananciaNuevo = model.PorcGanancia;
                await _productoshistorialrepo.Actualizar(resultHistorial);
            }
            else
            {
                // Obtener el último historial existente
                resultHistorial = await _productoshistorialrepo.Obtener(model.IdProducto, model.IdProveedor, model.IdCliente);

                // Insertar un nuevo historial
                var productoHistorial = new ProductosPreciosHistorial
                {
                    IdProducto = model.IdProducto,
                    IdProveedor = model.IdProveedor,
                    IdCliente = model.IdCliente,
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

        public async Task<bool> Eliminar(int id, int idCliente, int idProveedor)
        {
            try
            {
                ProductosPreciosCliente model = _dbcontext.ProductosPreciosClientes
                    .FirstOrDefault(c => c.IdProducto == id && c.IdCliente == idCliente && c.IdProveedor == idProveedor);

                if (model == null)
                {
                    // No se encontró el registro
                    return false;
                }

                _dbcontext.ProductosPreciosClientes.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }



        public async Task<ProductosPreciosCliente> ObtenerProductoCliente(int idCliente, int idProveedor, int idproducto)
        {

            var prod = await _dbcontext.ProductosPreciosClientes
          .Where(x => x.IdCliente == idCliente && x.IdProveedor == idProveedor && x.IdProducto == idproducto)
          .Include(p => p.IdProductoNavigation)
          .Include(p => p.IdClienteNavigation)
          .FirstOrDefaultAsync();

            return prod;
        }

        public Task<IQueryable<ProductosPreciosCliente>> ObtenerProductosCliente(int idCliente, int idProveedor)
        {
            IQueryable<ProductosPreciosCliente> productos = _dbcontext.ProductosPreciosClientes.Where(x => x.IdCliente == idCliente && x.IdProveedor == idProveedor);

            return Task.FromResult(productos);
        }

        public async Task<bool> AumentarPrecio(string productos, int idCliente, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta)
        {
            return await ModificarPrecio(productos, idCliente, idProveedor, porcentajeCosto, porcentajeVenta, true);
        }

        public async Task<bool> BajarPrecio(string productos, int idCliente, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta)
        {
            return await ModificarPrecio(productos, idCliente, idProveedor, porcentajeCosto, porcentajeVenta, false);
        }

        private async Task<bool> ModificarPrecio(string productos, int idCliente, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta, bool esAumento)
        {
            try
            {
                var lstProductos = JsonConvert.DeserializeObject<List<int>>(productos);

                foreach (var prod in lstProductos)
                {
                    ProductosPreciosCliente model = await ObtenerUltimoRegistroCliente(prod, idCliente, idProveedor);

                    var resultHistorial = await _productoshistorialrepo.ObtenerFecha(prod, idProveedor, idCliente, DateTime.Now);

                    if (resultHistorial != null)
                    {
                        ActualizarHistorial(resultHistorial, model, porcentajeCosto, porcentajeVenta, esAumento);
                        await _productoshistorialrepo.Actualizar(resultHistorial);
                    }
                    else
                    {
                        resultHistorial = await _productoshistorialrepo.Obtener(prod, idProveedor, idCliente);
                        var productoHistorial = CrearNuevoHistorial(prod, idProveedor, idCliente, resultHistorial, model, porcentajeCosto, porcentajeVenta, esAumento);
                        await _productoshistorialrepo.Insertar(productoHistorial);
                    }

                    // Actualizar precios en el modelo del cliente
                    model.PVenta = ModificarValor(model.PVenta, porcentajeVenta, esAumento);
                    model.PCosto = ModificarValor(model.PCosto, porcentajeCosto, esAumento);
                    model.PorcGanancia = ((model.PVenta - model.PCosto) / model.PCosto) * 100;
                    _dbcontext.ProductosPreciosClientes.Update(model);
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

        private async Task<ProductosPreciosCliente> ObtenerUltimoRegistroCliente(int idProducto, int idCliente, int idProveedor)
        {
            return await _dbcontext.ProductosPreciosClientes
                .Where(x => x.IdProducto == idProducto && x.IdCliente == idCliente && x.IdProveedor == idProveedor)
                .OrderByDescending(x => x.FechaActualizacion) // Asegúrate de que 'FechaActualizacion' es el nombre correcto de la columna de fecha
                .FirstOrDefaultAsync();
        }

        private void ActualizarHistorial(ProductosPreciosHistorial resultHistorial, ProductosPreciosCliente model, decimal porcentajeCosto, decimal porcentajeVenta, bool esAumento)
        {
            resultHistorial.PVentaAnterior = resultHistorial.PVentaNuevo;
            resultHistorial.PVentaNuevo = ModificarValor(model.PVenta, porcentajeVenta, esAumento);
            resultHistorial.PCostoAnterior = resultHistorial.PCostoNuevo;
            resultHistorial.PCostoNuevo = ModificarValor(model.PCosto, porcentajeCosto, esAumento);
            resultHistorial.PorcGananciaAnterior = resultHistorial.PorGananciaNuevo;
            resultHistorial.PorGananciaNuevo = ((model.PVenta - model.PCosto) / model.PCosto) * 100;
        }

        private ProductosPreciosHistorial CrearNuevoHistorial(int prod, int idProveedor, int idCliente, ProductosPreciosHistorial resultHistorial, ProductosPreciosCliente model, decimal porcentajeCosto, decimal porcentajeVenta, bool esAumento)
        {
            return new ProductosPreciosHistorial
            {
                IdProducto = prod,
                IdProveedor = idProveedor,
                IdCliente = idCliente,
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

        public async Task<bool> GuardarOrden(int idProducto, int idCliente, int idProveedor, int Orden)
        {
            var producto = await _dbcontext.ProductosPreciosClientes
                .Where(x => x.IdProducto == idProducto && x.IdCliente == idCliente && x.IdProveedor == idProveedor)
                .FirstOrDefaultAsync();

            producto.Orden = Orden;
            await _dbcontext.SaveChangesAsync();

            return true;
        }
    }
}
