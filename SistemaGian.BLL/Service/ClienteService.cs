using SistemaGian.DAL.Repository;
using SistemaGian.Models;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaGian.BLL.Service
{
    public class ClienteService : IClienteService
    {
        private readonly IClienteRepository<Cliente> _repo;

        public ClienteService(IClienteRepository<Cliente> repo)
        {
            _repo = repo;
        }

        // ===== CRUD Cliente =====
        public Task<bool> Insertar(Cliente model) => _repo.Insertar(model);

        public Task<bool> Actualizar(Cliente model) => _repo.Actualizar(model);

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);

        public Task<Cliente> Obtener(int id) => _repo.Obtener(id);

        public Task<IQueryable<Cliente>> ObtenerTodos() => _repo.ObtenerTodos();

        // ===== Saldos (atajos existentes) =====
        public Task<bool> SumarSaldo(int idCliente, decimal Saldo, string observaciones)
            => _repo.SumarSaldo(idCliente, Saldo, observaciones);

        public Task<bool> RestarSaldo(int idCliente, decimal Saldo, string observaciones)
            => _repo.RestarSaldo(idCliente, Saldo, observaciones);

        // ===== Historial / Movimientos =====
        public Task<IQueryable<ClientesHistorialSaldo>> ObtenerHistorialCrediticio(int idCliente)
            => _repo.ObtenerHistorialCrediticio(idCliente);

        public Task<ClientesHistorialSaldo> ObtenerMovimientoSaldo(int idMovimiento)
            => _repo.ObtenerMovimientoSaldo(idMovimiento);

        public Task<bool> CrearMovimientoSaldo(int idCliente, decimal monto, string tipo, string observaciones, System.DateTime? fecha = null)
            => _repo.CrearMovimientoSaldo(idCliente, monto, tipo, observaciones, fecha);

        public Task<bool> ActualizarMovimientoSaldo(int idMovimiento, decimal monto, string tipo, string observaciones, System.DateTime? fecha = null)
            => _repo.ActualizarMovimientoSaldo(idMovimiento, monto, tipo, observaciones, fecha);

        public Task<bool> EliminarMovimientoSaldo(int idMovimiento)
            => _repo.EliminarMovimientoSaldo(idMovimiento);
    }
}
