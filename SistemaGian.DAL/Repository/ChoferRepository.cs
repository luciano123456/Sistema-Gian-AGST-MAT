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
    public class ChoferRepository : IGenericRepository<Chofer>
    {

        private readonly SistemaGianContext _dbcontext;

        public ChoferRepository(SistemaGianContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Chofer model)
        {
            _dbcontext.Choferes.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Chofer model = _dbcontext.Choferes.First(c => c.Id == id);
            _dbcontext.Choferes.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Chofer model)
        {
            _dbcontext.Choferes.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Chofer> Obtener(int id)
        {
            Chofer model = await _dbcontext.Choferes.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<Chofer>> ObtenerTodos()
        {
            IQueryable<Chofer> query = _dbcontext.Choferes;
            return await Task.FromResult(query);
        }




    }
}
