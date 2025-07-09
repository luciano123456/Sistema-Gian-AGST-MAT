using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class AcopioHistorialService : IAcopioHistorialService
    {
        private readonly IAcopioHistorialRepository _historialRepo;

        public AcopioHistorialService(IAcopioHistorialRepository historialRepo)
        {
            _historialRepo = historialRepo;
        }

        public async Task<bool> Insertar(AcopioHistorial model)
        {
            return await _historialRepo.Insertar(model);
        }

        public async Task<bool> Actualizar(AcopioHistorial model)
        {
            return await _historialRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _historialRepo.Eliminar(id);
        }

        public async Task<AcopioHistorial> Obtener(int id)
        {
            return await _historialRepo.Obtener(id);
        }

        public async Task<IQueryable<AcopioHistorial>> ObtenerTodos()
        {
            return await _historialRepo.ObtenerTodos();
        }

        public async Task<List<AcopioHistorial>> ObtenerPorProducto(int idProducto)
        {
            return await _historialRepo.ObtenerPorProducto(idProducto);
        }
    }
}
