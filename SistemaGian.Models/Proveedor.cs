using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class Proveedor
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Apodo { get; set; }

    public string? Ubicacion { get; set; }

    public string? Telefono { get; set; }

    public virtual ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();

    public virtual ICollection<ProductosPreciosCliente> ProductosPreciosClientes { get; set; } = new List<ProductosPreciosCliente>();

    public virtual ICollection<ProductosPreciosHistorial> ProductosPreciosHistorials { get; set; } = new List<ProductosPreciosHistorial>();

    public virtual ICollection<ProductosPreciosProveedor> ProductosPreciosProveedores { get; set; } = new List<ProductosPreciosProveedor>();
}
