using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IProductosPrecioHistorialService
    {
        Task<List<ProductosPreciosHistorial>> ObtenerHistorialProducto(int idProducto, int idProveedor, int idCliente, DateTime FechaDesde, DateTime FechaHasta);
        Task<bool> Eliminar(int id);
        Task<bool> RevertirPrecio(int idHistorial, string tipo);

  
    }

}
