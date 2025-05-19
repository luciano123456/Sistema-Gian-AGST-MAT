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
            try
            {
                _dbcontext.Productos.Update(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                Producto model = _dbcontext.Productos.First(c => c.Id == id);
                _dbcontext.Productos.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Insertar(Producto model)
        {
            try
            {
                _dbcontext.Productos.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<Producto> Obtener(int id)
        {
            try
            {
                Producto model = await _dbcontext.Productos.FindAsync(id);
                return model;
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public async Task<IQueryable<Producto>> ObtenerTodos()
        {
            try
            {
                var productos = await _dbcontext.Productos
                    .Include(p => p.IdMarcaNavigation)
                    .Include(p => p.IdCategoriaNavigation)
                    .Include(p => p.IdUnidadDeMedidaNavigation)
                    .Include(p => p.IdMonedaNavigation)
                    .ToListAsync();

                return productos.AsQueryable();
            }
            catch (Exception ex)
            {
                return null;
            }
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
                    model.PVenta = model.PVenta * (1 + porcentajeVenta / 100);
                    model.PCosto = model.PCosto * (1 + porcentajeCosto / 100);
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
                    model.PVenta = model.PVenta * (1 - porcentajeVenta / 100);
                    model.PCosto = model.PCosto * (1 - porcentajeCosto / 100);
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

        public async Task<bool> DuplicarProductos(string productos)
        {
            try
            {
                var lstProductos = JsonConvert.DeserializeObject<List<int>>(productos);

                foreach (var prod in lstProductos)
                {
                    Producto model = await _dbcontext.Productos.FindAsync(prod);

                    Producto nuevoProducto = new Producto
                    {
                        Descripcion = model.Descripcion + " - copia",
                        IdCategoria = model.IdCategoria ?? 0,
                        IdMarca = model.IdMarca ?? 0,
                        IdMoneda = model.IdMoneda,
                        IdProveedor = model.IdProveedor ?? 0,
                        PCosto = model.PCosto,
                        Image = model.Image,
                        PVenta = model.PVenta,
                        FechaActualizacion = DateTime.Now,
                        ProductoCantidad = model.ProductoCantidad,
                        PorcGanancia = model.PorcGanancia,
                        IdUnidadDeMedida = model.IdUnidadDeMedida
                    };


                    _dbcontext.Productos.Add(nuevoProducto);
                }
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }

        }

        public async Task<bool> DuplicarProducto(int idProducto)
        {
            try
            {

                Producto model = await _dbcontext.Productos.FindAsync(idProducto);

                if (model != null)
                {
                    Producto nuevoProducto = new Producto
                    {
                        Descripcion = model.Descripcion + "- copia",
                        IdCategoria = model.IdCategoria ?? 0,
                        IdMarca = model.IdMarca ?? 0,
                        IdMoneda = model.IdMoneda,
                        IdProveedor = model.IdProveedor ?? 0,
                        PCosto = model.PCosto,
                        Image = model.Image,
                        PVenta = model.PVenta,
                        FechaActualizacion = DateTime.Now,
                        ProductoCantidad = model.ProductoCantidad,
                        PorcGanancia = model.PorcGanancia,
                        IdUnidadDeMedida = model.IdUnidadDeMedida
                    };
                    _dbcontext.Productos.Add(nuevoProducto);
                    _dbcontext.Productos.Add(nuevoProducto);

                    await _dbcontext.SaveChangesAsync();
                    return true;
                }
                else
                {
                    return false;
                }


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

        public async Task<bool> EditarActivo(int id, int activo)
        {
            Producto model = await _dbcontext.Productos.FindAsync(id);
            try
            {
                if (model != null)
                {
                    model.Activo = activo;
                    await _dbcontext.SaveChangesAsync();
                    return true;
                }
                else
                {
                    return false;
                }
            }
            catch (Exception ex)
            {
                return false;
            }
        }
    }
}
