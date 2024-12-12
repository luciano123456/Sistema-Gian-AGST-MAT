using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IZonasRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Zona model);
        Task<bool> Insertar(Zona model);
        Task<Zona> Obtener(int id);
        Task<IQueryable<Zona>> ObtenerTodos();
    }
}
