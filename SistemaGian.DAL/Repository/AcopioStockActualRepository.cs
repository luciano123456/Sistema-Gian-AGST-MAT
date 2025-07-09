using Microsoft.EntityFrameworkCore;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.DAL.Repository
{
    public class AcopioStockActualRepository : IAcopioStockActualRepository
    {
        private readonly SistemaGianContext _dbcontext;

        public AcopioStockActualRepository(SistemaGianContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Insertar(AcopioStockActual model)
        {
            _dbcontext.AcopioStockActual.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(AcopioStockActual model)
        {
            _dbcontext.AcopioStockActual.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<AcopioStockActual> Obtener(int idProducto)
        {
            return await _dbcontext.AcopioStockActual
                .Include(x => x.IdProductoNavigation)
                .FirstOrDefaultAsync(x => x.IdProducto == idProducto);
        }

        public async Task<IQueryable<AcopioStockActual>> ObtenerTodos()
        {
            return await Task.FromResult(
                _dbcontext.AcopioStockActual.Include(x => x.IdProductoNavigation)
            );
        }
    }
}
