using Microsoft.EntityFrameworkCore;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.DAL.Repository
{
    public class GastosRepository : IGastosRepository<Gasto>
    {
        private readonly SistemaGianContext _ctx;

        public GastosRepository(SistemaGianContext ctx)
        {
            _ctx = ctx;
        }

        public async Task<IQueryable<Gasto>> Listar(DateTime? fechaDesde, DateTime? fechaHasta, int? idMoneda, int? idTipo)
        {
            IQueryable<Gasto> q = _ctx.Gastos
                .Include(x => x.IdMonedaNavigation)
                .Include(x => x.IdTipoNavigation);

            if (fechaDesde.HasValue)
            {
                var fd = fechaDesde.Value.Date;
                q = q.Where(x => x.Fecha >= fd);
            }

            if (fechaHasta.HasValue)
            {
                // inclusivo por día (hasta 23:59:59)
                var fh = fechaHasta.Value.Date.AddDays(1);
                q = q.Where(x => x.Fecha < fh);
            }

            if (idMoneda.HasValue && idMoneda.Value > 0)
                q = q.Where(x => x.IdMoneda == idMoneda.Value);

            if (idTipo.HasValue && idTipo.Value > 0)
                q = q.Where(x => x.IdTipo == idTipo.Value);

            return await Task.FromResult(q.OrderByDescending(x => x.Fecha));
        }

        public async Task<List<(int IdMoneda, string Moneda, int Cantidad, decimal Total)>> ResumenPorMoneda(
            DateTime? fechaDesde, DateTime? fechaHasta, int? idMoneda, int? idTipo)
        {
            // reutiliza la misma lógica de filtros
            var q = await Listar(fechaDesde, fechaHasta, idMoneda, idTipo);

            var rows = await q
                .AsNoTracking()
                .GroupBy(x => new { x.IdMoneda, Moneda = x.IdMonedaNavigation.Nombre })
                .Select(g => new
                {
                    g.Key.IdMoneda,
                    g.Key.Moneda,
                    Cantidad = g.Count(),
                    Total = g.Sum(x => x.Importe)
                })
                .OrderBy(x => x.Moneda)
                .ToListAsync();

            return rows.Select(x => (x.IdMoneda, x.Moneda, x.Cantidad, x.Total)).ToList();
        }

        public Task<Gasto?> Obtener(int id)
            => _ctx.Gastos
                .Include(x => x.IdMonedaNavigation)
                .Include(x => x.IdTipoNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<bool> Insertar(Gasto model)
        {
            _ctx.Gastos.Add(model);
            await _ctx.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Gasto model)
        {
            _ctx.Gastos.Update(model);
            await _ctx.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var g = await _ctx.Gastos.FindAsync(id);
            if (g == null) return false;

            _ctx.Gastos.Remove(g);
            await _ctx.SaveChangesAsync();
            return true;
        }
    }
}
