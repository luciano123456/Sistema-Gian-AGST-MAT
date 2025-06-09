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

        public async Task<bool> ActualizarZonaCliente(ZonasCliente model)
        {
            return await _contactRepo.ActualizarZonaCliente(model);
        }

        public async Task<bool> Eliminar(int id, int idCliente)
        {
            return await _contactRepo.Eliminar(id, idCliente);
        }

        public async Task<bool> Insertar(Zona model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Zona> Obtener(int id, int idCliente)
        {
            return await _contactRepo.Obtener(id, idCliente);
        }


        public async Task<IQueryable<Zona>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }

        public async Task<IQueryable<Zona>> ObtenerPorCliente(int IdCliente)
        {
            return await _contactRepo.ObtenerPorCliente(IdCliente);
        }

        public async Task<bool> InsertarZonaCliente(string zonas, int idCliente)
        {
            return await _contactRepo.InsertarZonaCliente(zonas, idCliente);
        }

        public async Task<bool> AumentarPrecios(string zonas, int idCliente, decimal porcentaje)
        {

            bool resp = await _contactRepo.AumentarPrecios(zonas, idCliente, porcentaje);

            return resp;
        }

        public async Task<bool> BajarPrecios(string zonas, int idCliente, decimal porcentaje)
        {

            bool resp = await _contactRepo.BajarPrecios(zonas, idCliente, porcentaje);

            return resp;
        }


    }
}
