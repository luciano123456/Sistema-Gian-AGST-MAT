using Newtonsoft.Json;
using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class ProductosPrecioClienteService : IProductosPrecioClienteService
    {

        private readonly IProductosPrecioClienteRepository<ProductosPreciosCliente> _productospreciorepo;
        private readonly IProductosPrecioProveedorRepository<ProductosPreciosProveedor> _productoprecioproveedorRepo;
        private readonly IProductosPrecioHistorialRepository<ProductosPreciosHistorial> _productohistorialRepo;
        private readonly IProductoRepository _productosrepo;

        public ProductosPrecioClienteService(IProductosPrecioClienteRepository<ProductosPreciosCliente> productopreciorepo, IProductoRepository productorepo, IProductosPrecioProveedorRepository<ProductosPreciosProveedor> productoprecioProveedorrepo, IProductosPrecioHistorialRepository<ProductosPreciosHistorial> productohistorialRepo)
        {
            _productospreciorepo = productopreciorepo;
            _productosrepo = productorepo;
            _productoprecioproveedorRepo = productoprecioProveedorrepo;
            _productohistorialRepo = productohistorialRepo;

        }

      

        public async Task<bool> AsignarCliente(string productos, int idCliente, int idProveedor)
        {
            var lstProductos = JsonConvert.DeserializeObject<List<int>>(productos);

            List<ProductosPreciosCliente> productosList = new List<ProductosPreciosCliente>();

            foreach (int producto in lstProductos)
            {
                var existProd = await _productospreciorepo.ObtenerProductoCliente(idCliente, idProveedor, producto);

                if (existProd == null) { 
                var prod = await _productoprecioproveedorRepo.ObtenerProductoProveedor(idProveedor, producto);

                var productoPrecio = new ProductosPreciosCliente
                {
                    IdProducto = producto,
                    IdCliente = idCliente,
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
                return await _productospreciorepo.AsignarCliente(productosList);
            } else
            {
                return false;
            }
            

        }

        public async Task<bool> ActualizarProductoCliente(Producto model, int idCliente, int idProveedor)
        {
            ProductosPreciosCliente prod = await _productospreciorepo.ObtenerProductoCliente(idCliente, idProveedor, model.Id);

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

        public async Task<bool> Eliminar(int id, int idCliente, int idProveedor)
        {
            return await _productospreciorepo.Eliminar(id, idCliente, idProveedor);
        }

        public async Task<IQueryable<ProductosPreciosCliente>> ListaProductosCliente(int idCliente, int idProveedor)
        {
            return await _productospreciorepo.ObtenerProductosCliente(idCliente, idProveedor);
        }
    }
}
