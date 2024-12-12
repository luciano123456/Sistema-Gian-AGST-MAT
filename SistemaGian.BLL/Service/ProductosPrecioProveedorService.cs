using Newtonsoft.Json;
using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class ProductosPrecioProveedorService : IProductosPrecioProveedorService
    {

        private readonly IProductosPrecioProveedorRepository<ProductosPreciosProveedor> _productospreciorepo;
        private readonly IProductosPrecioClienteRepository<ProductosPreciosCliente> _productosprecioclienterepo;
        private readonly IProductosPrecioHistorialRepository<ProductosPreciosHistorial> _productohistorialRepo;
        private readonly IProductoRepository _productosrepo;

        public ProductosPrecioProveedorService(IProductosPrecioProveedorRepository<ProductosPreciosProveedor> productopreciorepo, IProductoRepository productorepo, IProductosPrecioClienteRepository<ProductosPreciosCliente> productosprecioclienterepo, IProductosPrecioHistorialRepository<ProductosPreciosHistorial> productohistorialRepo)
        {
            _productospreciorepo = productopreciorepo;
            _productosrepo = productorepo;
            _productosprecioclienterepo = productosprecioclienterepo;
            _productohistorialRepo = productohistorialRepo;
        }

      

        public async Task<bool> AsignarProveedor(string productos, int idProveedor)
        {
            var lstProductos = JsonConvert.DeserializeObject<List<int>>(productos);

            List<ProductosPreciosProveedor> productosList = new List<ProductosPreciosProveedor>();

            foreach (int producto in lstProductos)
            {
                var existProd = await _productospreciorepo.ObtenerProductoProveedor(idProveedor, producto);

                if (existProd == null) { 
                var prod = await _productosrepo.Obtener(producto);

                var productoPrecio = new ProductosPreciosProveedor
                {
                    IdProducto = producto,
                    IdProveedor = idProveedor,
                    FechaActualizacion = DateTime.Now,
                    PorcGanancia = prod.PorcGanancia,
                    PCosto = prod.PCosto,
                    PVenta = prod.PVenta,
                };

                productosList.Add(productoPrecio);
                }

            }

            if(productosList.Count > 0)
            {
                return await _productospreciorepo.AsignarProveedor(productosList);
            } else
            {
                return false;
            }
            

        }

        public async Task<bool> ActualizarProductoProveedor(Producto model, int idProveedor)
        {
            ProductosPreciosProveedor prod = await _productospreciorepo.ObtenerProductoProveedor(idProveedor, model.Id);

            bool result = false;

            if (prod != null)
            {
                prod.FechaActualizacion = DateTime.Now;
                prod.PorcGanancia = model.PorcGanancia;
                prod.PCosto = model.PCosto;
                prod.PVenta = model.PVenta;
            };

                result = await _productospreciorepo.Actualizar(prod);

            

            return result;
        }

        public async Task<bool> Eliminar(int id, int idProveedor)
        {
            var resp = await _productospreciorepo.Eliminar(id, idProveedor);
            resp = await _productosprecioclienterepo.EliminarProductosClienteProveedor(id, idProveedor);
            return resp;
        }

        public async Task<IQueryable<ProductosPreciosProveedor>> ListaProductosProveedor(int idProveedor)
        {
            return await _productospreciorepo.ObtenerProductosProveedor(idProveedor);
        }
    }
}
