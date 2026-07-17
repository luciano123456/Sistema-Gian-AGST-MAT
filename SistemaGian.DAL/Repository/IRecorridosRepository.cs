using SistemaGian.Models;

namespace SistemaGian.DAL.Repository;

public interface IRecorridosRepository
{
    Task<Recorrido?> Obtener(int id);
    Task<List<Recorrido>> ListarPorUsuario(int idUsuario, int take = 30);
    Task<Recorrido?> ObtenerPendiente(int idUsuario);
    Task<Recorrido?> ObtenerEnCurso(int idUsuario);
    Task<Recorrido> Guardar(Recorrido recorrido, List<RecorridoParada> paradas, string eventoTipo, string eventoMensaje);
    Task<bool> ActualizarEstado(int id, string estado, DateTime? fechaInicio, DateTime? fechaFin);
    Task<bool> ActualizarParadaEstado(int idParada, string estadoParada);
    Task RegistrarEvento(int? idRecorrido, int idUsuario, string tipo, string mensaje);

    Task<List<RecorridoPlantilla>> ListarPlantillas(int idUsuario);
    Task<RecorridoPlantilla?> ObtenerPlantilla(int id);
    Task<RecorridoPlantilla> GuardarPlantilla(RecorridoPlantilla plantilla, List<RecorridoPlantillaParada> paradas);
    Task<bool> EliminarPlantilla(int id, int idUsuario);
    Task<bool> MarcarPlantillaPredeterminada(int id, int idUsuario);

    Task<List<Cliente>> ClientesConUbicacion();
    Task<List<Proveedor>> ProveedoresConUbicacion();
}
