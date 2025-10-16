using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMAsignarProveedores
    {
        public string productos { get; set; }
        public List<int> idProveedores { get; set; }
    }

}
