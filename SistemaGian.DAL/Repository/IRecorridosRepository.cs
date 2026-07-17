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
    Task<bool> ActualizarParadaEstado(int idParada, string estadoParada, string? notas = null);
    Task<RecorridoParada?> ObtenerParada(int idParada);
    Task RegistrarEvento(int? idRecorrido, int idUsuario, string tipo, string mensaje);

    Task<List<RecorridoPlantilla>> ListarPlantillas(int idUsuario);
    Task<RecorridoPlantilla?> ObtenerPlantilla(int id);
    Task<RecorridoPlantilla> GuardarPlantilla(RecorridoPlantilla plantilla, List<RecorridoPlantillaParada> paradas);
    Task<bool> EliminarPlantilla(int id, int idUsuario);
    Task<bool> MarcarPlantillaPredeterminada(int id, int idUsuario);
    Task<bool> Eliminar(int id);

    Task<List<Cliente>> ClientesConUbicacion();
    Task<List<Proveedor>> ProveedoresConUbicacion();
    Task<List<(int Id, int Dias7, int Dias15, int Dias30)>> ResumenVisitas(string tipoEntidad);
    Task<List<(int Id, string Nombre, string? Direccion, string? Localidad, string? Telefono, DateTime? UltimaVisita)>> SinVisitaReciente(string tipoEntidad, int dias = 30);
}
