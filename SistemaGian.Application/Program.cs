using Microsoft.EntityFrameworkCore;
using SistemaGian.BLL.Service;
using SistemaGian.DAL.DataContext;
using SistemaGian.DAL.Repository;
using SistemaGian.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddDbContext<SistemaGianContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("cadenaSQL"));
});


builder.Services.AddRazorPages().AddRazorRuntimeCompilation();
builder.Services.AddScoped<IGenericRepository<Cliente>, ClienteRepository>();
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



builder.Services.AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
