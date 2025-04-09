using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Newtonsoft.Json;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaGian.DAL.Repository
{
    public class ZonasRepository : IZonasRepository<Zona>
    {

        private readonly SistemaGianContext _dbcontext;

        public ZonasRepository(SistemaGianContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Actualizar(Zona model)
        {
            _dbcontext.Zonas.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Zona model = _dbcontext.Zonas.First(c => c.Id == id);
            _dbcontext.Zonas.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Zona model)
        {
            _dbcontext.Zonas.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ActualizarZonaCliente(ZonasCliente model)
        {
            try
            {
                ZonasCliente zonaEncontrada = _dbcontext.ZonasClientes.Where(x => x.IdZona == model.IdZona && x.IdCliente == model.IdCliente).FirstOrDefault();

                if (zonaEncontrada != null)
                {
                    zonaEncontrada.Precio = model.Precio;
                }
                else
                {
                    _dbcontext.ZonasClientes.Add(model);
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<Zona> Obtener(int id, int idCliente)
        {
            Zona model = new Zona();

            if (idCliente > 0)
            {
                ZonasCliente modelo = await _dbcontext.ZonasClientes.Where(x => x.IdZona == id && x.IdCliente == idCliente).Include(x => x.IdZonaNavigation).FirstOrDefaultAsync();

                if (modelo != null)
                {
                    model.Precio = modelo.Precio;
                    model.Id = modelo.IdZona;
                    model.Nombre = modelo.IdZonaNavigation.Nombre;
                }
            }

            return model;
        }
        public async Task<IQueryable<Zona>> ObtenerTodos()
        {
            IQueryable<Zona> query = _dbcontext.Zonas;
            return await Task.FromResult(query);
        }

        public async Task<bool> InsertarZonaCliente(string zonas, int idCliente)
        {

            List<int> listaZonas = JsonConvert.DeserializeObject<List<int>>(zonas);


            // Iniciar una transacción
            using (var transaction = await _dbcontext.Database.BeginTransactionAsync())
            {
                try
                {
                    foreach (var zona in listaZonas) 
                    {
                        // Buscar si la relación ya existe
                        ZonasCliente zonaClienteEncontrada = _dbcontext.ZonasClientes
                            .Where(x => x.IdZona == zona && x.IdCliente == idCliente)
                            .FirstOrDefault();

                        // Buscar la zona en la tabla Zonas
                        Zona zonaEncontrada = _dbcontext.Zonas
                            .Where(x => x.Id == zona)
                            .FirstOrDefault();

                        if (zonaClienteEncontrada != null)
                        {
                            continue;
                        }
                        else
                        {
                            ZonasCliente model = new ZonasCliente
                            {
                                IdZona = zona,
                                IdCliente = idCliente,
                                Precio = (zonaEncontrada != null ? (decimal)zonaEncontrada.Precio : 0) // Asignar precio si la zona se encuentra
                            };
                            await _dbcontext.ZonasClientes.AddAsync(model);
                        }
                    }

                    await _dbcontext.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();

                    return false;
                }
            }
        }


        public async Task<IQueryable<Zona>> ObtenerPorCliente(int idCliente)
        {
            var query = (idCliente == -1)
    ? _dbcontext.Zonas.Select(zona => new Zona
    {
        Id = zona.Id,
        Nombre = zona.Nombre,
        Precio = zona.Precio
    })
    : (from zona in _dbcontext.Zonas
       join zonaCliente in _dbcontext.ZonasClientes
       on new { ZonaId = zona.Id, ClienteId = idCliente }
       equals new { ZonaId = zonaCliente.IdZona, ClienteId = zonaCliente.IdCliente }
       select new Zona
       {
           Id = zona.Id,
           Nombre = zona.Nombre,
           Precio = zonaCliente.Precio
       });

            return await Task.FromResult(query);

        }



    }
}
