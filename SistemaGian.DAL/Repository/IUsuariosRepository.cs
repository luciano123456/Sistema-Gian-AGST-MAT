﻿using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IUsuariosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(User model);
        Task<bool> Insertar(User model);
        Task<User> Obtener(int id);
        Task<User> ObtenerPorUsuario(string usuario);
        Task<bool> NuevaContrasena(string username, string contrasena);
        Task<bool> GuardarCodigo(string username, string codigo);
        Task<string> ObtenerCodigo(string username);
        Task<IQueryable<User>> ObtenerTodos();
    }
}
