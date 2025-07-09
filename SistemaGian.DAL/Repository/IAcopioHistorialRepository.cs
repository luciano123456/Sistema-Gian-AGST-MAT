using SistemaGian.Models;

namespace SistemaGian.DAL.Repository
{
    public interface IAcopioHistorialRepository
    {
        Task<bool> Insertar(AcopioHistorial model);
        Task<bool> Actualizar(AcopioHistorial model);
        Task<bool> Eliminar(int id);
        Task<AcopioHistorial> Obtener(int id);
        Task<IQueryable<AcopioHistorial>> ObtenerTodos();
        Task<List<AcopioHistorial>> ObtenerPorProducto(int idProducto);
    }
}
