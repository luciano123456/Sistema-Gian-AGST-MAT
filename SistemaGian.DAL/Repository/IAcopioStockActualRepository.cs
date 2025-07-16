using SistemaGian.Models;

namespace SistemaGian.DAL.Repository
{
    public interface IAcopioStockActualRepository
    {
        Task<bool> Insertar(AcopioStockActual model);
        Task<bool> Actualizar(AcopioStockActual model);
        Task<AcopioStockActual> Obtener(int idProducto, int idProveedor);
        Task<IQueryable<AcopioStockActual>> ObtenerTodos();
    }
}
