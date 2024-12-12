using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IUnidadDeMedidaService
    {
        Task<bool> Insertar(ProductosUnidadesDeMedida model);
        Task<bool> Actualizar(ProductosUnidadesDeMedida model);
        Task<bool> Eliminar(int id);
        Task<ProductosUnidadesDeMedida> Obtener(int id);
        Task<IQueryable<ProductosUnidadesDeMedida>> ObtenerTodos();
    }
}
