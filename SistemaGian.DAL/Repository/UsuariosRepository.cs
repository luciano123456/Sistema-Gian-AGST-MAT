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
    public class UsuariosRepository : IUsuariosRepository<User>
    {

        private readonly SistemaGianContext _dbcontext;

        public UsuariosRepository(SistemaGianContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(User model)
        {
            try
            {
                _dbcontext.Usuarios.Update(model);
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
                User model = _dbcontext.Usuarios.First(c => c.Id == id);
                _dbcontext.Usuarios.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> GuardarCodigo(string username, string codigo)
        {
            User model = await _dbcontext.Usuarios.FindAsync(username);

            if(model != null)
            {
                model.CodigoRecuperacion = codigo;
                await _dbcontext.SaveChangesAsync();
                return true;
            } else
            {
                return false;
            }
        }

        public async Task<bool> Insertar(User model)
        {
            try
            {
                _dbcontext.Usuarios.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<User> Obtener(int id)
        {
            try
            {
                User model = await _dbcontext.Usuarios.FindAsync(id);
                return model;
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public async Task<string> ObtenerCodigo(string username)
        {
            try
            {
                string model = _dbcontext.Usuarios.FirstAsync(x => x.Usuario == username).Result.CodigoRecuperacion;

                return model;
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public async Task<IQueryable<User>> ObtenerTodos()
        {
            try
            {
                IQueryable<User> query = _dbcontext.Usuarios
                    .Include(c => c.IdEstadoNavigation)
                    .Include(c => c.IdRolNavigation);

                return await Task.FromResult(query);

            }
            catch (Exception ex)
            {
                return null;
            }
        }




    }
}
