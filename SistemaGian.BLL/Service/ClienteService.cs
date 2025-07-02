using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class ClienteService : IClienteService
    {

        private readonly IClienteRepository<Cliente> _contactRepo;

        public ClienteService(IClienteRepository<Cliente> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Cliente model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Cliente model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Cliente> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }

        public async Task<IQueryable<ClientesHistorialSaldo>> ObtenerHistorialCrediticio(int idCliente)
        {
            return await _contactRepo.ObtenerHistorialCrediticio(idCliente);
        }

        public async Task<IQueryable<Cliente>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }

        public async Task<bool> RestarSaldo(int idCliente, decimal Saldo, string observaciones)
        {
            return await _contactRepo.RestarSaldo(idCliente, Saldo, observaciones);
        }

        public async Task<bool> SumarSaldo(int idCliente, decimal Saldo, string observaciones)
        {
            return await _contactRepo.SumarSaldo(idCliente, Saldo, observaciones);
        }
    }
}
