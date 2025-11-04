using SistemaGian.Models;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaGian.BLL.Service
{
    public interface IClienteService
    {
        Task<bool> Insertar(Cliente model);
        Task<bool> Actualizar(Cliente model);
        Task<bool> Eliminar(int id);

        Task<bool> SumarSaldo(int idCliente, decimal Saldo, string observaciones);
        Task<bool> RestarSaldo(int idCliente, decimal Saldo, string observaciones);

        Task<Cliente> Obtener(int id);
        Task<IQueryable<Cliente>> ObtenerTodos();

        Task<IQueryable<ClientesHistorialSaldo>> ObtenerHistorialCrediticio(int idCliente);
        Task<ClientesHistorialSaldo> ObtenerMovimientoSaldo(int idMovimiento);

        Task<bool> CrearMovimientoSaldo(int idCliente, decimal monto, string tipo, string observaciones, System.DateTime? fecha = null);
        Task<bool> ActualizarMovimientoSaldo(int idMovimiento, decimal monto, string tipo, string observaciones, System.DateTime? fecha = null);
        Task<bool> EliminarMovimientoSaldo(int idMovimiento);
    }
}
