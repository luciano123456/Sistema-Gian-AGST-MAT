using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IAcopioStockActualService
    {
        Task<bool> Insertar(AcopioStockActual model);
        Task<bool> Actualizar(AcopioStockActual model);
        Task<AcopioStockActual> Obtener(int idProducto);
        Task<IQueryable<AcopioStockActual>> ObtenerTodos();
        Task<bool> AjustarStockAlEliminarMovimiento(AcopioHistorial movimiento);
    }
}
