using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IZonasService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Zona model);
        Task<bool> Insertar(Zona model);

        Task<Zona> Obtener(int id);

        Task<IQueryable<Zona>> ObtenerTodos();
    }

}
