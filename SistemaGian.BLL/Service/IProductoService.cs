using SistemaGian.DAL.DataContext;
using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IProductoService 
    {
        Task<bool> Insertar(Producto model);
        Task<bool> Actualizar(Producto model);
        Task<bool> Eliminar(int id);
        Task<Producto> Obtener(int id, int idCliente, int idProveedor);
        Task<Producto> ObtenerDatos(int idProducto);
        Task<IQueryable<Producto>> ObtenerTodos();
        Task<IQueryable<Producto>> ListaProductosFiltro(int idCliente, int idProveedor, string producto);
        Task<List<ProductosPreciosHistorial>> ObtenerUltimosPrecios(int idProveedor, int idCliente);
        Task<List<ProductosPreciosHistorial>> ObtenerUltimosPreciosProducto(int idProveedor, int idCliente, int idProducto);
        Task<bool> AumentarPrecios(string productos, int idCliente, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta);
        Task<bool> BajarPrecios(string productos, int idCliente, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta);
        Task<bool> DuplicarProductos(string productos);
        Task<bool> DuplicarProducto(int idProducto);

    }
}
