using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.Application.Models.ViewModels.Login;
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

        private readonly VMSmtpSettings _smtpSettings;

        public LoginController(ILoginService loginService, IUsuariosService usuarioService, IConfiguration configuration)
        {
            _loginService = loginService;
            _Usuarioservice = usuarioService;
             _smtpSettings = configuration.GetSection("SmtpSettings").Get<VMSmtpSettings>();
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

                User usuario = await _Usuarioservice.ObtenerPorUsuario(model.Username);

                if(usuario == null || usuario.Correo == null || usuario.Correo.ToUpper() != model.Email.ToUpper())
                {
                    // Mensaje si faltan el usuario o el correo
                    return new JsonResult(new { success = false, message = "Usuario o correo incorrecto." });
                }


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

        [HttpPost]
        public async Task<IActionResult> ValidarCodigo([FromBody] VMValidarCodigo model)
        {
            try
            {

                var codigo = await _Usuarioservice.ObtenerCodigo(model.Username);

                if (codigo == model.Codigo)
                {
                    return new JsonResult(new { success = true, message=$"Contraseña actualizada correctamente." });
                }
                else
                {
                    return new JsonResult(new { success = false, message = $"Codigo incorrecto." });
                }

            }
            catch (Exception ex)
            {
                // Respuesta en caso de error en el procesamiento
                return new JsonResult(new { success = false, message = $"Hubo un error al procesar la solicitud. Detalles: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<bool> NuevaContrasena([FromBody] VMNuevaContrasena model)
        {
            try
            {
                var passwordHasher = new PasswordHasher<User>();

                var codigo = await _Usuarioservice.NuevaContrasena(model.Username, passwordHasher.HashPassword(null, model.Contrasena));

                return true;
            }
            catch (Exception ex)
            {
                // Respuesta en caso de error en el procesamiento
                return false;
            }
        }

        public void EnviarCorreo(string email, string codigo)
        {
            try
            {
                // Configurar el cliente SMTP con los valores del appsettings.json
                var smtpClient = new SmtpClient(_smtpSettings.SmtpServer)
                {
                    Port = _smtpSettings.SmtpPort,
                    Credentials = new NetworkCredential(_smtpSettings.SmtpUsername, _smtpSettings.SmtpPassword),
                    EnableSsl = true,
                    UseDefaultCredentials = false
                };

                // Crear el mensaje de correo
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_smtpSettings.SmtpFrom),
                    Subject = "Código de Recuperación de Contraseña",
                    Body = $"Tu código de recuperación es: {codigo}",
                    IsBodyHtml = false,
                };

                // Agregar el destinatario
                mailMessage.To.Add(email);

                // Enviar el correo
                smtpClient.Send(mailMessage);
            }
            catch (Exception ex)
            {
                // Manejo de errores: Mostrar el error si algo sale mal
                Console.WriteLine("Error al enviar el correo: " + ex.Message);
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