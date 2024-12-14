using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class ZonasService : IZonasService
    {

        private readonly IZonasRepository<Zona> _contactRepo;

        public ZonasService(IZonasRepository<Zona> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Zona model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Zona model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Zona> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Zona>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
