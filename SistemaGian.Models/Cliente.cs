using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class Cliente
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Telefono { get; set; }

    public string? Direccion { get; set; }

    public int? IdProvincia { get; set; }

    public string? Localidad { get; set; }

    public string? Dni { get; set; }

    public decimal? Saldo { get; set; }

    public decimal? SaldoAfavor { get; set; }

    public virtual ICollection<ClientesHistorialSaldo> ClientesHistorialSaldos { get; set; } = new List<ClientesHistorialSaldo>();

    public virtual Provincia? IdProvinciaNavigation { get; set; }

    public virtual ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();

    public virtual ICollection<ProductosPreciosCliente> ProductosPreciosClientes { get; set; } = new List<ProductosPreciosCliente>();

    public virtual ICollection<ProductosPreciosHistorial> ProductosPreciosHistorial { get; set; } = new List<ProductosPreciosHistorial>();

    public virtual ICollection<ZonasCliente> ZonasClientes { get; set; } = new List<ZonasCliente>();
}
