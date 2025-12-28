using SistemaGian.Models;

namespace SistemaGian.DAL.Repository
{
    public interface IGastosRepository<TEntityModel> where TEntityModel : class
    {
        Task<IQueryable<Gasto>> Listar(DateTime? fechaDesde, DateTime? fechaHasta, int? idMoneda, int? idTipo);

        Task<List<(int IdMoneda, string Moneda, int Cantidad, decimal Total)>> ResumenPorMoneda(
            DateTime? fechaDesde, DateTime? fechaHasta, int? idMoneda, int? idTipo);

        Task<Gasto?> Obtener(int id);
        Task<bool> Insertar(Gasto model);
        Task<bool> Actualizar(Gasto model);
        Task<bool> Eliminar(int id);
    }
}
