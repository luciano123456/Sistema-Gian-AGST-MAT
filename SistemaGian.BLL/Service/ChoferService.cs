using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class ChoferService : IChoferService
    {

        private readonly IGenericRepository<Chofer> _contactRepo;

        public ChoferService(IGenericRepository<Chofer> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Chofer model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Chofer model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Chofer> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Chofer>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
