namespace SistemaGian.Application.Models.ViewModels;

public class VMRecorridoParada
{
    public int Id { get; set; }
    public int? IdCliente { get; set; }
    public int? IdProveedor { get; set; }
    public string TipoParada { get; set; } = "Cliente";
    public int Orden { get; set; }
    public string? NombreCliente { get; set; }
    public string? Direccion { get; set; }
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
    public string EstadoParada { get; set; } = "Pendiente";
    public DateTime? FechaVisitada { get; set; }
    public DateTime? FechaOmitida { get; set; }
    public string? Notas { get; set; }
}

public class VMRecorrido
{
    public int Id { get; set; }
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = "";
    public string Estado { get; set; } = "Borrador";
    public string TipoDestino { get; set; } = "Clientes";
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    public decimal? OrigenLat { get; set; }
    public decimal? OrigenLng { get; set; }
    public string? OrigenDireccion { get; set; }
    public int? DistanciaMetros { get; set; }
    public int? DuracionSegundos { get; set; }
    public string? Observaciones { get; set; }
    public int CantidadParadas { get; set; }
    public List<VMRecorridoParada> Paradas { get; set; } = new();
}

public class VMRecorridoGuardar
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Estado { get; set; } = "Borrador";
    public string TipoDestino { get; set; } = "Clientes";
    public decimal? OrigenLat { get; set; }
    public decimal? OrigenLng { get; set; }
    public string? OrigenDireccion { get; set; }
    public int? DistanciaMetros { get; set; }
    public int? DuracionSegundos { get; set; }
    public string? Observaciones { get; set; }
    public List<VMRecorridoParada> Paradas { get; set; } = new();
}

public class VMRecorridoPlantilla
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public bool EsPredeterminada { get; set; }
    public string TipoDestino { get; set; } = "Clientes";
    public decimal? OrigenLat { get; set; }
    public decimal? OrigenLng { get; set; }
    public string? OrigenDireccion { get; set; }
    public DateTime FechaCreacion { get; set; }
    public List<VMRecorridoParada> Paradas { get; set; } = new();
}

public class VMPuntoMapa
{
    public int Id { get; set; }
    public string Tipo { get; set; } = "Cliente"; // Cliente | Proveedor
    public string Nombre { get; set; } = "";
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public string? DireccionMaps { get; set; }
    public string? Localidad { get; set; }
    public string? Provincia { get; set; }
    public string? Apodo { get; set; }
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
}

public class VMClienteMapa
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public string? DireccionMaps { get; set; }
    public string? Localidad { get; set; }
    public string? Provincia { get; set; }
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
}

public class VMRecorridoPendiente
{
    public bool TienePendiente { get; set; }
    public int? Id { get; set; }
    public string? Nombre { get; set; }
    public string? Estado { get; set; }
    public int CantidadParadas { get; set; }
    public int ParadasPendientes { get; set; }
    public int? ProximaParadaId { get; set; }
    public string? ProximaParadaNombre { get; set; }
    public string? ProximaParadaTipo { get; set; }
    public decimal? ProximaLat { get; set; }
    public decimal? ProximaLng { get; set; }
}
