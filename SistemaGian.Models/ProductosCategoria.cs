using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class ProductosCategoria
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Producto> Productos { get; set; } = new List<Producto>();
}
