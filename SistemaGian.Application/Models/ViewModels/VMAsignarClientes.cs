using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMAsignarClientes
    {
        public string productos { get; set; }
        public List<int> idClientes { get; set; }
        public int idProveedor { get; set; }
    }

}
