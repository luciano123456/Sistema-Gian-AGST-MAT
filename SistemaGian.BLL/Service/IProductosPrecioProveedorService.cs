using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IProductosPrecioProveedorService
    {
        Task<bool> Eliminar(int id, int idProveedor);
        Task<bool> AsignarProveedor(string productos, List<int> idProveedores);



        Task<IQueryable<ProductosPreciosProveedor>> ListaProductosProveedor(int idProveedor);
        Task<bool> ActualizarProductoProveedor(Producto model, int idProveedor);
        Task<ProductosPreciosProveedor> ObtenerProductoProveedor(int idProducto, int idProveedor);
        Task<bool> GuardarOrden(int idProducto, int idProveedor, int Orden);

  
    }

}
