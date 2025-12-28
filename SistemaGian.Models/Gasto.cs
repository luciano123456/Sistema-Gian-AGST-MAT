using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class Gasto
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public int? IdUsuario { get; set; }

    public int IdMoneda { get; set; }

    public decimal Importe { get; set; }

    public decimal? Cotizacion { get; set; }

    public decimal? ImporteArs { get; set; }

    public int IdTipo { get; set; }

    public string? Concepto { get; set; }

    public virtual Moneda IdMonedaNavigation { get; set; } = null!;

    public virtual GastosTipo IdTipoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioNavigation { get; set; }
}
