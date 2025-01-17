using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class VMPagosPedidosCliente
{
    public int Id { get; set; }

    public int? IdPedido { get; set; }

    public DateTime Fecha { get; set; }

    public int IdMoneda { get; set; }

    public string Moneda { get; set; }

    public decimal? Cotizacion { get; set; }

    public decimal Total { get; set; }

    public decimal TotalArs { get; set; }

    public string? Observacion { get; set; }

}
