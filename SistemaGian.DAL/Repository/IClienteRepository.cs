using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IClienteRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Insertar(TEntityModel model);
        Task<bool> Actualizar(TEntityModel model);
        Task<bool> Eliminar(int id);
        Task<TEntityModel> Obtener(int id);
        Task<IQueryable<ClientesHistorialSaldo>> ObtenerHistorialCrediticio(int idCliente);
        Task<IQueryable<TEntityModel>> ObtenerTodos();
        Task<bool> SumarSaldo(int idCliente, decimal Saldo, string observaciones);
        Task<bool> RestarSaldo(int idCliente, decimal Saldo, string observaciones);
        Task<bool> SumarSaldoInterno(int idCliente, decimal Saldo, string observaciones);
    }
}
