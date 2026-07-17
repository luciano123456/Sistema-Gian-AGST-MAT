using Azure;
using Microsoft.EntityFrameworkCore;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaGian.DAL.Repository
{
    public class PedidosRepository : IPedidosRepository<Pedido>
    {
        private readonly IClienteRepository<Cliente> _clienteRepository;
        private readonly SistemaGianContext _dbcontext;


        public PedidosRepository(SistemaGianContext context, IClienteRepository<Cliente> clienteRepository)
        {
            _dbcontext = context;
            _clienteRepository = clienteRepository;
        }

        public async Task<bool> EliminarPagoCliente(int idPago)
        {
            PagosPedidosCliente pago = _dbcontext.PagosPedidosClientes.First(c => c.Id == idPago);
            await _dbcontext.SaveChangesAsync();
            return true;

        }

        public async Task<bool> EliminarPagoProveedor(int idPago)
        {
            PagosPedidosProveedor pago = _dbcontext.PagosPedidosProveedores.First(c => c.Id == idPago);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int idPedido)
        {
            using (var transaction = await _dbcontext.Database.BeginTransactionAsync())
            {
                try
                {
                    decimal devolucionPagos = 0;

                    // Obtener el pedido
                    var pedidoModel = _dbcontext.Pedidos.FirstOrDefault(c => c.Id == idPedido);
                    if (pedidoModel == null)
                        return false;

                    // Obtener los pagos de cliente asociados
                    var pagosCliente = await _dbcontext.PagosPedidosClientes
                        .Where(p => p.IdPedido == idPedido)
                        .ToListAsync();

                    devolucionPagos = pagosCliente.Sum(p => p.SaldoUsado);

                    if (devolucionPagos > 0)
                    {
                        var nroPartidaElim = FormatearNroPartida(pedidoModel.NroRemito);
                        await _clienteRepository.SumarSaldoInterno((int)pedidoModel.IdCliente, devolucionPagos,
                            $"Devolución por eliminación del pedido N° {nroPartidaElim}");
                    }

                    // Eliminar los pagos de cliente
                    _dbcontext.PagosPedidosClientes.RemoveRange(pagosCliente);

                    // Eliminar los pagos de proveedor
                    var pagosProveedor = await _dbcontext.PagosPedidosProveedores
                        .Where(p => p.IdPedido == idPedido)
                        .ToListAsync();
                    _dbcontext.PagosPedidosProveedores.RemoveRange(pagosProveedor);

                    // Obtener los productos del pedido
                    var productos = await _dbcontext.PedidosProductos
                        .Where(p => p.IdPedido == idPedido)
                        .ToListAsync();

                    foreach (var producto in productos)
                    {
                        if (producto.CantidadUsadaAcopio > 0)
                        {
                            var nroRemito = await TextoNroRemitoPedido(pedidoModel.Id);
                            await RegistrarDevolucionAcopioAsync(
                                (int)producto.IdProducto,
                                (int)pedidoModel.IdProveedor,
                                (decimal)producto.CantidadUsadaAcopio,
                                $"Devolución de acopio por eliminación del pedido N° {nroRemito}");
                        }
                    }

                    // Eliminar los productos
                    _dbcontext.PedidosProductos.RemoveRange(productos);

                    // Eliminar el pedido
                    _dbcontext.Pedidos.Remove(pedidoModel);

                    await _dbcontext.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    Console.WriteLine(ex);
                    return false;
                }
            }
        }



        public async Task<bool> Actualizar(Pedido pedidoModal, List<PagosPedidosCliente> pagosCliente, List<PagosPedidosProveedor> pagosProveedores, List<PedidosProducto> productos)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var pedidoDb = await _dbcontext.Pedidos
                .FirstOrDefaultAsync(p => p.Id == pedidoModal.Id);

                if (pedidoDb == null)
                    throw new Exception("Pedido no encontrado");

                // SOLO CAMPOS QUE REALMENTE SE EDITAN
                pedidoDb.Fecha = pedidoModal.Fecha;
                pedidoDb.FechaEntrega = pedidoModal.FechaEntrega;
                pedidoDb.NroRemito = pedidoModal.NroRemito;
                pedidoDb.CostoFlete = pedidoModal.CostoFlete;
                pedidoDb.IdCliente = pedidoModal.IdCliente;
                pedidoDb.IdProveedor = pedidoModal.IdProveedor;
                pedidoDb.IdZona = pedidoModal.IdZona;
                pedidoDb.IdChofer = pedidoModal.IdChofer; // ✅ ESTE AHORA SÍ SE GUARDA
                pedidoDb.TotalCliente = pedidoModal.TotalCliente;
                pedidoDb.RestanteCliente = pedidoModal.RestanteCliente;
                pedidoDb.TotalProveedor = pedidoModal.TotalProveedor;
                pedidoDb.RestanteProveedor = pedidoModal.RestanteProveedor;
                pedidoDb.TotalGanancia = pedidoModal.TotalGanancia;
                pedidoDb.PorcGanancia = pedidoModal.PorcGanancia;
                pedidoDb.Estado = pedidoModal.Estado;
                pedidoDb.Observacion = pedidoModal.Observacion;


                // === PAGOS CLIENTE ===
                if (!await InsertarPagosCliente(pedidoModal.Id, pagosCliente, pedidoModal.NroRemito))
                    throw new Exception("Error al actualizar pagos cliente");

                // === PAGOS PROVEEDOR ===
                if (!await InsertarPagosProveedor(pedidoModal.Id, pagosProveedores))
                    throw new Exception("Error al actualizar pagos proveedor");

                // === PRODUCTOS ===
                if (!await InsertarProductos(productos, (int)pedidoModal.IdProveedor))
                    throw new Exception("Error al actualizar productos");

                await _dbcontext.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.WriteLine("❌ Actualizar pedido falló: " + (ex.InnerException?.Message ?? ex.Message));
                return false;
            }
        }

        public async Task<bool> Insertar(Pedido pedido, List<PagosPedidosCliente> pagosCliente, List<PagosPedidosProveedor> pagosProveedores, List<PedidosProducto> productos)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                // Crear pedido
                _dbcontext.Pedidos.Add(pedido);
                await _dbcontext.SaveChangesAsync();

                int idPedido = pedido.Id;

                // === PAGOS CLIENTE ===
                foreach (var pc in pagosCliente)
                {
                    pc.IdPedido = idPedido;
                    pc.IdPedidoNavigation = null;
                }

                if (!await InsertarPagosCliente(idPedido, pagosCliente, pedido.NroRemito)) throw new Exception("Error al insertar pagos cliente");

                // === PAGOS PROVEEDOR ===
                foreach (var pp in pagosProveedores)
                {
                    pp.IdPedido = idPedido;
                    pp.IdPedidoNavigation = null;
                }

                if (!await InsertarPagosProveedor(idPedido, pagosProveedores)) throw new Exception("Error al insertar pagos proveedor");

                // === PRODUCTOS ===
                foreach (var prod in productos)
                {
                    prod.IdPedido = idPedido;
                    prod.IdPedidoNavigation = null;
                    prod.IdProductoNavigation = null;
                }

                if (!await InsertarProductos(productos, (int)pedido.IdProveedor)) throw new Exception("Error al insertar productos");

                await tx.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.WriteLine("❌ Insertar pedido falló: " + (ex.InnerException?.Message ?? ex.Message));
                return false;
            }
        }
        // Helper: evita que SaveChanges toque la tabla Pedidos desde este método
        private void NeutralizarPedidoEnTracker(int idPedido)
        {
            // Si por cualquier motivo hay un Pedido con ese Id en Modified/Added/Deleted,
            // lo pasamos a Unchanged para que NO se persista nada de Pedidos.
            foreach (var e in _dbcontext.ChangeTracker.Entries<Pedido>().ToList())
            {
                if (e.Entity?.Id == idPedido && e.State != EntityState.Unchanged)
                    e.State = EntityState.Unchanged;
            }
        }

        public async Task<bool> InsertarPagosCliente(int idPedido, List<PagosPedidosCliente> pagos, string? nroRemito = null)
        {
            try
            {
                // Traemos el pedido SIN trackear (no queremos que EF lo meta al ChangeTracker)
                var pedido = await _dbcontext.Pedidos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == idPedido);
                if (pedido == null) return false;

                var nroPartida = await ResolverNroPartidaPedidoAsync(idPedido, nroRemito ?? pedido.NroRemito);

                var cliente = await _dbcontext.Clientes
                    .FirstOrDefaultAsync(c => c.Id == pedido.IdCliente);
                if (cliente == null) return false;

                cliente.SaldoAfavor ??= 0m;

                var pagosExistentes = await _dbcontext.PagosPedidosClientes
                    .Where(x => x.IdPedido == idPedido)
                    .ToListAsync();

                // Eliminar los que ya no están
                var pagosAEliminar = pagosExistentes
                    .Where(pe => !pagos.Any(p => p.Id == pe.Id))
                    .ToList();

                foreach (var pe in pagosAEliminar)
                {
                    cliente.SaldoAfavor += pe.SaldoUsado;

                    _dbcontext.ClientesHistorialSaldos.Add(new ClientesHistorialSaldo
                    {
                        Fecha = DateTime.Now,
                        IdCliente = cliente.Id,
                        Ingreso = pe.SaldoUsado,
                        Egreso = 0,
                        Observaciones = $"Devolución de saldo por eliminación de pago del pedido N° {nroPartida}"
                    });
                }

                _dbcontext.PagosPedidosClientes.RemoveRange(pagosAEliminar);

                // Upsert de los pagos que quedan
                foreach (var p in pagos)
                {
                    p.IdPedido = idPedido;
                    p.IdPedidoNavigation = null; // IMPORTANTÍSIMO: no subir el grafo

                    var existente = pagosExistentes.FirstOrDefault(x => x.Id == p.Id);
                    if (existente != null)
                    {
                        var diff = p.SaldoUsado - existente.SaldoUsado;
                        if (diff != 0)
                        {
                            cliente.SaldoAfavor -= diff;

                            _dbcontext.ClientesHistorialSaldos.Add(new ClientesHistorialSaldo
                            {
                                Fecha = DateTime.Now,
                                IdCliente = cliente.Id,
                                Ingreso = diff < 0 ? Math.Abs(diff) : 0,
                                Egreso = diff > 0 ? diff : 0,
                                Observaciones = $"Ajuste de saldo por modificación de pago del pedido N° {nroPartida}"
                            });
                        }

                        existente.Fecha = p.Fecha;
                        existente.IdMoneda = p.IdMoneda;
                        existente.Cotizacion = p.Cotizacion;
                        existente.Total = p.Total;
                        existente.TotalArs = p.TotalArs;
                        existente.Observacion = p.Observacion;
                        existente.SaldoUsado = p.SaldoUsado;
                    }
                    else
                    {
                        cliente.SaldoAfavor -= p.SaldoUsado;

                        if (p.SaldoUsado > 0)
                        {
                            _dbcontext.ClientesHistorialSaldos.Add(new ClientesHistorialSaldo
                            {
                                Fecha = DateTime.Now,
                                IdCliente = cliente.Id,
                                Ingreso = 0,
                                Egreso = p.SaldoUsado,
                                Observaciones = $"Uso de saldo por nuevo pago del pedido N° {nroPartida}"
                            });
                        }

                        _dbcontext.PagosPedidosClientes.Add(p);
                    }
                }

                // Aseguramos que EF persista el cambio del saldo del cliente
                _dbcontext.Entry(cliente).Property(c => c.SaldoAfavor).IsModified = true;

                //// 🔒 CLAVE: evitamos que se actualice "Pedidos" colateralmente
                //NeutralizarPedidoEnTracker(idPedido);

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Error en InsertarPagosCliente: " + (ex.InnerException?.Message ?? ex.Message));
                return false;
            }
        }

        public async Task<bool> InsertarPagosProveedor(int idPedido, List<PagosPedidosProveedor> pagos)
        {
            try
            {
                var pagosExistentes = await _dbcontext.PagosPedidosProveedores
                    .Where(x => x.IdPedido == idPedido)
                    .ToListAsync();

                var pagosAEliminar = pagosExistentes
                    .Where(pe => !pagos.Any(p => p.Id == pe.Id))
                    .ToList();

                _dbcontext.PagosPedidosProveedores.RemoveRange(pagosAEliminar);

                foreach (var p in pagos)
                {
                    p.IdPedido = idPedido;
                    p.IdPedidoNavigation = null;

                    var existente = pagosExistentes.FirstOrDefault(x => x.Id == p.Id);
                    if (existente != null)
                    {
                        existente.Fecha = p.Fecha;
                        existente.Cotizacion = p.Cotizacion;
                        existente.Total = p.Total;
                        existente.TotalArs = p.TotalArs;
                        existente.Observacion = p.Observacion;
                    }
                    else
                    {
                        _dbcontext.PagosPedidosProveedores.Add(p);
                    }
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Error en InsertarPagosProveedor: " + (ex.InnerException?.Message ?? ex.Message));
                return false;
            }
        }

        public async Task<bool> InsertarProductos(List<PedidosProducto> productos, int idProveedor)
        {
            try
            {
                var idPedidos = productos.Select(p => p.IdPedido).Distinct().ToList();

                foreach (var idPedido in idPedidos)
                {
                    if (idPedido is not > 0)
                        throw new Exception("Id de pedido inválido al guardar productos.");

                    var nroRemito = await TextoNroRemitoPedido(idPedido.Value);

                    var existentes = await _dbcontext.PedidosProductos
                        .Where(x => x.IdPedido == idPedido)
                        .ToListAsync();

                    var aEliminar = existentes
                        .Where(pe => !productos.Any(p => p.IdProducto == pe.IdProducto))
                        .ToList();

                    foreach (var pe in aEliminar)
                    {
                        var acopioDevolver = pe.CantidadUsadaAcopio ?? 0;
                        if (acopioDevolver > 0)
                        {
                            await RegistrarDevolucionAcopioAsync(
                                (int)pe.IdProducto,
                                idProveedor,
                                acopioDevolver,
                                $"Devolución de acopio por eliminación de producto del pedido N° {nroRemito}");
                        }
                    }

                    _dbcontext.PedidosProductos.RemoveRange(aEliminar);

                    foreach (var p in productos.Where(x => x.IdPedido == idPedido))
                    {
                        p.IdPedidoNavigation = null;
                        p.IdProductoNavigation = null;
                        p.IdMonedaNavigation = null;

                        var existente = existentes.FirstOrDefault(x => x.IdProducto == p.IdProducto);
                        var acopioAnterior = existente?.CantidadUsadaAcopio ?? 0;
                        var acopioNuevo = p.CantidadUsadaAcopio ?? 0;
                        var deltaAcopio = acopioNuevo - acopioAnterior;

                        if (deltaAcopio > 0)
                        {
                            var obs = existente == null
                                ? $"Uso de acopio por alta de producto en pedido N° {nroRemito}"
                                : $"Uso de acopio por modificación de producto en pedido N° {nroRemito}";

                            if (!await RegistrarEgresoAcopioAsync((int)p.IdProducto, idProveedor, deltaAcopio, obs))
                                throw new Exception("Stock de acopio insuficiente para uno de los productos.");
                        }
                        else if (deltaAcopio < 0)
                        {
                            await RegistrarDevolucionAcopioAsync(
                                (int)p.IdProducto,
                                idProveedor,
                                Math.Abs(deltaAcopio),
                                $"Devolución de acopio por modificación de producto en pedido N° {nroRemito}");
                        }

                        if (existente != null)
                        {
                            existente.Cantidad = p.Cantidad;
                            existente.ProductoCantidad = p.ProductoCantidad;
                            existente.PrecioCosto = p.PrecioCosto;
                            existente.PrecioVenta = p.PrecioVenta;
                            existente.CantidadUsadaAcopio = p.CantidadUsadaAcopio;

                            existente.IdMoneda = p.IdMoneda;
                            existente.Cotizacion = p.Cotizacion;
                            existente.PrecioCostoArs = p.PrecioCostoArs;
                            existente.PrecioVentaArs = p.PrecioVentaArs;
                            existente.TotalArs = p.TotalArs;
                        }
                        else
                        {
                            _dbcontext.PedidosProductos.Add(p);
                        }
                    }
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Error InsertarProductos: " + (ex.InnerException?.Message ?? ex.Message));
                return false;
            }
        }




        private void CleanChangeTracker(SistemaGianContext ctx)
        {
            // Evitar inserts o updates en entidades relacionadas
            foreach (var entry in ctx.ChangeTracker.Entries())
            {
                if (entry.Entity is Pedido or Cliente or Proveedor)
                {
                    if (entry.State == EntityState.Added)
                        entry.State = EntityState.Detached;
                    else if (entry.State == EntityState.Modified)
                        entry.State = EntityState.Unchanged;
                }
            }
        }



        public async Task<bool> NuevoPedido(Pedido model)
        {
            try
            {
                _dbcontext.Pedidos.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }


        public async Task<bool> ActualizarPagosCliente(List<PagosPedidosCliente> pagos)
        {
            try
            {
                foreach (PagosPedidosCliente p in pagos)
                {
                    var pagoOriginal = await _dbcontext.PagosPedidosClientes
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.Id == p.Id && x.IdPedido == p.IdPedido);

                    if (pagoOriginal != null)
                    {
                        decimal diferencia = p.SaldoUsado - pagoOriginal.SaldoUsado;

                        var pedido = await _dbcontext.Pedidos
                            .AsNoTracking()
                            .FirstOrDefaultAsync(x => x.Id == p.IdPedido);

                        if (pedido != null)
                        {
                            var cliente = await _dbcontext.Clientes.FirstOrDefaultAsync(c => c.Id == pedido.IdCliente);
                            if (cliente != null)
                            {
                                cliente.SaldoAfavor -= diferencia;
                            }
                        }

                        _dbcontext.PagosPedidosClientes.Update(p);
                    }
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }




        public async Task<bool> ActualizarProductos(List<PedidosProducto> productos)
        {
            foreach (PedidosProducto p in productos)
            {
                _dbcontext.PedidosProductos.Update(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;

        }


        public async Task<bool> ActualizarPagosProveedor(List<PagosPedidosProveedor> pagos)
        {
            foreach (PagosPedidosProveedor p in pagos)
            {
                _dbcontext.PagosPedidosProveedores.Update(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Pedido model)
        {
            _dbcontext.Pedidos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }


        public async Task<PagosPedidosProveedor> ObtenerPagoaProveedor(int idPago)
        {
            PagosPedidosProveedor pago = _dbcontext.PagosPedidosProveedores.First(c => c.Id == idPago);
            return pago;
        }

        public async Task<PagosPedidosCliente> ObtenerPagoCliente(int idPago)
        {
            PagosPedidosCliente pago = _dbcontext.PagosPedidosClientes.First(c => c.Id == idPago);
            return pago;
        }

        public async Task<List<PagosPedidosProveedor>> ObtenerPagosaProveedores(int idPedido)
        {
            List<PagosPedidosProveedor> pagos = _dbcontext.PagosPedidosProveedores.Where(c => c.IdPedido == idPedido).ToList();
            return pagos;
        }

        public async Task<List<PagosPedidosCliente>> ObtenerPagosClientes(int idPedido)
        {
            List<PagosPedidosCliente> pagos = _dbcontext.PagosPedidosClientes.Where(c => c.IdPedido == idPedido).ToList();
            return pagos;
        }

        public async Task<Pedido> ObtenerPedido(int idPedido)
        {
            Pedido pedido = _dbcontext.Pedidos
                .Include(c => c.IdClienteNavigation)
                .Include(c => c.IdProveedorNavigation)
                .FirstOrDefault(c => c.Id == idPedido);
            return pedido;
        }

        public async Task<List<PedidosProducto>> ObtenerProductosPedido(int idPedido)
        {
            try
            {
                var productos = await _dbcontext.PedidosProductos
                    .Include(p => p.IdProductoNavigation)
                        .ThenInclude(p => p.IdUnidadDeMedidaNavigation)
                    .Include(p => p.IdMonedaNavigation) // 🔥 ESTO FALTABA
                    .Where(p => p.IdPedido == idPedido)
                    .ToListAsync();

                return productos;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
        }


        public async Task<IQueryable<Pedido>> ObtenerTodos()
        {
            IQueryable<Pedido> query = _dbcontext.Pedidos
                .Include(c => c.IdClienteNavigation)
                .Include(c => c.IdProveedorNavigation);
            return await Task.FromResult(query);
        }

        public async Task<int> ObtenerUltimoNroRemito()
        {
            // NroRemito es texto en BD: OrderByDescending alfabético falla ("9" > "10").
            var remitos = await _dbcontext.Pedidos
                .AsNoTracking()
                .Where(p => p.NroRemito != null && p.NroRemito != "")
                .Select(p => p.NroRemito!)
                .ToListAsync();

            var max = 0;
            foreach (var r in remitos)
            {
                var s = r.Trim();
                if (int.TryParse(s, out var n) && n > max)
                    max = n;
            }

            return max;
        }

        public async Task<bool> ExisteNroRemitoAsync(string nroRemito, int? excluirIdPedido = null)
        {
            var normalizado = nroRemito?.Trim();
            if (string.IsNullOrWhiteSpace(normalizado))
                return false;

            var query = _dbcontext.Pedidos
                .AsNoTracking()
                .Where(p => p.NroRemito != null && p.NroRemito == normalizado);

            if (excluirIdPedido.HasValue && excluirIdPedido.Value > 0)
                query = query.Where(p => p.Id != excluirIdPedido.Value);

            return await query.AnyAsync();
        }

        private static string FormatearNroPartida(string? nroRemito) =>
            !string.IsNullOrWhiteSpace(nroRemito) ? nroRemito.Trim() : "sin partida";

        /// <summary>Partida (NroRemito) para observaciones; usa el valor en memoria si viene del guardado.</summary>
        private async Task<string> ResolverNroPartidaPedidoAsync(int idPedido, string? nroRemitoHint = null)
        {
            if (!string.IsNullOrWhiteSpace(nroRemitoHint))
                return FormatearNroPartida(nroRemitoHint);

            return await TextoNroRemitoPedido(idPedido);
        }

        /// <summary>NroRemito del pedido para textos guardados (nunca el id interno).</summary>
        private async Task<string> TextoNroRemitoPedido(int idPedido)
        {
            var nroRemito = await _dbcontext.Pedidos
                .AsNoTracking()
                .Where(p => p.Id == idPedido)
                .Select(p => p.NroRemito)
                .FirstOrDefaultAsync();

            return FormatearNroPartida(nroRemito);
        }

        private async Task<bool> RegistrarEgresoAcopioAsync(int idProducto, int idProveedor, decimal cantidad, string observaciones)
        {
            if (cantidad <= 0) return true;

            var stock = await _dbcontext.AcopioStockActual
                .FirstOrDefaultAsync(x => x.IdProducto == idProducto && x.IdProveedor == idProveedor);

            if (stock == null || stock.CantidadActual < cantidad)
                return false;

            stock.CantidadActual -= cantidad;
            stock.FechaUltimaActualizacion = DateTime.Now;

            _dbcontext.AcopioHistorial.Add(new AcopioHistorial
            {
                IdProducto = idProducto,
                IdProveedor = idProveedor,
                Fecha = DateTime.Now,
                Egreso = cantidad,
                Ingreso = null,
                Observaciones = observaciones
            });

            return true;
        }

        private async Task RegistrarDevolucionAcopioAsync(int idProducto, int idProveedor, decimal cantidad, string observaciones)
        {
            if (cantidad <= 0) return;

            var stock = await _dbcontext.AcopioStockActual
                .FirstOrDefaultAsync(x => x.IdProducto == idProducto && x.IdProveedor == idProveedor);

            if (stock == null)
            {
                stock = new AcopioStockActual
                {
                    IdProducto = idProducto,
                    IdProveedor = idProveedor,
                    CantidadActual = cantidad,
                    FechaUltimaActualizacion = DateTime.Now
                };
                _dbcontext.AcopioStockActual.Add(stock);
            }
            else
            {
                stock.CantidadActual += cantidad;
                stock.FechaUltimaActualizacion = DateTime.Now;
            }

            _dbcontext.AcopioHistorial.Add(new AcopioHistorial
            {
                IdProducto = idProducto,
                IdProveedor = idProveedor,
                Fecha = DateTime.Now,
                Ingreso = cantidad,
                Egreso = null,
                Observaciones = observaciones
            });
        }

        private Task<string> RefNroPartida(int idPedido) => ResolverNroPartidaPedidoAsync(idPedido);




    }
}
