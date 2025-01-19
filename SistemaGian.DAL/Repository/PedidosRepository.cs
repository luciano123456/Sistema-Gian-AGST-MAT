using Azure;
using Microsoft.EntityFrameworkCore;
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
    public class PedidosRepository : IPedidosRepository<Pedido>
    {

        private readonly SistemaGianContext _dbcontext;

        public PedidosRepository(SistemaGianContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> EliminarPagoCliente(int idPago)
        {
            PagosPedidosCliente pago = _dbcontext.PagosPedidosClientes.First(c => c.Id == idPago);
            await _dbcontext.SaveChangesAsync();
            return true;

        }

        public async Task<bool> EliminarPagoProveedor(int idPago)
        {
            PagosPedidosProveedor pago = _dbcontext.PagosPedidosProveedores.First(c => c.Id == idPago);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int idPedido)
        {
            try
            {
                Pedido pedido = _dbcontext.Pedidos.FirstOrDefault(c => c.Id == idPedido);
                if (pedido == null)
                {
                    return false; // No se encontró el pedido
                }

                _dbcontext.Pedidos.Remove(pedido);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                // Aquí podrías registrar el error para depuración
                Console.WriteLine(ex.Message);
                return false;
            }
        }


        public async Task<bool> InsertarPagosCliente(List<PagosPedidosCliente> pagos)
        {
            try
            {

                foreach (PagosPedidosCliente p in pagos)
                {
                    // Verificar si el pago ya existe, por ejemplo, por IdPedido y Id
                    var pagoExistente = await _dbcontext.PagosPedidosClientes
                                                          .FirstOrDefaultAsync(x => x.IdPedido == p.IdPedido && x.Id == p.Id);

                    if (pagoExistente != null)
                    {
                        // Si el pago existe, actualizamos sus propiedades
                        pagoExistente.Fecha = p.Fecha;
                        pagoExistente.Cotizacion = p.Cotizacion;
                        pagoExistente.Total = p.Total;
                        pagoExistente.TotalArs = p.TotalArs;
                        pagoExistente.Observacion = p.Observacion;
                    }
                    else
                    {
                        // Si el pago no existe, lo agregamos a la base de datos
                        _dbcontext.PagosPedidosClientes.Add(p);
                    }
                }

                // Eliminar los pagos que no estén en el modelo para el mismo IdPedido, pero excluir los nuevos pagos (Id == 0)
                var pedidoIdsModelo = pagos.Select(p => p.IdPedido).Distinct().ToList();  // Obtener todos los IdPedido únicos en el modelo

                var pagosAEliminar = await _dbcontext.PagosPedidosClientes
                                                      .Where(x => pedidoIdsModelo.Contains(x.IdPedido)
                                                              && !pagos.Select(p => p.Id).Contains(x.Id) // Usar Contains en lugar de Any
                                                              && x.Id != 0) // Excluir pagos nuevos con Id == 0
                                                      .ToListAsync();

                foreach (var pago in pagosAEliminar)
                {
                    _dbcontext.PagosPedidosClientes.Remove(pago);
                }

                await _dbcontext.SaveChangesAsync();
                return true;

            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }

        public async Task<bool> InsertarProductos(List<PedidosProducto> productos)
        {
            foreach (PedidosProducto p in productos)
            {
                // Verificar si el producto ya existe, por ejemplo, por IdProducto y IdPedido
                var productoExistente = await _dbcontext.PedidosProductos
                                                         .FirstOrDefaultAsync(x => x.IdPedido == p.IdPedido && x.Id == p.Id);

                if (productoExistente != null)
                {
                    // Si el producto existe, actualizamos sus propiedades
                    productoExistente.PrecioCosto = p.PrecioCosto;
                    productoExistente.PrecioVenta = p.PrecioVenta;
                    productoExistente.Cantidad = p.Cantidad;
                }
                else
                {
                    // Si el producto no existe, lo agregamos a la base de datos
                    _dbcontext.PedidosProductos.Add(p);
                }
            }


            var productosIdsModelo = productos.Select(p => p.IdPedido).Distinct().ToList();  // Obtener todos los IdPedido únicos en el modelo
            var productosAEliminar = await _dbcontext.PedidosProductos
                                                      .Where(x => productosIdsModelo.Contains(x.IdPedido)
                                                              && !productos.Select(p => p.Id).Contains(x.Id) // Usar Contains en lugar de Any
                                                              && x.Id != 0) // Excluir pagos nuevos con Id == 0
                                                      .ToListAsync();


            foreach (var producto in productosAEliminar)
            {
                _dbcontext.PedidosProductos.Remove(producto);
            }

            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> InsertarPagosProveedor(List<PagosPedidosProveedor> pagos)
        {
            foreach (PagosPedidosProveedor p in pagos)
            {
                // Verificar si el pago ya existe, por ejemplo, por IdPedido y Id
                var pagoExistente = await _dbcontext.PagosPedidosProveedores
                                                      .FirstOrDefaultAsync(x => x.IdPedido == p.IdPedido && x.Id == p.Id);

                if (pagoExistente != null)
                {
                    // Si el pago existe, actualizamos sus propiedades
                    pagoExistente.Fecha = p.Fecha;
                    pagoExistente.Cotizacion = p.Cotizacion;
                    pagoExistente.Total = p.Total;
                    pagoExistente.TotalArs = p.TotalArs;
                    pagoExistente.Observacion = p.Observacion;
                }
                else
                {
                    // Si el pago no existe, lo agregamos a la base de datos
                    _dbcontext.PagosPedidosProveedores.Add(p);
                }
            }



            var pedidoIdsModelo = pagos.Select(p => p.IdPedido).Distinct().ToList();  // Obtener todos los IdPedido únicos en el modelo
            // Eliminar los pagos que no estén en el modelo
            var pagosIdsModelo = pagos.Select(p => p.Id).ToList();
            var pagosAEliminar = await _dbcontext.PagosPedidosProveedores
                                                  .Where(x => pedidoIdsModelo.Contains(x.IdPedido)
                                                          && !pagos.Select(p => p.Id).Contains(x.Id) // Usar Contains en lugar de Any
                                                          && x.Id != 0) // Excluir pagos nuevos con Id == 0
                                                  .ToListAsync();


            foreach (var pago in pagosAEliminar)
            {
                _dbcontext.PagosPedidosProveedores.Remove(pago);
            }

            await _dbcontext.SaveChangesAsync();
            return true;
        }


        public async Task<bool> NuevoPedido(Pedido model)
        {
            _dbcontext.Pedidos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }


        public async Task<bool> ActualizarPagosCliente(List<PagosPedidosCliente> pagos)
        {
            foreach (PagosPedidosCliente p in pagos)
            {
                _dbcontext.PagosPedidosClientes.Update(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;

        }

        public async Task<bool> ActualizarProductos(List<PedidosProducto> productos)
        {
            foreach (PedidosProducto p in productos)
            {
                _dbcontext.PedidosProductos.Update(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;

        }


        public async Task<bool> ActualizarPagosProveedor(List<PagosPedidosProveedor> pagos)
        {
            foreach (PagosPedidosProveedor p in pagos)
            {
                _dbcontext.PagosPedidosProveedores.Update(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Pedido model)
        {
            _dbcontext.Pedidos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }


        public async Task<PagosPedidosProveedor> ObtenerPagoaProveedor(int idPago)
        {
            PagosPedidosProveedor pago = _dbcontext.PagosPedidosProveedores.First(c => c.Id == idPago);
            return pago;
        }

        public async Task<PagosPedidosCliente> ObtenerPagoCliente(int idPago)
        {
            PagosPedidosCliente pago = _dbcontext.PagosPedidosClientes.First(c => c.Id == idPago);
            return pago;
        }

        public async Task<List<PagosPedidosProveedor>> ObtenerPagosaProveedores(int idPedido)
        {
            List<PagosPedidosProveedor> pagos = _dbcontext.PagosPedidosProveedores.Where(c => c.IdPedido == idPedido).ToList();
            return pagos;
        }

        public async Task<List<PagosPedidosCliente>> ObtenerPagosClientes(int idPedido)
        {
            List<PagosPedidosCliente> pagos = _dbcontext.PagosPedidosClientes.Where(c => c.IdPedido == idPedido).ToList();
            return pagos;
        }

        public async Task<Pedido> ObtenerPedido(int idPedido)
        {
            Pedido pedido = _dbcontext.Pedidos
                .Include(c => c.IdClienteNavigation)
                .Include(c => c.IdProveedorNavigation)
                .FirstOrDefault(c => c.Id == idPedido);
            return pedido;
        }

        public async Task<List<PedidosProducto>> ObtenerProductosPedido(int idPedido)
        {
            try
            {

                List<PedidosProducto> productos = _dbcontext.PedidosProductos
                    .Include(c => c.IdProductoNavigation)
                    .Where(c => c.IdPedido == idPedido).ToList();
                return productos;

            } catch (Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
        }

        public async Task<IQueryable<Pedido>> ObtenerTodos()
        {
            IQueryable<Pedido> query = _dbcontext.Pedidos
                .Include(c => c.IdClienteNavigation)
                .Include(c => c.IdProveedorNavigation);
            return await Task.FromResult(query);
        }
    }
}
