using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;

namespace SistemaGian.Application.Controllers
{
    [Authorize]
    public class ClientesController : Controller
    {
        private readonly IClienteService _clienteService;
        private readonly IProvinciaService _provinciaService;
        private readonly IProveedorService _proveedorservice;

        public ClientesController(IClienteService clienteService, IProvinciaService provinciaService, IProveedorService proveedorservice)
        {
            _clienteService = clienteService;
            _provinciaService = provinciaService;
            _proveedorservice = proveedorservice;
        }

        public async Task<IActionResult> Index()
        {
            // Obtener el usuario actual desde la sesión usando el helper inyectado
            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            // Si no se pudo obtener el usuario de la sesión
            if (userSession != null)
            {
                // Verificar si el usuario está en modo vendedor
                if (userSession.ModoVendedor == 1)
                {
                    return RedirectToAction("Index", "Home");
                }
            }
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var clientes = await _clienteService.ObtenerTodos();

            var lista = clientes.Select(c => new VMCliente
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                IdProvincia = c.IdProvincia,
                Provincia = c.IdProvinciaNavigation.Nombre,
                Localidad = c.Localidad,
                Dni = c.Dni,
                Saldo = c.Saldo ?? 0,
                SaldoAfavor = c.SaldoAfavor ?? 0
            }).ToList();

            return Ok(lista);
        }



        [HttpGet]
        public async Task<IActionResult> ListaProvincias()
        {
            var provincias = await _provinciaService.ObtenerTodos();

            var lista = provincias.Select(c => new VMProvincia
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }



        [HttpPost]
        public async Task<IActionResult> SumarSaldo(int idCliente, decimal Saldo, string observaciones)
        {

            bool respuesta = await _clienteService.SumarSaldo(idCliente, Saldo, observaciones);

            return Ok(new { valor = respuesta });
        }

        [HttpPost]
        public async Task<IActionResult> RestarSaldo(int idCliente, decimal Saldo, string observaciones)
        {

            bool respuesta = await _clienteService.RestarSaldo(idCliente, Saldo, observaciones);

            return Ok(new { valor = respuesta });
        }


        [HttpGet]
        public async Task<IActionResult> ObtenerHistorial(int idCliente)
        {
            var historial = await _clienteService.ObtenerHistorialCrediticio(idCliente);

            var lista = historial.Select(h => new VMClienteHistorialSaldo
            {
                Id = h.Id,
                Fecha = h.Fecha,
                IdCliente = h.IdCliente,
                Ingreso = h.Ingreso,
                Egreso = h.Egreso,
                Observaciones = h.Observaciones
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCliente model)
        {
            var cliente = new Cliente
            {
                Id = model.Id,
                Saldo = model.Saldo ?? 0,
                SaldoAfavor = model.SaldoAfavor ?? 0,
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                Localidad = model.Localidad,
                IdProvincia = model.IdProvincia,
                Direccion = model.Direccion,
                Dni = model.Dni,
            };

            bool respuesta = await _clienteService.Insertar(cliente);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCliente model)
        {
            var cliente = await _clienteService.Obtener(model.Id); // Obtener cliente existente

            if (cliente == null)
            {
                return NotFound(new { mensaje = "Cliente no encontrado" });
            }

            // Actualizar solo los campos proporcionados en el modelo
            cliente.Nombre = model.Nombre;
            cliente.Telefono = model.Telefono;
            cliente.Localidad = model.Localidad;
            cliente.IdProvincia = model.IdProvincia;
            cliente.Direccion = model.Direccion;
            cliente.Dni = model.Dni;

            if (model.SaldoAfavor.HasValue) // Solo actualizar SaldoAfavor si tiene un valor
            {
                cliente.SaldoAfavor = model.SaldoAfavor.Value;
            }

            bool respuesta = await _clienteService.Actualizar(cliente);

            return Ok(new { valor = respuesta });
        }


        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _clienteService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var cliente = await _clienteService.Obtener(id);

            if (cliente != null)
            {
                return StatusCode(StatusCodes.Status200OK, cliente);
            }
            else
            {
                return StatusCode(StatusCodes.Status404NotFound);
            }
        }
        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}