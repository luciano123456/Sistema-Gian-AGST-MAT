using Newtonsoft.Json;
using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class PedidoService : IPedidoService
    {


        private readonly IPedidosRepository<Pedido> _contactRepo;

        public PedidoService(IPedidosRepository<Pedido> contactRepo)
        {
            _contactRepo = contactRepo;
        }

        public async Task<bool> EliminarPagoCliente(int idPago)
        {
            return await _contactRepo.EliminarPagoCliente(idPago);
        }

        public async Task<bool> EliminarPagoProveedor(int idPago)
        {
            return await _contactRepo.EliminarPagoProveedor(idPago);
        }

        public async Task<bool> Eliminar(int idPedido)
        {
            return await _contactRepo.Eliminar(idPedido);
        }

        public async Task<bool> Insertar(Pedido pedido, List<PagosPedidosCliente> pagosCliente, List<PagosPedidosProveedor> pagosProveedores, List<PedidosProducto> productos)
        {
            return await _contactRepo.Insertar(pedido, pagosCliente, pagosProveedores, productos);
        }

        public async Task<bool> Actualizar(Pedido pedido, List<PagosPedidosCliente> pagosCliente, List<PagosPedidosProveedor> pagosProveedores, List<PedidosProducto> productos)
        {
            return await _contactRepo.Actualizar(pedido, pagosCliente, pagosProveedores, productos);
        }

        public async Task<bool> NuevoPedido(Pedido model)
        {
            return await _contactRepo.NuevoPedido(model);
        }

        public async Task<bool> ActualizarPagosCliente(List<PagosPedidosCliente> pagos)
        {
            return await _contactRepo.ActualizarPagosCliente(pagos);
        }

        public async Task<bool> ActualizarProductos(List<PedidosProducto> productos)
        {
            return await _contactRepo.ActualizarProductos(productos);
        }

        public async Task<bool> ActualizarPagosProveedor(List<PagosPedidosProveedor> pagos)
        {
            return await _contactRepo.ActualizarPagosProveedor(pagos);
        }

     
        public async Task<PagosPedidosProveedor> ObtenerPagoaProveedor(int idpago)
        {
           return await _contactRepo.ObtenerPagoaProveedor(idpago);
        }

        public async Task<PagosPedidosCliente> ObtenerPagoCliente(int idpago)
        {
            return await _contactRepo.ObtenerPagoCliente(idpago);
        }

        public async Task<List<PagosPedidosProveedor>> ObtenerPagosaProveedores(int idPedido)
        {
            return await _contactRepo.ObtenerPagosaProveedores(idPedido);
        }

        public async Task<List<PagosPedidosCliente>> ObtenerPagosClientes(int idPedido)
        {
            return await _contactRepo.ObtenerPagosClientes(idPedido);
        }

        public async  Task<Pedido> ObtenerPedido(int idPedido)
        {
            return await _contactRepo.ObtenerPedido(idPedido);
        }

        public async Task<List<PedidosProducto>> ObtenerProductosPedido(int idPedido)
        {
            return await _contactRepo.ObtenerProductosPedido(idPedido);
        }

        public async Task<IQueryable<Pedido>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }

        public async Task<int> ObtenerUltimoNroRemito()
        {
            return await _contactRepo.ObtenerUltimoNroRemito();
        }
    }
}
