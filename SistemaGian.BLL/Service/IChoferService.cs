using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IChoferService
    {
        Task<bool> Insertar(Chofer model);
        Task<bool> Actualizar(Chofer model);
        Task<bool> Eliminar(int id);
        Task<Chofer> Obtener(int id);
        Task<IQueryable<Chofer>> ObtenerTodos();
    }

}
