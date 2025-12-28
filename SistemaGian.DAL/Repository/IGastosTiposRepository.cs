using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IGastosTiposRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(GastosTipo model);
        Task<bool> Insertar(GastosTipo model);
        Task<GastosTipo> Obtener(int id);
        Task<IQueryable<GastosTipo>> ObtenerTodos();
    }
}
