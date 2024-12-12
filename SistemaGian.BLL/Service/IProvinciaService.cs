using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IProvinciaService
    {
        Task<IQueryable<Provincia>> ObtenerTodos();
    }
}
