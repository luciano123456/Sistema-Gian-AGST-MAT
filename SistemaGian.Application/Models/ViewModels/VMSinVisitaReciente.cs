namespace SistemaGian.Application.Models.ViewModels;

public class VMSinVisitaReciente
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string? Direccion { get; set; }
    public string? Localidad { get; set; }
    public string? Telefono { get; set; }
    public DateTime? UltimaVisita { get; set; }
    public int? DiasSinVisita { get; set; }
    public bool NuncaVisitado { get; set; }
}

public class VMSinVisitaResumen
{
    public string Tipo { get; set; } = "Cliente";
    public int DiasUmbral { get; set; } = 30;
    public int Cantidad { get; set; }
    public List<VMSinVisitaReciente> Items { get; set; } = new();
}
