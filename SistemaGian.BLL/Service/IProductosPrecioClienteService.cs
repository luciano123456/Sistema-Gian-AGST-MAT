using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IProductosPrecioClienteService
    {
        Task<bool> Eliminar(int id, int idCliente, int idProveedor);
        Task<bool> AsignarCliente(string productos, int idCliente, int idProveedor);

        Task<IQueryable<ProductosPreciosCliente>> ListaProductosCliente(int idCliente, int idProveedor);
        Task<bool> ActualizarProductoCliente(Producto model, int idCliente, int idProveedor);

  
    }

}
