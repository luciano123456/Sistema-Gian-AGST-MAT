using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IUsuariosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(User model);
        Task<bool> Insertar(User model);
        Task<bool> GuardarCodigo(string username, string codigo);
        Task<bool> NuevaContrasena(string username, string contrasena);
        Task<User> ObtenerPorUsuario(string usuario);
        Task<string> ObtenerCodigo(string username);

        Task<User> Obtener(int id);

        Task<IQueryable<User>> ObtenerTodos();
    }

}
