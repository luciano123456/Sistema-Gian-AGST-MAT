using SistemaGian.Models;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IClienteRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Insertar(TEntityModel model);
        Task<bool> Actualizar(TEntityModel model);
        Task<bool> Eliminar(int id);

        Task<TEntityModel> Obtener(int id);
        Task<IQueryable<TEntityModel>> ObtenerTodos();

        Task<IQueryable<ClientesHistorialSaldo>> ObtenerHistorialCrediticio(int idCliente);
        Task<ClientesHistorialSaldo> ObtenerMovimientoSaldo(int idMovimiento);

        Task<bool> CrearMovimientoSaldo(int idCliente, decimal monto, string tipo, string observaciones, System.DateTime? fecha = null);

        Task<bool> ActualizarMovimientoSaldo(int idMovimiento, decimal monto, string tipo, string observaciones, System.DateTime? fecha = null);

        Task<bool> EliminarMovimientoSaldo(int idMovimiento);

        // Mantengo lo tuyo, por compat:
        Task<bool> SumarSaldo(int idCliente, decimal Saldo, string observaciones);
        Task<bool> RestarSaldo(int idCliente, decimal Saldo, string observaciones);
        Task<bool> SumarSaldoInterno(int idCliente, decimal Saldo, string observaciones);
    }
}
