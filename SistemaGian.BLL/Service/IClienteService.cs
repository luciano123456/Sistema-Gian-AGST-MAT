using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IClienteService
    {
        Task<bool> Insertar(Cliente model);
        Task<bool> Actualizar(Cliente model);
        Task<bool> Eliminar(int id);
        Task<Cliente> Obtener(int id);
        Task<IQueryable<Cliente>> ObtenerTodos();
    }
}
