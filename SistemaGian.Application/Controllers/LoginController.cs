using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;
using System.Diagnostics;
using System.Net.Mail;
using System.Net;

namespace SistemaGian.Application.Controllers
{
    public class LoginController : Controller
    {

        private readonly ILoginService _loginService;
        private readonly IUsuariosService _Usuarioservice;

        public LoginController(ILoginService loginService, IUsuariosService usuarioService)
        {
            _loginService = loginService;
            _Usuarioservice = usuarioService;
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



        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> IniciarSesion([FromBody] VMLogin model)
        {
            try
            {
                var user = await _loginService.Login(model.Usuario, model.Contrasena); // Llama al servicio de login

                // Verificar si el usuario existe
                if (user == null)
                {
                    return Json(new { success = false, message = "Usuario o contraseña incorrectos." });
                }

                var passwordHasher = new PasswordHasher<User>();
                var result = passwordHasher.VerifyHashedPassword(user, user.Contrasena, model.Contrasena);

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
                        ModoVendedor = user.ModoVendedor,
                    };

                    // Configurar la sesión con el usuario
                    await SessionHelper.SetUsuarioSesion(vmUser, HttpContext);

                    // Responder con éxito y redirigir
                    return Json(new { success = true, redirectUrl = Url.Action("Index", "Home"), user = vmUser });
                }
                else
                {
                    return Json(new { success = false, message = "Usuario o contraseña incorrectos." });
                }
            }
            catch (Exception ex)
            {
                // Si ocurre un error, manejarlo
                return Json(new { success = false, message = "Ocurrió un error inesperado. Inténtalo nuevamente." });
            }
        }



        [HttpPost]
        public async Task<IActionResult> RecuperarContrasena([FromBody] VMRecuperarContrasena model)
        {
            try
            {
                // Verificar que el usuario y el correo sean válidos (puedes agregar validaciones adicionales)
                if (string.IsNullOrEmpty(model.Username) || string.IsNullOrEmpty(model.Email))
                {
                    // Mensaje si faltan el usuario o el correo
                    return new JsonResult(new { success = false, message = "Por favor, ingresa tanto el nombre de usuario como el correo electrónico." });
                }

                // Generar un código aleatorio de 6 dígitos
                Random random = new Random();
                string codigoRecuperacion = random.Next(100000, 999999).ToString();

                var guardarCodigo = await _Usuarioservice.GuardarCodigo(model.Username, codigoRecuperacion);

                // Enviar el código al correo electrónico
                EnviarCorreo(model.Email, codigoRecuperacion);

                // Respuesta exitosa, indicando que el código fue enviado
                return new JsonResult(new { success = true, message = "Hemos enviado un código de recuperación a tu correo electrónico." });
            }
            catch (Exception ex)
            {
                // Respuesta en caso de error en el procesamiento
                return new JsonResult(new { success = false, message = $"Hubo un error al procesar la solicitud. Detalles: {ex.Message}" });
            }
        }

        private void EnviarCorreo(string email, string codigo)
        {
            // Configurar el cliente SMTP (asegúrate de tener los valores correctos de tu servidor de correo)
            var smtpClient = new SmtpClient("smtp.tuservidor.com")
            {
                Port = 587,
                Credentials = new NetworkCredential("luciano_5258@hotmail.com", "Luciano44053332"),
                EnableSsl = true,
            };

            // Crear el mensaje de correo
            var mailMessage = new MailMessage
            {
                From = new MailAddress("luciano_5258@hotmail.com"),
                Subject = "Código de Recuperación de Contraseña",
                Body = $"Tu código de recuperación es: {codigo}",
                IsBodyHtml = true,
            };
            mailMessage.To.Add(email);

            // Enviar el correo
            smtpClient.Send(mailMessage);
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