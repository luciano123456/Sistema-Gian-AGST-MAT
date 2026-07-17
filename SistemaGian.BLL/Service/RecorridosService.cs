using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service;

public interface IRecorridosService
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

public class RecorridosService : IRecorridosService
{
    private readonly IRecorridosRepository _repo;

    public RecorridosService(IRecorridosRepository repo)
    {
        _repo = repo;
    }

    public Task<Recorrido?> Obtener(int id) => _repo.Obtener(id);
    public Task<List<Recorrido>> ListarPorUsuario(int idUsuario, int take = 30) => _repo.ListarPorUsuario(idUsuario, take);
    public Task<Recorrido?> ObtenerPendiente(int idUsuario) => _repo.ObtenerPendiente(idUsuario);
    public Task<Recorrido?> ObtenerEnCurso(int idUsuario) => _repo.ObtenerEnCurso(idUsuario);
    public Task<Recorrido> Guardar(Recorrido recorrido, List<RecorridoParada> paradas, string eventoTipo, string eventoMensaje)
        => _repo.Guardar(recorrido, paradas, eventoTipo, eventoMensaje);
    public Task<bool> ActualizarEstado(int id, string estado, DateTime? fechaInicio, DateTime? fechaFin)
        => _repo.ActualizarEstado(id, estado, fechaInicio, fechaFin);
    public Task<bool> ActualizarParadaEstado(int idParada, string estadoParada) => _repo.ActualizarParadaEstado(idParada, estadoParada);
    public Task RegistrarEvento(int? idRecorrido, int idUsuario, string tipo, string mensaje)
        => _repo.RegistrarEvento(idRecorrido, idUsuario, tipo, mensaje);
    public Task<List<RecorridoPlantilla>> ListarPlantillas(int idUsuario) => _repo.ListarPlantillas(idUsuario);
    public Task<RecorridoPlantilla?> ObtenerPlantilla(int id) => _repo.ObtenerPlantilla(id);
    public Task<RecorridoPlantilla> GuardarPlantilla(RecorridoPlantilla plantilla, List<RecorridoPlantillaParada> paradas)
        => _repo.GuardarPlantilla(plantilla, paradas);
    public Task<bool> EliminarPlantilla(int id, int idUsuario) => _repo.EliminarPlantilla(id, idUsuario);
    public Task<bool> MarcarPlantillaPredeterminada(int id, int idUsuario) => _repo.MarcarPlantillaPredeterminada(id, idUsuario);
    public Task<List<Cliente>> ClientesConUbicacion() => _repo.ClientesConUbicacion();
    public Task<List<Proveedor>> ProveedoresConUbicacion() => _repo.ProveedoresConUbicacion();
}
