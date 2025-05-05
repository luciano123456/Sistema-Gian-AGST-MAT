using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class Zona
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public decimal? Precio { get; set; }

    public virtual ICollection<ZonasCliente> ZonasClientes { get; set; } = new List<ZonasCliente>();
}
