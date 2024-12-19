using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;

namespace SistemaGian.Application.Controllers
{
    public class LoginController : Controller
    {

        private readonly ILoginService _loginService;

        public LoginController(ILoginService loginService)
        {
            _loginService = loginService;
        }
      
        public IActionResult Index()
        {
            return View();
        }


        [HttpPost]
        public async Task<IActionResult> Login(string username, string password)
        {
            try
            {
                var user = await _loginService.Login(username, password); // Llama al servicio de login

                // Verificar si el usuario existe
                if (user == null)
                {
                    ViewBag.Error = "Usuario no encontrado.";
                    return View("Index");
                }

                var passwordHasher = new PasswordHasher<User>();
                var result = passwordHasher.VerifyHashedPassword(user, user.Contrasena, password);

                if (result == PasswordVerificationResult.Success)
                {
                    // Crear objeto VMUser para la sesión
                    var vmUser = new VMUser
                    {
                        Id = user.Id,
                        Usuario = user.Usuario,
                        IdRol = user.IdRol,
                        Nombre = user.Nombre,
                        Apellido = user.Apellido,
                        Direccion = user.Direccion,
                        Dni = user.Dni,
                        Telefono = user.Telefono,
                    };

                    // Configurar la sesión con el usuario
                    await SessionHelper.SetUsuarioSesion(vmUser, HttpContext);

                    // Redirigir a la página principal
                    return RedirectToAction("Index", "Home");
                }
                else
                {
                    // Si el login falla, mostrar mensaje de error
                    ViewBag.Error = "Usuario o contraseña incorrectos.";
                    return View("Index");
                }
            }
            catch (Exception ex)
            {
                // Si ocurre un error, puedes registrar la excepción o mostrar un mensaje genérico
                ViewBag.Error = "Ocurrió un error inesperado. Inténtalo nuevamente.";
                // Log error aquí si es necesario
                return View("Index");
            }
        }



        // Acción para cerrar sesión
        public async Task<IActionResult> Logout()
        {
            await SessionHelper.CerrarSession(HttpContext);
            return RedirectToAction("Index");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}