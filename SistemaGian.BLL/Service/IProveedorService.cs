using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IProveedorService
    {
        Task<bool> Insertar(Models.Proveedor model);
        Task<bool> Actualizar(Models.Proveedor model);
        Task<bool> Eliminar(int id);
        Task<Models.Proveedor> Obtener(int id);
        Task<IQueryable<Models.Proveedor>> ObtenerTodos();
    }
}
