using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IProductosPrecioProveedorRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> AsignarProveedor(List<ProductosPreciosProveedor> productos);
        Task<bool> Eliminar(int id, int idProveedor);
        Task<bool> Actualizar(ProductosPreciosProveedor producto);
        Task<ProductosPreciosProveedor> ObtenerProductoProveedor(int idProveedor, int idProducto);
        Task<IQueryable<ProductosPreciosProveedor>> ObtenerProductosProveedor(int idProveedor);
        Task<List<ProductosPreciosProveedor>> ObtenerProveedoresProducto(string producto);

        Task<bool> AumentarPrecio(string productos, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta);
        Task<bool> BajarPrecio(string productos, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta);

    }
}
