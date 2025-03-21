using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IProductoRepository: IGenericRepository<Producto>
    {
        Task<IQueryable<ProductosMarca>> ObtenerMarcas();
        Task<Producto> ObtenerDatos(int idProducto);
        Task<IQueryable<ProductosCategoria>> ObtenerCategorias();
        Task<IQueryable<ProductosUnidadesDeMedida>> ObtenerUnidadesDeMedida();
        Task<bool> AumentarPrecio(string productos, decimal porcentajeCosto, decimal porcentajeVenta);
        Task<bool> BajarPrecio(string productos, decimal porcentajeCosto, decimal porcentajeVenta);
        Task<bool> DuplicarProductos(string productos);
        Task<bool> DuplicarProducto(int idProducto);

    }
}
