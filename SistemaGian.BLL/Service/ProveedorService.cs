using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class ProveedorService : IProveedorService
    {

        private readonly IProveedoresRepository<Proveedor> _contactRepo;
        private readonly Provincia _provinciaRepo;

        public ProveedorService(IProveedoresRepository<Proveedor> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Proveedor model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Proveedor model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Proveedor> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }
        public async Task<IQueryable<Proveedor>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }

        public async Task<IQueryable<Proveedor>> ObtenerTodosCliente(int idcliente)
        {
            return await _contactRepo.ObtenerTodosCliente(idcliente);
        }


    }
}
