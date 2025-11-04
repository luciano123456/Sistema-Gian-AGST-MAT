using Microsoft.EntityFrameworkCore;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public class ClienteRepository : IClienteRepository<Cliente>
    {
        private readonly SistemaGianContext _dbcontext;

        public ClienteRepository(SistemaGianContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Actualizar(Cliente model)
        {
            _dbcontext.Clientes.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Cliente model = _dbcontext.Clientes.First(c => c.Id == id);
            _dbcontext.Clientes.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Cliente model)
        {
            _dbcontext.Clientes.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Cliente> Obtener(int id)
        {
            Cliente model = await _dbcontext.Clientes.FindAsync(id);
            return model;
        }

        public async Task<IQueryable<Cliente>> ObtenerTodos()
        {
            IQueryable<Cliente> query = _dbcontext.Clientes.Include(c => c.IdProvinciaNavigation);
            return await Task.FromResult(query);
        }

        public async Task<IQueryable<ClientesHistorialSaldo>> ObtenerHistorialCrediticio(int idCliente)
        {
            IQueryable<ClientesHistorialSaldo> query = _dbcontext.ClientesHistorialSaldos
                .Where(h => h.IdCliente == idCliente)
                .OrderByDescending(h => h.Fecha);

            return await Task.FromResult(query);
        }

        public async Task<ClientesHistorialSaldo> ObtenerMovimientoSaldo(int idMovimiento)
        {
            return await _dbcontext.ClientesHistorialSaldos.FirstOrDefaultAsync(x => x.Id == idMovimiento);
        }

        // ======= MOVIMIENTOS SALDO (CRUD + AJUSTES) =======

        public async Task<bool> CrearMovimientoSaldo(int idCliente, decimal monto, string tipo, string observaciones, DateTime? fecha = null)
        {
            using var trx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var cliente = await _dbcontext.Clientes.FindAsync(idCliente);
                if (cliente == null) return false;

                var isIngreso = string.Equals(tipo, "Ingreso", StringComparison.OrdinalIgnoreCase);
                var movimiento = new ClientesHistorialSaldo
                {
                    Fecha = fecha ?? DateTime.Now,
                    IdCliente = idCliente,
                    Ingreso = isIngreso ? monto : 0,
                    Egreso = isIngreso ? 0 : monto,
                    Observaciones = observaciones
                };

                _dbcontext.ClientesHistorialSaldos.Add(movimiento);

                // Ajuste del saldo
                var delta = isIngreso ? monto : -monto;
                cliente.SaldoAfavor = (cliente.SaldoAfavor ?? 0) + delta;

                await _dbcontext.SaveChangesAsync();
                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ActualizarMovimientoSaldo(int idMovimiento, decimal monto, string tipo, string observaciones, DateTime? fecha = null)
        {
            using var trx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var mov = await _dbcontext.ClientesHistorialSaldos.FirstOrDefaultAsync(x => x.Id == idMovimiento);
                if (mov == null) return false;

                var cliente = await _dbcontext.Clientes.FindAsync(mov.IdCliente);
                if (cliente == null) return false;

                // Neto original (impacto previo en SaldoAfavor)
                var netoOriginal = (mov.Ingreso) - (mov.Egreso);

                // Seteo nuevo tipo y montos
                var isIngreso = string.Equals(tipo, "Ingreso", StringComparison.OrdinalIgnoreCase);
                mov.Ingreso = isIngreso ? monto : 0;
                mov.Egreso = isIngreso ? 0 : monto;
                mov.Observaciones = observaciones;
                mov.Fecha = fecha ?? mov.Fecha;

                // Neto nuevo
                var netoNuevo = (mov.Ingreso) - (mov.Egreso);

                // Diferencia a ajustar
                var delta = netoNuevo - netoOriginal;
                cliente.SaldoAfavor = (cliente.SaldoAfavor ?? 0) + delta;

                await _dbcontext.SaveChangesAsync();
                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> EliminarMovimientoSaldo(int idMovimiento)
        {
            using var trx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var mov = await _dbcontext.ClientesHistorialSaldos.FirstOrDefaultAsync(x => x.Id == idMovimiento);
                if (mov == null) return false;

                var cliente = await _dbcontext.Clientes.FindAsync(mov.IdCliente);
                if (cliente == null) return false;

                // Revertir impacto del movimiento
                var neto = (mov.Ingreso) - (mov.Egreso);
                cliente.SaldoAfavor = (cliente.SaldoAfavor ?? 0) - neto;

                _dbcontext.ClientesHistorialSaldos.Remove(mov);

                await _dbcontext.SaveChangesAsync();
                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                throw;
            }
        }

        // ======= Tus métodos previos de sumar/restar directos (compat) =======

        public async Task<bool> SumarSaldoInterno(int idCliente, decimal saldo, string observaciones = null)
        {
            try
            {
                var model = await _dbcontext.Clientes.FindAsync(idCliente);
                if (model == null) return false;

                model.SaldoAfavor = (model.SaldoAfavor ?? 0) + saldo;

                var historial = new ClientesHistorialSaldo
                {
                    Fecha = DateTime.Now,
                    IdCliente = idCliente,
                    Ingreso = saldo,
                    Egreso = 0,
                    Observaciones = observaciones
                };

                _dbcontext.ClientesHistorialSaldos.Add(historial);

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch
            {
                throw;
            }
        }

        public async Task<bool> SumarSaldo(int idCliente, decimal saldo, string observaciones = null)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var model = await _dbcontext.Clientes.FindAsync(idCliente);
                if (model == null) return false;

                model.SaldoAfavor = (model.SaldoAfavor ?? 0) + saldo;

                var historial = new ClientesHistorialSaldo
                {
                    Fecha = DateTime.Now,
                    IdCliente = idCliente,
                    Ingreso = saldo,
                    Egreso = 0,
                    Observaciones = observaciones
                };

                _dbcontext.ClientesHistorialSaldos.Add(historial);

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> RestarSaldo(int idCliente, decimal saldo, string observaciones = null)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var model = await _dbcontext.Clientes.FindAsync(idCliente);
                if (model == null) return false;

                model.SaldoAfavor = (model.SaldoAfavor ?? 0) - saldo;

                var historial = new ClientesHistorialSaldo
                {
                    Fecha = DateTime.Now,
                    IdCliente = idCliente,
                    Ingreso = 0,
                    Egreso = saldo,
                    Observaciones = observaciones
                };

                _dbcontext.ClientesHistorialSaldos.Add(historial);

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
