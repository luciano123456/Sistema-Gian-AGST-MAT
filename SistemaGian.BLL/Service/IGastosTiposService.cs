using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IGastosTiposService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(GastosTipo model);
        Task<bool> Insertar(GastosTipo model);

        Task<GastosTipo> Obtener(int id);

        Task<IQueryable<GastosTipo>> ObtenerTodos();
    }

}
