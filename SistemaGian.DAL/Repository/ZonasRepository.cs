using Microsoft.EntityFrameworkCore;
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

        public async Task<Zona> Obtener(int id)
        {
            Zona model = await _dbcontext.Zonas.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<Zona>> ObtenerTodos()
        {
            IQueryable<Zona> query = _dbcontext.Zonas;
            return await Task.FromResult(query);
        }




    }
}
