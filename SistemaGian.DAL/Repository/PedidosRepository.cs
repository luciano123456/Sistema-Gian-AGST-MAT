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
            foreach (PagosPedidosCliente p in pagos)
            {
                _dbcontext.PagosPedidosClientes.Add(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;

        }

        public async Task<bool> InsertarProductos(List<PedidosProducto> productos)
        {
            foreach (PedidosProducto p in productos)
            {
                _dbcontext.PedidosProductos.Add(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;

        }


        public async Task<bool> InsertarPagosProveedor(List<PagosPedidosProveedor> pagos)
        {
            foreach (PagosPedidosProveedor p in pagos)
            {
                _dbcontext.PagosPedidosProveedores.Add(p);
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
            List<PedidosProducto> productos = _dbcontext.PedidosProductos
                .Include(c => c.IdProductoNavigation)
                .Where(c => c.IdPedido == idPedido).ToList();
            return productos;
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
