using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class ClientesHistorialSaldo
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public int IdCliente { get; set; }

    public decimal Egreso { get; set; }

    public decimal Ingreso { get; set; }

    public string? Observaciones { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;
}
