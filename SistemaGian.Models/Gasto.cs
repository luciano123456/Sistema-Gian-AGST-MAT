using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class Gasto
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public int? IdUsuario { get; set; }

    public int? IdMoneda { get; set; }

    public int? IdTipo { get; set; }

    public decimal Importe { get; set; }

    public decimal? ImporteArs { get; set; }

    public string? Concepto { get; set; }

    public virtual Moneda? IdMonedaNavigation { get; set; }

    public virtual GastosTipo? IdTipoNavigation { get; set; }

    public virtual User? IdUsuarioNavigation { get; set; }
}
