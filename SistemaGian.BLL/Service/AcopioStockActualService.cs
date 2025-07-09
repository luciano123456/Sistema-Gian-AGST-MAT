using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class AcopioStockActualService : IAcopioStockActualService
    {
        private readonly IAcopioStockActualRepository _stockRepo;

        public AcopioStockActualService(IAcopioStockActualRepository stockRepo)
        {
            _stockRepo = stockRepo;
        }

        public async Task<bool> Insertar(AcopioStockActual model)
        {
            return await _stockRepo.Insertar(model);
        }

        public async Task<bool> Actualizar(AcopioStockActual model)
        {
            return await _stockRepo.Actualizar(model);
        }

        public async Task<AcopioStockActual> Obtener(int idProducto)
        {
            return await _stockRepo.Obtener(idProducto);
        }

        public async Task<IQueryable<AcopioStockActual>> ObtenerTodos()
        {
            return await _stockRepo.ObtenerTodos();
        }

        // 🟢 Nuevo método
        public async Task<bool> AjustarStockAlEliminarMovimiento(AcopioHistorial movimiento)
        {
            if (movimiento == null) return false;

            var stockActual = await _stockRepo.Obtener(movimiento.IdProducto);
            if (stockActual == null)
                return false; // No debería pasar, pero controlamos

            // Si eliminás un ingreso, restalo. Si eliminás un egreso, sumalo.
            stockActual.CantidadActual -= movimiento.Ingreso ?? 0;
            stockActual.CantidadActual += movimiento.Egreso ?? 0;
            stockActual.FechaUltimaActualizacion = DateTime.Now;

            return await _stockRepo.Actualizar(stockActual);
        }
    }
}
