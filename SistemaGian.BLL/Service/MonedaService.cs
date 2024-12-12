using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class Monedaservice : IMonedaService
    {

        private readonly IGenericRepository<Moneda> _contactRepo;

        public Monedaservice(IGenericRepository<Moneda> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Moneda model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Moneda model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Moneda> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }

        //public async Task<Moneda> ObtenerPorNombre(string nombre)
        //{
        //    IQueryable<Moneda> queryMonedasQL = await _contactRepo.ObtenerTodos();

        //    Moneda Moneda = queryMonedasQL.Where(c => c.Nombre == nombre).FirstOrDefault();

        //    return Moneda;
        //}

        public async Task<IQueryable<Moneda>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
