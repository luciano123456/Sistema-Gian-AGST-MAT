using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IMonedaService
    {
        Task<bool> Insertar(Moneda model);
        Task<bool> Actualizar(Moneda model);
        Task<bool> Eliminar(int id);
        Task<Moneda> Obtener(int id);
        Task<IQueryable<Moneda>> ObtenerTodos();
    }
}
