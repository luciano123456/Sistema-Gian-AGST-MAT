﻿using SistemaGian.DAL.DataContext;
using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IPedidoService 
    {
        Task<List<PedidosProducto>> ObtenerProductosPedido(int idPedido);
        Task<List<PagosPedidosCliente>> ObtenerPagosClientes(int idPedido);
        Task<List<PagosPedidosProveedor>> ObtenerPagosaProveedores(int idPedido);
        Task<PagosPedidosProveedor> ObtenerPagoaProveedor(int idpago);
        Task<PagosPedidosCliente> ObtenerPagoCliente(int idpago);
        Task<bool> NuevoPedido(Pedido model);
        Task<bool> Insertar(Pedido pedido, List<PagosPedidosCliente> pagosCliente, List<PagosPedidosProveedor> pagosProveedores, List<PedidosProducto> productos);
        Task<bool> Actualizar(Pedido pedido, List<PagosPedidosCliente> pagosCliente, List<PagosPedidosProveedor> pagosProveedores, List<PedidosProducto> productos);
        Task<bool> ActualizarPagosCliente(List<PagosPedidosCliente> pagos);
        Task<bool> ActualizarPagosProveedor(List<PagosPedidosProveedor> pagos);
        Task<bool> ActualizarProductos(List<PedidosProducto> productos);
        Task<Pedido> ObtenerPedido(int idPedido);
        Task<bool> Eliminar(int idPedido);
        Task<bool> EliminarPagoCliente(int idPago);
        Task<bool> EliminarPagoProveedor(int idPago);
        Task<IQueryable<Pedido>> ObtenerTodos();
        Task<int> ObtenerUltimoNroRemito();
    }
}
