using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IProductosPrecioClienteRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> AsignarCliente(List<ProductosPreciosCliente> productos);
        Task<bool> Eliminar(int id, int idCliente, int idProveedor);
        Task<bool> Actualizar(ProductosPreciosCliente producto);
        Task<ProductosPreciosCliente> ObtenerProductoCliente(int idCliente, int idProveedor, int idProducto);
        Task<IQueryable<ProductosPreciosCliente>> ObtenerProductosCliente(int idCliente, int idProveedor);
        Task<bool> EliminarProductosClienteProveedor(int idProducto, int idProveedor);

        Task<bool> AumentarPrecio(string productos, int idCliente, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta);
        Task<bool> BajarPrecio(string productos, int idCliente, int idProveedor, decimal porcentajeCosto, decimal porcentajeVenta);

    }
}
