using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class GastosService : IGastosService
    {
        private readonly IGastosRepository<Gasto> _repo;

        public GastosService(IGastosRepository<Gasto> repo)
        {
            _repo = repo;
        }

        public Task<IQueryable<Gasto>> Listar(DateTime? fechaDesde, DateTime? fechaHasta, int? idMoneda, int? idTipo)
            => _repo.Listar(fechaDesde, fechaHasta, idMoneda, idTipo);

        public Task<List<(int IdMoneda, string Moneda, int Cantidad, decimal Total)>> ResumenPorMoneda(
            DateTime? fechaDesde, DateTime? fechaHasta, int? idMoneda, int? idTipo)
            => _repo.ResumenPorMoneda(fechaDesde, fechaHasta, idMoneda, idTipo);

        public Task<Gasto?> Obtener(int id) => _repo.Obtener(id);
        public Task<bool> Insertar(Gasto model) => _repo.Insertar(model);
        public Task<bool> Actualizar(Gasto model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
    }
}
