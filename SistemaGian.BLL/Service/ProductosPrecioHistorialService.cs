using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class ProductosPrecioHistorialService : IProductosPrecioHistorialService
    {
        private readonly IProductosPrecioHistorialRepository<ProductosPreciosHistorial> _productospreciorepo;


        public ProductosPrecioHistorialService(IProductosPrecioHistorialRepository<ProductosPreciosHistorial> productospreciorepo)
        {
            _productospreciorepo = productospreciorepo;
            
        }


        public async Task<List<ProductosPreciosHistorial>> ObtenerHistorialProducto(int idProducto, int idProveedor, DateTime FechaDesde, DateTime FechaHasta)
        {
            return await _productospreciorepo.ObtenerUltimosPreciosProductoFecha(idProducto, idProveedor, FechaDesde, FechaHasta);
        }
    }
}
