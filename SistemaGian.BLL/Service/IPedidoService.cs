using SistemaGian.DAL.DataContext;
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
        Task<bool> Actualizar(Pedido model);
        Task<bool> InsertarPagosCliente(List<PagosPedidosCliente> pagos);
        Task<bool> InsertarPagosProveedor(List<PagosPedidosProveedor> pagos);
        Task<bool> InsertarProductos(List<PedidosProducto> productos);
        Task<bool> ActualizarPagosCliente(List<PagosPedidosCliente> pagos);
        Task<bool> ActualizarPagosProveedor(List<PagosPedidosProveedor> pagos);
        Task<bool> ActualizarProductos(List<PedidosProducto> productos);
        Task<Pedido> ObtenerPedido(int idPedido);
        Task<bool> Eliminar(int idPedido);
        Task<bool> EliminarPagoCliente(int idPago);
        Task<bool> EliminarPagoProveedor(int idPago);
        Task<IQueryable<Pedido>> ObtenerTodos();
    }
}
