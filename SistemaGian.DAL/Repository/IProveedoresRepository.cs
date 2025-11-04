using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IProveedoresRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Insertar(Proveedor model);
        Task<bool> Actualizar(Proveedor model);
        Task<bool> Eliminar(int id);
        Task<Proveedor> Obtener(int id);
        Task<IQueryable<Proveedor>> ObtenerTodos();
        Task<IQueryable<Proveedor>> ObtenerTodosCliente(int idcliente);
    }
}
