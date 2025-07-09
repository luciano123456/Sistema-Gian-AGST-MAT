using Microsoft.EntityFrameworkCore;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.DAL.Repository
{
    public class AcopioHistorialRepository : IAcopioHistorialRepository
    {
        private readonly SistemaGianContext _dbcontext;

        public AcopioHistorialRepository(SistemaGianContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Actualizar(AcopioHistorial model)
        {
            _dbcontext.AcopioHistorial.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            AcopioHistorial model = await _dbcontext.AcopioHistorial.FindAsync(id);
            if (model == null) return false;
            _dbcontext.AcopioHistorial.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(AcopioHistorial model)
        {
            _dbcontext.AcopioHistorial.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<AcopioHistorial> Obtener(int id)
        {
            return await _dbcontext.AcopioHistorial
                .Include(x => x.IdProductoNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IQueryable<AcopioHistorial>> ObtenerTodos()
        {
            return await Task.FromResult(_dbcontext.AcopioHistorial.Include(x => x.IdProductoNavigation).AsQueryable());
        }

        public async Task<List<AcopioHistorial>> ObtenerPorProducto(int idProducto)
        {
            return await _dbcontext.AcopioHistorial
                .Where(x => x.IdProducto == idProducto)
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();
        }
    }
}
