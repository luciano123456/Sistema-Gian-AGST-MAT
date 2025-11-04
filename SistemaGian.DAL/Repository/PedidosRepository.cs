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

                    // Devolver el saldo usado en cada pago
                    foreach (var pago in pagosCliente)
                    {
                        devolucionPagos = pago.SaldoUsado;
                    }

                    if (devolucionPagos > 0)
                    {
                        await _clienteRepository.SumarSaldoInterno((int)pedidoModel.IdCliente, devolucionPagos,
                            $"Devolución por eliminación del pedido N° {(pedidoModel.NroRemito != null ? pedidoModel.NroRemito : pedidoModel.Id)}");
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
                            var stock = await _dbcontext.AcopioStockActual
                                .FirstOrDefaultAsync(x => x.IdProducto == producto.IdProducto);

                            if (stock != null)
                            {
                                // Sumar la cantidad devuelta al stock
                                stock.CantidadActual += producto.CantidadUsadaAcopio;

                                // Registrar historial
                                _dbcontext.AcopioHistorial.Add(new AcopioHistorial
                                {
                                    IdProducto = (int)producto.IdProducto,
                                    IdProveedor = (int)pedidoModel.IdProveedor,
                                    Fecha = DateTime.Now,
                                    Ingreso = producto.CantidadUsadaAcopio,
                                    Egreso = null,
                                    Observaciones = $"Devolución de acopio por eliminación del pedido N° {(pedidoModel.NroRemito != null ? pedidoModel.NroRemito : pedidoModel.Id)}"
                                });
                            }
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
                // Actualizar solo los campos básicos del pedido
                _dbcontext.Attach(pedidoModal);
                _dbcontext.Entry(pedidoModal).State = EntityState.Modified;

                // === PAGOS CLIENTE ===
                if (!await InsertarPagosCliente(pedidoModal.Id, pagosCliente))
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

                if (!await InsertarPagosCliente(idPedido, pagosCliente)) throw new Exception("Error al insertar pagos cliente");

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

        public async Task<bool> InsertarPagosCliente(int idPedido, List<PagosPedidosCliente> pagos)
        {
            try
            {
                // Traemos el pedido SIN trackear (no queremos que EF lo meta al ChangeTracker)
                var pedido = await _dbcontext.Pedidos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == idPedido);
                if (pedido == null) return false;

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
                        Observaciones = $"Devolución de saldo por eliminación de pago del pedido N° {(pedido.NroRemito ?? pedido.Id.ToString())}"
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
                                Observaciones = $"Ajuste de saldo por modificación de pago del pedido N° {(pedido.NroRemito ?? pedido.Id.ToString())}"
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
                                Observaciones = $"Uso de saldo por nuevo pago del pedido N° {(pedido.NroRemito ?? pedido.Id.ToString())}"
                            });
                        }

                        _dbcontext.PagosPedidosClientes.Add(p);
                    }
                }

                // Aseguramos que EF persista el cambio del saldo del cliente
                _dbcontext.Entry(cliente).Property(c => c.SaldoAfavor).IsModified = true;

                // 🔒 CLAVE: evitamos que se actualice "Pedidos" colateralmente
                NeutralizarPedidoEnTracker(idPedido);

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
                    var existentes = await _dbcontext.PedidosProductos
                        .Where(x => x.IdPedido == idPedido)
                        .ToListAsync();

                    var aEliminar = existentes
                        .Where(pe => !productos.Any(p => p.IdPedido == pe.IdPedido && p.IdProducto == pe.IdProducto))
                        .ToList();

                    _dbcontext.PedidosProductos.RemoveRange(aEliminar);

                    foreach (var p in productos.Where(x => x.IdPedido == idPedido))
                    {
                        p.IdPedidoNavigation = null;
                        p.IdProductoNavigation = null;

                        var existente = existentes.FirstOrDefault(x => x.IdProducto == p.IdProducto);
                        if (existente != null)
                        {
                            existente.Cantidad = p.Cantidad;
                            existente.PrecioCosto = p.PrecioCosto;
                            existente.PrecioVenta = p.PrecioVenta;
                            existente.ProductoCantidad = p.ProductoCantidad;
                            existente.CantidadUsadaAcopio = p.CantidadUsadaAcopio;
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
                Console.WriteLine("❌ Error en InsertarProductos: " + (ex.InnerException?.Message ?? ex.Message));
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

                List<PedidosProducto> productos = _dbcontext.PedidosProductos
                    .Include(c => c.IdProductoNavigation)
                    .ThenInclude(c => c.IdUnidadDeMedidaNavigation)
                    .Where(c => c.IdPedido == idPedido).ToList();
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
            var ultimoNroRemitoStr = await _dbcontext.Pedidos
                .OrderByDescending(p => p.NroRemito)
                .Select(p => p.NroRemito)
                .FirstOrDefaultAsync();

            if (string.IsNullOrWhiteSpace(ultimoNroRemitoStr))
                return 0;

            if (int.TryParse(ultimoNroRemitoStr, out int nro))
                return nro;

            return 0;
        }




    }
}
