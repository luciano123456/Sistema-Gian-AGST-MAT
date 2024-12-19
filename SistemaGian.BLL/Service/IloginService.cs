using SistemaGian.Models;
using System.Net.Http;

namespace SistemaGian.BLL.Service
{
    public interface ILoginService
    {
        Task<User> Login(string username, string password);

        Task<bool> Logout();
    }
}
