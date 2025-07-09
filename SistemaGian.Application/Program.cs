using Microsoft.EntityFrameworkCore;
using SistemaGian.BLL.Service;
using SistemaGian.DAL.DataContext;
using SistemaGian.DAL.Repository;
using SistemaGian.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using System.Text.Json;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<SistemaGianContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SistemaDB")));



builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true; // Insensible a mayúsculas
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase; // Acepta camelCase
    });

// Agregar Razor Pages
builder.Services.AddRazorPages().AddRazorRuntimeCompilation();

// Registrar repositorios y servicios
builder.Services.AddScoped<IClienteRepository<Cliente>, ClienteRepository>();
builder.Services.AddScoped<IClienteService, ClienteService>();
builder.Services.AddScoped<IProvinciaRepository<Provincia>, ProvinciaRepository>();
builder.Services.AddScoped<IProvinciaService, ProvinciaService>();
builder.Services.AddScoped<IGenericRepository<SistemaGian.Models.Proveedor>, ProveedorRepository>();
builder.Services.AddScoped<IProveedorService, ProveedorService>();
builder.Services.AddScoped<IGenericRepository<Moneda>, MonedaRepository>();
builder.Services.AddScoped<IMonedaService, Monedaservice>();
builder.Services.AddScoped<IGenericRepository<Chofer>, ChoferRepository>();
builder.Services.AddScoped<IChoferService, ChoferService>();
builder.Services.AddScoped<IProductoRepository, ProductoRepository>();
builder.Services.AddScoped<IProductoService, ProductoService>();
builder.Services.AddScoped<IGenericRepository<ProductosMarca>, MarcaRepository>();
builder.Services.AddScoped<IMarcaService, MarcaService>();
builder.Services.AddScoped<IGenericRepository<ProductosCategoria>, CategoriaRepository>();
builder.Services.AddScoped<ICategoriaService, CategoriaService>();
builder.Services.AddScoped<IGenericRepository<ProductosUnidadesDeMedida>, UnidadDeMedidaRepository>();
builder.Services.AddScoped<IUnidadDeMedidaService, UnidadDeMedidaService>();

builder.Services.AddScoped<IProductosPrecioProveedorRepository<SistemaGian.Models.ProductosPreciosProveedor>, ProductosPrecioProveedorRepository>();
builder.Services.AddScoped<IProductosPrecioProveedorService, ProductosPrecioProveedorService>();

builder.Services.AddScoped<IProductosPrecioClienteRepository<ProductosPreciosCliente>, ProductosPrecioClienteRepository>();
builder.Services.AddScoped<IProductosPrecioClienteService, ProductosPrecioClienteService>();

builder.Services.AddScoped<IProductosPrecioHistorialRepository<ProductosPreciosHistorial>, ProductosPrecioHistorialRepository>();
builder.Services.AddScoped<IProductosPrecioHistorialService, ProductosPrecioHistorialService>();

builder.Services.AddScoped<IPedidosRepository<Pedido>, PedidosRepository>();
builder.Services.AddScoped<IPedidoService, PedidoService>();

builder.Services.AddScoped<IZonasRepository<Zona>, ZonasRepository>();
builder.Services.AddScoped<IZonasService, ZonasService>();

builder.Services.AddScoped<IUsuariosRepository<User>, UsuariosRepository>();
builder.Services.AddScoped<IUsuariosService, UsuariosService>();

builder.Services.AddScoped<IRolesRepository<Rol>, RolesRepository>();
builder.Services.AddScoped<IRolesService, RolesService>();

builder.Services.AddScoped<IEstadosUsuariosRepository<EstadosUsuario>, EstadosUsuariosRepository>();
builder.Services.AddScoped<IEstadosUsuariosService, EstadosUsuariosService>();

builder.Services.AddScoped<ILoginRepository<User>, LoginRepository>();
builder.Services.AddScoped<ILoginService, LoginService>();

// Repositorios
builder.Services.AddScoped<IAcopioHistorialRepository, AcopioHistorialRepository>();
builder.Services.AddScoped<IAcopioStockActualRepository, AcopioStockActualRepository>();

// Servicios
builder.Services.AddScoped<IAcopioHistorialService, AcopioHistorialService>();
builder.Services.AddScoped<IAcopioStockActualService, AcopioStockActualService>();


builder.Services.AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

// Configurar autenticación con cookies
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login/Index";  // Ruta para redirigir al login si no está autenticado
        options.LogoutPath = "/Login/Logout"; // Ruta para cerrar sesión
    });


var app = builder.Build();

// Middleware para habilitar el buffering y registrar el cuerpo de la solicitud
app.Use(async (context, next) =>
{
    if (!context.Request.Path.StartsWithSegments("/.well-known"))
    {
        context.Request.EnableBuffering();
        var body = await new StreamReader(context.Request.Body).ReadToEndAsync();
        Console.WriteLine(body);
        context.Request.Body.Position = 0;
    }

    await next.Invoke();
});


// Configurar el pipeline de middleware
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles(new StaticFileOptions
{
    ServeUnknownFileTypes = true,
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")),
    RequestPath = ""
});


app.UseRouting();

app.UseAuthentication(); // Habilitar la autenticación con cookies
app.UseAuthorization();  // Habilitar la autorización

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Asegúrate de que las rutas de login estén excluidas del middleware de autenticación
app.MapControllerRoute(
    name: "login",
    pattern: "Login/{action=Index}",
    defaults: new { controller = "Login", action = "Index" });
app.Run();
