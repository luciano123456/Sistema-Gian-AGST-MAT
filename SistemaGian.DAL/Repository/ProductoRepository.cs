using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Newtonsoft.Json;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaGian.DAL.Repository
{
    public class ProductoRepository : IProductoRepository
    {

        private readonly SistemaGianContext _dbcontext;

        public ProductoRepository(SistemaGianContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Producto model)
        {
            _dbcontext.Productos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Producto model = _dbcontext.Productos.First(c => c.Id == id);
            _dbcontext.Productos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Producto model)
        {
            _dbcontext.Productos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Producto> Obtener(int id)
        {
            Producto model = await _dbcontext.Productos.FindAsync(id);
            return model;
        }

        public async Task<IQueryable<Producto>> ObtenerTodos()
        {
            var productos = await _dbcontext.Productos
                .Include(p => p.IdMarcaNavigation)
                .Include(p => p.IdCategoriaNavigation)
                .Include(p => p.IdUnidadDeMedidaNavigation)
                .Include(p => p.IdMonedaNavigation)
                .ToListAsync();

            return productos.AsQueryable();
        }

        public async Task<IQueryable<ProductosMarca>> ObtenerMarcas()
        {
            IQueryable<ProductosMarca> query = _dbcontext.ProductosMarcas;
            return await Task.FromResult(query);
        }

        public async Task<IQueryable<ProductosCategoria>> ObtenerCategorias()
        {
            IQueryable<ProductosCategoria> query = _dbcontext.ProductosCategorias;
            return await Task.FromResult(query);
        }

        public async Task<IQueryable<ProductosUnidadesDeMedida>> ObtenerUnidadesDeMedida()
        {
            IQueryable<ProductosUnidadesDeMedida> query = _dbcontext.ProductosUnidadesDeMedida;
            return await Task.FromResult(query);
        }

        public async Task<bool> AumentarPrecio(string productos, decimal porcentajeCosto, decimal porcentajeVenta)
        {
            try
            {
                var lstProductos = JsonConvert.DeserializeObject<List<int>>(productos);

                foreach (var prod in lstProductos)
                {
                    Producto model = await _dbcontext.Productos.FindAsync(prod);
                    model.PVenta = model.PVenta * (1 + porcentajeVenta / 100.0m);
                    model.PCosto = model.PCosto * (1 + porcentajeCosto / 100.0m);
                    model.PorcGanancia = ((model.PVenta - model.PCosto) / model.PCosto) * 100;
                    _dbcontext.Productos.Update(model);
                }
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }

        }

        public async Task<bool> BajarPrecio(string productos, decimal porcentajeCosto, decimal porcentajeVenta)
        {
            try
            {
                var lstProductos = JsonConvert.DeserializeObject<List<int>>(productos);

                foreach (var prod in lstProductos)
                {
                    Producto model = await _dbcontext.Productos.FindAsync(prod);
                    model.PVenta = model.PVenta * (1 - porcentajeVenta / 100.0m);
                    model.PCosto = model.PCosto * (1 - porcentajeCosto / 100.0m);
                    model.PorcGanancia = ((model.PVenta - model.PCosto) / model.PCosto) * 100;
                    
                    _dbcontext.Productos.Update(model);
                }
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }

        }

        public async Task<Producto> ObtenerDatos(int idProducto)
        {
            Producto model = await _dbcontext.Productos.FindAsync(idProducto);
            return model;
        }
    }
}
