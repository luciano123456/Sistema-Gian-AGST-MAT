using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IProductosPrecioHistorialRepository<TEntityModel> where TEntityModel : class
    {
        Task<ProductosPreciosHistorial> Obtener(int idProducto, int idProveedor, int idCliente);
        Task<List<ProductosPreciosHistorial>> ObtenerUltimosPrecios(int idProveedor, int idCliente);
        Task<List<ProductosPreciosHistorial>> ObtenerUltimosPreciosProducto(int idProveedor, int idCliente, int idProducto);
        Task<ProductosPreciosHistorial> ObtenerFecha(int idProducto, int idProveedor, int idCliente, DateTime Fecha);
        Task<bool> Insertar(ProductosPreciosHistorial model);
        Task<bool> Actualizar(ProductosPreciosHistorial model);

    }
}
