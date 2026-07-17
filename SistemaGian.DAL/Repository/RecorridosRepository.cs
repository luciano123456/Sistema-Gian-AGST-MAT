using Microsoft.EntityFrameworkCore;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.DAL.Repository;

public class RecorridosRepository : IRecorridosRepository
{
    private readonly SistemaGianContext _db;

    public RecorridosRepository(SistemaGianContext db)
    {
        _db = db;
    }

    public async Task<Recorrido?> Obtener(int id)
    {
        return await _db.Recorridos
            .Include(r => r.Paradas.OrderBy(p => p.Orden))
            .Include(r => r.IdUsuarioNavigation)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<List<Recorrido>> ListarPorUsuario(int idUsuario, int take = 30)
    {
        return await _db.Recorridos
            .AsNoTracking()
            .Include(r => r.Paradas)
            .Where(r => r.IdUsuario == idUsuario)
            .OrderByDescending(r => r.FechaCreacion)
            .Take(take)
            .ToListAsync();
    }

    public async Task<Recorrido?> ObtenerPendiente(int idUsuario)
    {
        // Prioriza recorrido en curso; si no hay, el borrador más reciente
        return await _db.Recorridos
            .AsNoTracking()
            .Include(r => r.Paradas)
            .Where(r => r.IdUsuario == idUsuario && (r.Estado == "Borrador" || r.Estado == "EnCurso"))
            .OrderByDescending(r => r.Estado == "EnCurso")
            .ThenByDescending(r => r.FechaCreacion)
            .FirstOrDefaultAsync();
    }

    public async Task<Recorrido?> ObtenerEnCurso(int idUsuario)
    {
        return await _db.Recorridos
            .AsNoTracking()
            .Include(r => r.Paradas)
            .Where(r => r.IdUsuario == idUsuario && r.Estado == "EnCurso")
            .OrderByDescending(r => r.FechaInicio ?? r.FechaCreacion)
            .FirstOrDefaultAsync();
    }

    public async Task<Recorrido> Guardar(Recorrido recorrido, List<RecorridoParada> paradas, string eventoTipo, string eventoMensaje)
    {
        using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            if (recorrido.Id > 0)
            {
                var db = await _db.Recorridos
                    .Include(r => r.Paradas)
                    .FirstOrDefaultAsync(r => r.Id == recorrido.Id)
                    ?? throw new Exception("Recorrido no encontrado");

                db.Nombre = recorrido.Nombre;
                db.Estado = recorrido.Estado;
                db.OrigenLat = recorrido.OrigenLat;
                db.OrigenLng = recorrido.OrigenLng;
                db.OrigenDireccion = recorrido.OrigenDireccion;
                db.DistanciaMetros = recorrido.DistanciaMetros;
                db.DuracionSegundos = recorrido.DuracionSegundos;
                db.Observaciones = recorrido.Observaciones;
                db.TipoDestino = string.IsNullOrWhiteSpace(recorrido.TipoDestino) ? "Clientes" : recorrido.TipoDestino;
                if (recorrido.FechaInicio.HasValue) db.FechaInicio = recorrido.FechaInicio;
                if (recorrido.FechaFin.HasValue) db.FechaFin = recorrido.FechaFin;

                _db.RecorridosParadas.RemoveRange(db.Paradas);
                await _db.SaveChangesAsync();

                foreach (var p in paradas.OrderBy(x => x.Orden))
                {
                    p.Id = 0;
                    p.IdRecorrido = db.Id;
                    _db.RecorridosParadas.Add(p);
                }

                recorrido = db;
            }
            else
            {
                recorrido.FechaCreacion = DateTime.Now;
                if (string.IsNullOrWhiteSpace(recorrido.Estado))
                    recorrido.Estado = "Borrador";

                _db.Recorridos.Add(recorrido);
                await _db.SaveChangesAsync();

                foreach (var p in paradas.OrderBy(x => x.Orden))
                {
                    p.Id = 0;
                    p.IdRecorrido = recorrido.Id;
                    _db.RecorridosParadas.Add(p);
                }
            }

            _db.RecorridosEventos.Add(new RecorridoEvento
            {
                IdRecorrido = recorrido.Id,
                IdUsuario = recorrido.IdUsuario,
                Tipo = eventoTipo,
                Mensaje = eventoMensaje,
                Fecha = DateTime.Now
            });

            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return recorrido;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> ActualizarEstado(int id, string estado, DateTime? fechaInicio, DateTime? fechaFin)
    {
        var r = await _db.Recorridos.FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return false;

        r.Estado = estado;
        if (fechaInicio.HasValue) r.FechaInicio = fechaInicio;
        if (fechaFin.HasValue) r.FechaFin = fechaFin;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ActualizarParadaEstado(int idParada, string estadoParada)
    {
        var p = await _db.RecorridosParadas.FirstOrDefaultAsync(x => x.Id == idParada);
        if (p == null) return false;

        p.EstadoParada = estadoParada;
        p.FechaVisitada = estadoParada == "Visitada" ? DateTime.Now : p.FechaVisitada;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task RegistrarEvento(int? idRecorrido, int idUsuario, string tipo, string mensaje)
    {
        _db.RecorridosEventos.Add(new RecorridoEvento
        {
            IdRecorrido = idRecorrido,
            IdUsuario = idUsuario,
            Tipo = tipo,
            Mensaje = mensaje,
            Fecha = DateTime.Now
        });
        await _db.SaveChangesAsync();
    }

    public async Task<List<RecorridoPlantilla>> ListarPlantillas(int idUsuario)
    {
        return await _db.RecorridosPlantillas
            .AsNoTracking()
            .Include(p => p.Paradas.OrderBy(x => x.Orden))
            .ThenInclude(pp => pp.IdClienteNavigation)
            .Include(p => p.Paradas)
            .ThenInclude(pp => pp.IdProveedorNavigation)
            .Where(p => p.IdUsuario == idUsuario)
            .OrderByDescending(p => p.EsPredeterminada)
            .ThenByDescending(p => p.FechaCreacion)
            .ToListAsync();
    }

    public async Task<RecorridoPlantilla?> ObtenerPlantilla(int id)
    {
        return await _db.RecorridosPlantillas
            .Include(p => p.Paradas.OrderBy(x => x.Orden))
            .ThenInclude(pp => pp.IdClienteNavigation)
            .Include(p => p.Paradas)
            .ThenInclude(pp => pp.IdProveedorNavigation)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<RecorridoPlantilla> GuardarPlantilla(RecorridoPlantilla plantilla, List<RecorridoPlantillaParada> paradas)
    {
        using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            if (plantilla.EsPredeterminada)
            {
                var otras = await _db.RecorridosPlantillas
                    .Where(p => p.IdUsuario == plantilla.IdUsuario && p.EsPredeterminada)
                    .ToListAsync();
                foreach (var o in otras) o.EsPredeterminada = false;
            }

            if (plantilla.Id > 0)
            {
                var db = await _db.RecorridosPlantillas
                    .Include(p => p.Paradas)
                    .FirstOrDefaultAsync(p => p.Id == plantilla.Id)
                    ?? throw new Exception("Plantilla no encontrada");

                db.Nombre = plantilla.Nombre;
                db.EsPredeterminada = plantilla.EsPredeterminada;
                db.OrigenLat = plantilla.OrigenLat;
                db.OrigenLng = plantilla.OrigenLng;
                db.OrigenDireccion = plantilla.OrigenDireccion;
                db.TipoDestino = string.IsNullOrWhiteSpace(plantilla.TipoDestino) ? "Clientes" : plantilla.TipoDestino;

                _db.RecorridosPlantillasParadas.RemoveRange(db.Paradas);
                await _db.SaveChangesAsync();

                foreach (var p in paradas.OrderBy(x => x.Orden))
                {
                    p.Id = 0;
                    p.IdPlantilla = db.Id;
                    _db.RecorridosPlantillasParadas.Add(p);
                }

                plantilla = db;
            }
            else
            {
                plantilla.FechaCreacion = DateTime.Now;
                if (string.IsNullOrWhiteSpace(plantilla.TipoDestino))
                    plantilla.TipoDestino = "Clientes";
                _db.RecorridosPlantillas.Add(plantilla);
                await _db.SaveChangesAsync();

                foreach (var p in paradas.OrderBy(x => x.Orden))
                {
                    p.Id = 0;
                    p.IdPlantilla = plantilla.Id;
                    _db.RecorridosPlantillasParadas.Add(p);
                }
            }

            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return plantilla;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> EliminarPlantilla(int id, int idUsuario)
    {
        var p = await _db.RecorridosPlantillas.FirstOrDefaultAsync(x => x.Id == id && x.IdUsuario == idUsuario);
        if (p == null) return false;
        _db.RecorridosPlantillas.Remove(p);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarcarPlantillaPredeterminada(int id, int idUsuario)
    {
        var plantillas = await _db.RecorridosPlantillas.Where(p => p.IdUsuario == idUsuario).ToListAsync();
        foreach (var p in plantillas)
            p.EsPredeterminada = p.Id == id;

        await _db.SaveChangesAsync();
        return plantillas.Any(p => p.Id == id);
    }

    public async Task<List<Cliente>> ClientesConUbicacion()
    {
        return await _db.Clientes
            .AsNoTracking()
            .Include(c => c.IdProvinciaNavigation)
            .Where(c => c.Latitud != null && c.Longitud != null)
            .OrderBy(c => c.Nombre)
            .ToListAsync();
    }

    public async Task<List<Proveedor>> ProveedoresConUbicacion()
    {
        return await _db.Proveedores
            .AsNoTracking()
            .Where(p => p.Latitud != null && p.Longitud != null)
            .OrderBy(p => p.Nombre)
            .ToListAsync();
    }
}
