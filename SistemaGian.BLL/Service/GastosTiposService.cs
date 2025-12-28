using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class GastosTiposService : IGastosTiposService
    {

        private readonly IGastosTiposRepository<GastosTipo> _contactRepo;

        public GastosTiposService(IGastosTiposRepository<GastosTipo> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(GastosTipo model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(GastosTipo model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<GastosTipo> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<GastosTipo>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
