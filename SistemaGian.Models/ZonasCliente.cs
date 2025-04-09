using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class ZonasCliente
{
    public int Id { get; set; }

    public int IdCliente { get; set; }

    public int IdZona { get; set; }

    public decimal Precio { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual Zona IdZonaNavigation { get; set; } = null!;
}
