using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public class ProvinciaService : IProvinciaService
    {

        private readonly IProvinciaRepository<Provincia> _provinciaRepo;


        public ProvinciaService(IProvinciaRepository<Provincia> provinciaRepo)
        {
            _provinciaRepo = provinciaRepo;
        }

        public async Task<IQueryable<Provincia>> ObtenerTodos()
        {
            return await _provinciaRepo.ObtenerTodos();
        }
    }
}
