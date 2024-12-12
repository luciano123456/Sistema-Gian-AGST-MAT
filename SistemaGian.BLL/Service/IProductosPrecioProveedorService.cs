using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IProductosPrecioProveedorService
    {
        Task<bool> Eliminar(int id, int idProveedor);
        Task<bool> AsignarProveedor(string productos, int idProveedor);

        Task<IQueryable<ProductosPreciosProveedor>> ListaProductosProveedor(int idProveedor);
        Task<bool> ActualizarProductoProveedor(Producto model, int idProveedor);

  
    }

}
