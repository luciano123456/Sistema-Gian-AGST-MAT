using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaGian.Application.Models.WebManagement;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.Application.Controllers;

[Authorize]
public class WebManagementController : Controller
{
    private readonly SistemaGianContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WebManagementController> _logger;
    private readonly IWebHostEnvironment _environment;

    public WebManagementController(
        SistemaGianContext db,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<WebManagementController> logger,
        IWebHostEnvironment environment)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        _environment = environment;
    }

    [HttpGet]
    public async Task<IActionResult> Index(int? editProduct, CancellationToken ct)
    {
        var settings = await ReadSettingsAsync(ct);
        var publications = await _db.WebProductosPublicados.AsNoTracking()
            .ToDictionaryAsync(x => x.IdProducto, ct);

        var products = await _db.Productos.AsNoTracking()
            .Include(x => x.IdCategoriaNavigation)
            .Include(x => x.IdUnidadDeMedidaNavigation)
            .Where(x => x.Activo == null || x.Activo == 1)
            .OrderBy(x => x.Descripcion)
            .ToListAsync(ct);

        var selectedProducts = products
            .Where(p => publications.ContainsKey(p.Id))
            .Select(p =>
            {
                var pub = publications[p.Id];
                return new WebProductRowViewModel
                {
                    ProductId = p.Id,
                    Name = p.Descripcion,
                    Category = p.IdCategoriaNavigation?.Nombre ?? "Sin categoría",
                    CategoryId = p.IdCategoria,
                    Unit = p.IdUnidadDeMedidaNavigation?.Nombre ?? "Unidad",
                    DefaultPrice = p.PVenta,
                    Published = pub.Publicado,
                    PublicPrice = pub.PrecioPublico,
                    ListPrice = pub.PrecioLista,
                    DiscountPercent = pub.DescuentoPorcentaje,
                    OfferLabel = pub.EtiquetaOferta,
                    IsOnOffer = pub.EnOferta,
                    Featured = pub.Destacado,
                    SortOrder = pub.Orden,
                    Images = ReadStagedImages(pub.ImagenesJson, p.Id),
                    Model3dUrl = pub.Modelo3dUrl,
                    HasLocalModel3d = IsLocalModel3d(pub.Modelo3dUrl),
                    Model3dFileName = GetModel3dDisplayName(pub.Modelo3dUrl),
                    PublicDescription = pub.DescripcionPublica
                };
            })
            .OrderByDescending(p => p.Published)
            .ThenBy(p => p.SortOrder)
            .ThenBy(p => p.Name)
            .ToList();

        var categories = await _db.ProductosCategorias.AsNoTracking()
            .OrderBy(x => x.Nombre)
            .Select(x => new WebCategoryViewModel { Id = x.Id, Name = x.Nombre })
            .ToListAsync(ct);

        foreach (var category in categories)
            category.PublishedCount = selectedProducts.Count(p => p.Published && p.CategoryId == category.Id);

        var banners = await _db.WebBanners.AsNoTracking()
            .OrderBy(x => x.Orden)
            .ThenBy(x => x.Id)
            .Select(x => new WebBannerViewModel
            {
                Id = x.Id,
                Title = x.Titulo,
                Subtitle = x.Subtitulo,
                LinkUrl = x.LinkUrl,
                CtaLabel = x.CtaLabel,
                SortOrder = x.Orden,
                Active = x.Activo,
                ShowOnHome = x.MostrarInicio,
                ShowOnCatalog = x.MostrarCatalogo,
                OriginalFileName = x.ImagenOriginal,
                PreviewUrl = x.ImagenFileName == null
                    ? null
                    : $"/uploads/web-banners/{x.Id}/{Uri.EscapeDataString(x.ImagenFileName)}"
            })
            .ToListAsync(ct);

        var heroSlides = await _db.WebHeroSlides.AsNoTracking()
            .OrderBy(x => x.Placement)
            .ThenBy(x => x.Orden)
            .ThenBy(x => x.Id)
            .Select(x => new WebHeroSlideViewModel
            {
                Id = x.Id,
                Placement = x.Placement,
                SortOrder = x.Orden,
                OriginalFileName = x.ImagenOriginal,
                PreviewUrl = x.ImagenFileName == null
                    ? null
                    : $"/uploads/web-hero/{x.Id}/{Uri.EscapeDataString(x.ImagenFileName)}"
            })
            .ToListAsync(ct);

        var model = new WebManagementViewModel
        {
            SiteName = GetSetting(settings, "site.name", "AGS MAT"),
            NavHomeLabel = GetSetting(settings, "nav.homeLabel", "Inicio"),
            NavCatalogLabel = GetSetting(settings, "nav.catalogLabel", "Catálogo"),
            NavAboutLabel = GetSetting(settings, "nav.aboutLabel", "Nosotros"),
            NavQuoteLabel = GetSetting(settings, "nav.quoteLabel", "Presupuesto"),
            HeroPill = GetSetting(settings, "hero.pill", "Corralones · Constructoras · Desarrolladoras"),
            HeroTitle = GetSetting(settings, "hero.title", "Materiales de construcción para tu obra"),
            HeroText = GetSetting(settings, "hero.text", "Abastecimiento para corralones, constructoras y desarrolladoras."),
            AudienceTitle = GetSetting(settings, "home.audienceTitle", "¿Para quién es?"),
            AudienceItems = GetSetting(settings, "home.audienceItems", DefaultAudienceItems),
            AudienceNote = GetSetting(settings, "home.audienceNote", "Sin pagos online: confirmás por WhatsApp."),
            CategoriesTitle = GetSetting(settings, "home.categoriesTitle", "Categorías"),
            CategoriesText = GetSetting(settings, "home.categoriesText", "Ladrillos, cementos, telgopor, hierros y más."),
            FeaturedTitle = GetSetting(settings, "home.featuredTitle", "Productos del catálogo"),
            FeaturedText = GetSetting(settings, "home.featuredText", "Listos para sumar al carrito y enviar por WhatsApp."),
            HomeOffersTitle = GetSetting(settings, "home.offersTitle", "Ofertas del momento"),
            HomeOffersText = GetSetting(settings, "home.offersText", "Precios especiales cargados desde Gestión, con el precio anterior a la vista."),
            HomeBenefitsTitle = GetSetting(settings, "home.benefitsTitle", "Una compra de materiales más simple"),
            HomeBenefitsText = GetSetting(settings, "home.benefitsText", "Todo lo que necesitás para pedir con claridad y coordinar sin demoras."),
            HomeBenefitsItems = GetSetting(settings, "home.benefitsItems", "Entrega o retiro coordinado|Armamos la logística según el volumen de tu pedido.\nPrecios claros, sin sorpresas|Ves el precio final y el precio anterior cuando hay oferta.\nConfirmación por WhatsApp|Un asesor confirma stock y entrega.\nPensado para volumen|Reposición de corralón y compras por partida de obra."),
            HomeStepsTitle = GetSetting(settings, "home.stepsTitle", "Cómo comprar en 3 pasos"),
            HomeStepsText = GetSetting(settings, "home.stepsText", "Tres pasos, sin fricción y con una persona del otro lado."),
            HomeStepsItems = GetSetting(settings, "home.stepsItems", "Armá tu pedido|Recorré el catálogo, elegí cantidades y sumá todo al carrito.\nEnviá el detalle|Con un clic mandás el pedido completo por WhatsApp o como presupuesto.\nCoordinamos la entrega|Confirmamos stock, precio final y logística antes de despachar."),
            HomeCtaTitle = GetSetting(settings, "home.ctaTitle", "¿Necesitás cotizar una obra completa?"),
            HomeCtaText = GetSetting(settings, "home.ctaText", "Contanos qué materiales necesitás y te armamos el presupuesto con cantidades y logística."),
            HomeOffersColor = GetSetting(settings, "home.offersColor", "#FFF4E5"),
            HomeOffersTextColor = GetSetting(settings, "home.offersTextColor", "#1D2430"),
            HomeProductsColor = GetSetting(settings, "home.productsColor", "#FFFFFF"),
            HomeProductsTextColor = GetSetting(settings, "home.productsTextColor", "#1D2430"),
            HomeCategoriesColor = GetSetting(settings, "home.categoriesColor", "#F6F7F9"),
            HomeCategoriesTextColor = GetSetting(settings, "home.categoriesTextColor", "#1D2430"),
            HomeCtaColor = GetSetting(settings, "home.ctaColor", "#1F4F7A"),
            HomeCtaTextColor = GetSetting(settings, "home.ctaTextColor", "#FFFFFF"),
            HomeBenefitsColor = GetSetting(settings, "home.benefitsColor", "#FFFFFF"),
            HomeBenefitsTextColor = GetSetting(settings, "home.benefitsTextColor", "#1D2430"),
            HeroImageUrl = GetSetting(settings, "media.heroImage", "/uploads/web-assets/defaults/hero.jpg"),
            AboutStoryImageUrl = GetSetting(settings, "media.aboutStoryImage", "/uploads/web-assets/defaults/about-story.jpg"),
            CatalogHeroImageUrl = GetSetting(settings, "media.catalogHeroImage", "/uploads/web-assets/defaults/catalog-hero.jpg"),
            FooterDescription = GetSetting(settings, "footer.description", "Materiales para corralones y obras. Pedí por WhatsApp con el carrito listo para enviar."),
            FooterExploreTitle = GetSetting(settings, "footer.exploreTitle", "Explorar"),
            FooterCatalogLabel = GetSetting(settings, "footer.catalogLabel", "Catálogo"),
            FooterAboutLabel = GetSetting(settings, "footer.aboutLabel", "Historia y políticas"),
            FooterContactLabel = GetSetting(settings, "footer.contactLabel", "Contacto"),
            FooterCommercialTitle = GetSetting(settings, "footer.commercialTitle", "Comercial"),
            FooterCommercialText = GetSetting(settings, "footer.commercialText", "Pedidos estimados sujetos a confirmación de stock y logística.\nConfiguración y catálogo administrados exclusivamente desde Sistema Gestión AGS MAT."),
            PrimaryColor = GetSetting(settings, "theme.primaryColor", "#1F4F7A"),
            AccentColor = GetSetting(settings, "theme.accentColor", "#128C7E"),
            WhatsAppNumber = GetSetting(settings, "contact.whatsapp", ""),
            AboutKicker = GetSetting(settings, "about.kicker", "Quiénes somos"),
            AboutHeroTitle = GetSetting(settings, "about.heroTitle", "Materiales para obra, con una atención pensada para vender y construir."),
            AboutHeroText = GetSetting(settings, "about.heroText", "Combinamos catálogo, asesoramiento y confirmación por WhatsApp para que corralones, constructoras y desarrolladoras avancen sin fricción."),
            AboutBadgeText = GetSetting(settings, "about.badgeText", "Abastecimiento comercial para la obra"),
            AboutStoryKicker = GetSetting(settings, "about.storyKicker", "Nuestra historia"),
            AboutStoryTitle = GetSetting(settings, "about.storyTitle", "Cómo acompañamos cada obra"),
            AboutStoryFloatTitle = GetSetting(settings, "about.storyFloatTitle", "Stock · Obra · Reventa"),
            AboutStoryFloatText = GetSetting(settings, "about.storyFloatText", "Pedidos coordinados con seguimiento comercial"),
            AboutChecklist = GetSetting(settings, "about.checklist", "Catálogo armado para reposición y compra por partida\nPrecios claros, con ofertas y listas visibles\nConfirmación humana por WhatsApp, sin pagos online forzados"),
            Historia = GetSetting(settings, "historia", ""),
            AboutMisionTitle = GetSetting(settings, "about.misionTitle", "Misión"),
            Mision = GetSetting(settings, "mision", ""),
            AboutVisionTitle = GetSetting(settings, "about.visionTitle", "Visión"),
            Vision = GetSetting(settings, "vision", ""),
            AboutPillarsKicker = GetSetting(settings, "about.pillarsKicker", "Cómo trabajamos"),
            AboutPillarsTitle = GetSetting(settings, "about.pillarsTitle", "Una operación pensada para comprar mejor"),
            AboutPillar1Title = GetSetting(settings, "about.pillar1Title", "Para corralones"),
            AboutPillar1Text = GetSetting(settings, "about.pillar1Text", "Reposición ágil, surtido comercial y precios listos para cotizar a tus clientes."),
            AboutPillar2Title = GetSetting(settings, "about.pillar2Title", "Para constructoras"),
            AboutPillar2Text = GetSetting(settings, "about.pillar2Text", "Materiales de arranque y avance de obra, con seguimiento de cantidades y logística."),
            AboutPillar3Title = GetSetting(settings, "about.pillar3Title", "Para desarrolladoras"),
            AboutPillar3Text = GetSetting(settings, "about.pillar3Text", "Compras por partida, coordinación comercial y confirmación clara antes de despachar."),
            AboutCatsKicker = GetSetting(settings, "about.catsKicker", "Rubros"),
            AboutCatsTitle = GetSetting(settings, "about.catsTitle", "Categorías con las que abastecemos"),
            AboutPolicyKicker = GetSetting(settings, "about.policyKicker", "Políticas comerciales"),
            AboutPolicyTitle = GetSetting(settings, "about.policyTitle", "Condiciones claras desde el primer contacto"),
            Politicas = GetSetting(settings, "politicas", ""),
            AboutPolicyPoints = GetSetting(settings, "about.policyPoints", "Precios estimados sujetos a stock y logística\nPedido confirmado por WhatsApp\nEntrega o retiro a coordinar\nAsesoramiento en cantidades y rendimiento"),
            AboutCtaTitle = GetSetting(settings, "about.ctaTitle", "¿Arrancamos tu próximo pedido?"),
            AboutCtaText = GetSetting(settings, "about.ctaText", "Recorré el catálogo, armá el carrito y enviá todo por WhatsApp en un solo paso."),
            AboutCtaPrimary = GetSetting(settings, "about.ctaPrimary", "Ir al catálogo"),
            AboutCtaSecondary = GetSetting(settings, "about.ctaSecondary", "Hablar con comercial"),
            LastPublishedUtc = GetSetting(settings, "sync.lastPublishedUtc", null),
            SyncEndpoint = _configuration["WebIntegration:PublicSiteSyncUrl"],
            SyncConfigured = !string.IsNullOrWhiteSpace(ResolveSyncSecret())
                && !string.IsNullOrWhiteSpace(_configuration["WebIntegration:PublicSiteSyncUrl"]),
            Categories = categories,
            Banners = banners,
            HomeHeroSlides = heroSlides.Where(x => x.Placement == "home").ToList(),
            CatalogHeroSlides = heroSlides.Where(x => x.Placement == "catalog").ToList(),
            Products = selectedProducts,
            AutoEditProductId = editProduct,
            AvailableProducts = products.Where(p => !publications.ContainsKey(p.Id)).Select(p =>
            {
                return new WebProductOptionViewModel
                {
                    ProductId = p.Id,
                    Name = p.Descripcion,
                    Category = p.IdCategoriaNavigation?.Nombre ?? "Sin categoría",
                    Unit = p.IdUnidadDeMedidaNavigation?.Nombre ?? "Unidad",
                    DefaultPrice = p.PVenta
                };
            }).ToList()
        };

        WebSiteContentContract.ApplyToViewModel(model, (key, fallback) => GetSetting(settings, key, fallback)!);
        if (model.HomeHeroSlides.FirstOrDefault()?.PreviewUrl is { Length: > 0 } homeHero)
            model.HeroImageUrl = homeHero;
        if (model.CatalogHeroSlides.FirstOrDefault()?.PreviewUrl is { Length: > 0 } catalogHero)
            model.CatalogHeroImageUrl = catalogHero;
        return View(model);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveSettings(WebManagementViewModel model, CancellationToken ct)
    {
        await UpsertSettingAsync("site.name", model.SiteName, ct);
        await UpsertSettingAsync("nav.homeLabel", model.NavHomeLabel, ct);
        await UpsertSettingAsync("nav.catalogLabel", model.NavCatalogLabel, ct);
        await UpsertSettingAsync("nav.aboutLabel", model.NavAboutLabel, ct);
        await UpsertSettingAsync("nav.quoteLabel", model.NavQuoteLabel, ct);
        await UpsertSettingAsync("hero.pill", model.HeroPill, ct);
        await UpsertSettingAsync("hero.title", model.HeroTitle, ct);
        await UpsertSettingAsync("hero.text", model.HeroText, ct);
        await UpsertSettingAsync("home.audienceTitle", model.AudienceTitle, ct);
        await UpsertSettingAsync("home.audienceItems", model.AudienceItems, ct);
        await UpsertSettingAsync("home.audienceNote", model.AudienceNote, ct);
        await UpsertSettingAsync("home.categoriesTitle", model.CategoriesTitle, ct);
        await UpsertSettingAsync("home.categoriesText", model.CategoriesText, ct);
        await UpsertSettingAsync("home.featuredTitle", model.FeaturedTitle, ct);
        await UpsertSettingAsync("home.featuredText", model.FeaturedText, ct);
        await UpsertSettingAsync("home.offersTitle", model.HomeOffersTitle, ct);
        await UpsertSettingAsync("home.offersText", model.HomeOffersText, ct);
        await UpsertSettingAsync("home.benefitsTitle", model.HomeBenefitsTitle, ct);
        await UpsertSettingAsync("home.benefitsText", model.HomeBenefitsText, ct);
        await UpsertSettingAsync("home.benefitsItems", model.HomeBenefitsItems, ct);
        await UpsertSettingAsync("home.stepsTitle", model.HomeStepsTitle, ct);
        await UpsertSettingAsync("home.stepsText", model.HomeStepsText, ct);
        await UpsertSettingAsync("home.stepsItems", model.HomeStepsItems, ct);
        await UpsertSettingAsync("home.ctaTitle", model.HomeCtaTitle, ct);
        await UpsertSettingAsync("home.ctaText", model.HomeCtaText, ct);
        await UpsertSettingAsync("home.offersColor", model.HomeOffersColor, ct);
        await UpsertSettingAsync("home.offersTextColor", model.HomeOffersTextColor, ct);
        await UpsertSettingAsync("home.productsColor", model.HomeProductsColor, ct);
        await UpsertSettingAsync("home.productsTextColor", model.HomeProductsTextColor, ct);
        await UpsertSettingAsync("home.categoriesColor", model.HomeCategoriesColor, ct);
        await UpsertSettingAsync("home.categoriesTextColor", model.HomeCategoriesTextColor, ct);
        await UpsertSettingAsync("home.ctaColor", model.HomeCtaColor, ct);
        await UpsertSettingAsync("home.ctaTextColor", model.HomeCtaTextColor, ct);
        await UpsertSettingAsync("home.benefitsColor", model.HomeBenefitsColor, ct);
        await UpsertSettingAsync("home.benefitsTextColor", model.HomeBenefitsTextColor, ct);
        await UpsertSettingAsync("footer.description", model.FooterDescription, ct);
        await UpsertSettingAsync("footer.exploreTitle", model.FooterExploreTitle, ct);
        await UpsertSettingAsync("footer.catalogLabel", model.FooterCatalogLabel, ct);
        await UpsertSettingAsync("footer.aboutLabel", model.FooterAboutLabel, ct);
        await UpsertSettingAsync("footer.contactLabel", model.FooterContactLabel, ct);
        await UpsertSettingAsync("footer.commercialTitle", model.FooterCommercialTitle, ct);
        await UpsertSettingAsync("footer.commercialText", model.FooterCommercialText, ct);
        await UpsertSettingAsync("theme.primaryColor", model.PrimaryColor, ct);
        await UpsertSettingAsync("theme.accentColor", model.AccentColor, ct);
        await UpsertSettingAsync("contact.whatsapp", model.WhatsAppNumber, ct);
        await UpsertSettingAsync("about.kicker", model.AboutKicker, ct);
        await UpsertSettingAsync("about.heroTitle", model.AboutHeroTitle, ct);
        await UpsertSettingAsync("about.heroText", model.AboutHeroText, ct);
        await UpsertSettingAsync("about.badgeText", model.AboutBadgeText, ct);
        await UpsertSettingAsync("about.storyKicker", model.AboutStoryKicker, ct);
        await UpsertSettingAsync("about.storyTitle", model.AboutStoryTitle, ct);
        await UpsertSettingAsync("about.storyFloatTitle", model.AboutStoryFloatTitle, ct);
        await UpsertSettingAsync("about.storyFloatText", model.AboutStoryFloatText, ct);
        await UpsertSettingAsync("about.checklist", model.AboutChecklist, ct);
        await UpsertSettingAsync("historia", model.Historia, ct);
        await UpsertSettingAsync("about.misionTitle", model.AboutMisionTitle, ct);
        await UpsertSettingAsync("mision", model.Mision, ct);
        await UpsertSettingAsync("about.visionTitle", model.AboutVisionTitle, ct);
        await UpsertSettingAsync("vision", model.Vision, ct);
        await UpsertSettingAsync("about.pillarsKicker", model.AboutPillarsKicker, ct);
        await UpsertSettingAsync("about.pillarsTitle", model.AboutPillarsTitle, ct);
        await UpsertSettingAsync("about.pillar1Title", model.AboutPillar1Title, ct);
        await UpsertSettingAsync("about.pillar1Text", model.AboutPillar1Text, ct);
        await UpsertSettingAsync("about.pillar2Title", model.AboutPillar2Title, ct);
        await UpsertSettingAsync("about.pillar2Text", model.AboutPillar2Text, ct);
        await UpsertSettingAsync("about.pillar3Title", model.AboutPillar3Title, ct);
        await UpsertSettingAsync("about.pillar3Text", model.AboutPillar3Text, ct);
        await UpsertSettingAsync("about.catsKicker", model.AboutCatsKicker, ct);
        await UpsertSettingAsync("about.catsTitle", model.AboutCatsTitle, ct);
        await UpsertSettingAsync("about.policyKicker", model.AboutPolicyKicker, ct);
        await UpsertSettingAsync("about.policyTitle", model.AboutPolicyTitle, ct);
        await UpsertSettingAsync("politicas", model.Politicas, ct);
        await UpsertSettingAsync("about.policyPoints", model.AboutPolicyPoints, ct);
        await UpsertSettingAsync("about.ctaTitle", model.AboutCtaTitle, ct);
        await UpsertSettingAsync("about.ctaText", model.AboutCtaText, ct);
        await UpsertSettingAsync("about.ctaPrimary", model.AboutCtaPrimary, ct);
        await UpsertSettingAsync("about.ctaSecondary", model.AboutCtaSecondary, ct);
        foreach (var (key, value) in WebSiteContentContract.ReadFromViewModel(model))
            await UpsertSettingAsync(key, value, ct);
        await _db.SaveChangesAsync(ct);

        if (Request.Headers.XRequestedWith == "XMLHttpRequest")
            return Json(new { ok = true, message = "Configuración guardada. Presioná Publicar para reflejarla en la Web." });

        TempData["WebMessage"] = "Configuración guardada. Presioná Publicar para reflejarla en la Web.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveSiteMedia(IFormFile? HeroImageFile, IFormFile? AboutStoryImageFile, IFormFile? CatalogHeroImageFile, CancellationToken ct)
    {
        async Task<bool> SaveAsync(IFormFile? file, string assetKey, string settingKey)
        {
            if (file is null || file.Length == 0) return true;
            if (!IsValidImage(file)) return false;

            var directory = GetAssetDirectory(assetKey);
            Directory.CreateDirectory(directory);
            foreach (var old in Directory.EnumerateFiles(directory))
                System.IO.File.Delete(old);

            var storedName = $"{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";
            await using var stream = System.IO.File.Create(Path.Combine(directory, storedName));
            await file.CopyToAsync(stream, ct);
            await UpsertSettingAsync(settingKey, $"/uploads/web-assets/{assetKey}/{storedName}", ct);
            return true;
        }

        if (!await SaveAsync(HeroImageFile, "hero", "media.heroImage")
            || !await SaveAsync(AboutStoryImageFile, "about-story", "media.aboutStoryImage")
            || !await SaveAsync(CatalogHeroImageFile, "catalog-hero", "media.catalogHeroImage"))
        {
            if (Request.Headers.XRequestedWith == "XMLHttpRequest")
                return BadRequest(new { ok = false, message = "Las fotos del sitio admiten JPG, PNG o WebP de hasta 5 MB." });

            TempData["WebError"] = "Las fotos del sitio admiten JPG, PNG o WebP de hasta 5 MB.";
            return RedirectToAction(nameof(Index));
        }

        await _db.SaveChangesAsync(ct);
        if (Request.Headers.XRequestedWith == "XMLHttpRequest")
            return Json(new { ok = true, message = "Imágenes del sitio guardadas. Publicá para verlas en la Web." });

        TempData["WebMessage"] = "Imágenes del sitio guardadas. Publicá para verlas en la Web.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AddCategory([FromForm] AddWebCategoryRequest request, CancellationToken ct)
    {
        var name = request?.CategoryName?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            TempData["WebError"] = "Escribí un nombre para la categoría.";
            return RedirectToAction(nameof(Index));
        }

        try
        {
            var exists = await _db.ProductosCategorias
                .AnyAsync(x => x.Nombre.ToLower() == name.ToLower(), ct);
            if (exists)
            {
                TempData["WebError"] = $"La categoría “{name}” ya existe.";
                return RedirectToAction(nameof(Index));
            }

            _db.ProductosCategorias.Add(new ProductosCategoria { Nombre = name });
            await _db.SaveChangesAsync(ct);

            TempData["WebMessage"] = $"Categoría “{name}” creada. Ya podés asignarla a tus productos.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "No se pudo crear la categoría web {CategoryName}", name);
            TempData["WebError"] = "No se pudo crear la categoría. Probá de nuevo.";
        }

        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateCategory(UpdateWebCategoryRequest request, CancellationToken ct)
    {
        var name = request.CategoryName?.Trim();
        if (request.CategoryId <= 0 || string.IsNullOrWhiteSpace(name))
        {
            TempData["WebError"] = "Escribí un nombre para la categoría.";
            return RedirectToAction(nameof(Index));
        }

        var category = await _db.ProductosCategorias.FirstOrDefaultAsync(x => x.Id == request.CategoryId, ct);
        if (category is null) return NotFound();

        var duplicate = await _db.ProductosCategorias
            .AnyAsync(x => x.Id != request.CategoryId && x.Nombre.ToLower() == name.ToLower(), ct);
        if (duplicate)
        {
            TempData["WebError"] = $"La categoría “{name}” ya existe.";
            return RedirectToAction(nameof(Index));
        }

        category.Nombre = name;
        await _db.SaveChangesAsync(ct);
        TempData["WebMessage"] = $"Categoría actualizada a “{name}”. Publicá los cambios para reflejarla en la Web.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteCategory(int categoryId, CancellationToken ct)
    {
        var category = await _db.ProductosCategorias
            .Include(x => x.Productos)
            .FirstOrDefaultAsync(x => x.Id == categoryId, ct);
        if (category is null) return RedirectToAction(nameof(Index));

        // La clave es nullable: los productos conservan su información y quedan sin categoría.
        foreach (var product in category.Productos)
            product.IdCategoria = null;

        var categoryName = category.Nombre;
        _db.ProductosCategorias.Remove(category);
        await _db.SaveChangesAsync(ct);

        TempData["WebMessage"] = $"Categoría “{categoryName}” eliminada. Sus productos quedaron sin categoría.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(40 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 40 * 1024 * 1024)]
    public async Task<IActionResult> AddProduct(AddWebProductRequest request, CancellationToken ct)
    {
        var product = await _db.Productos.FindAsync([request.ProductId], ct);
        if (product is null || (product.Activo is not null && product.Activo != 1))
            return NotFound();

        var alreadyAdded = await _db.WebProductosPublicados
            .AnyAsync(x => x.IdProducto == request.ProductId, ct);
        if (alreadyAdded)
        {
            TempData["WebError"] = "Ese producto ya está en tu catálogo web.";
            return RedirectToAction(nameof(Index));
        }

        _db.WebProductosPublicados.Add(new WebProductoPublicado
        {
            IdProducto = product.Id,
            Publicado = true,
            PrecioPublico = request.PublicPrice ?? product.PVenta,
            PrecioLista = request.ListPrice,
            DescuentoPorcentaje = request.DiscountPercent,
            EtiquetaOferta = request.OfferLabel?.Trim(),
            EnOferta = request.IsOnOffer || request.DiscountPercent > 0 || (request.ListPrice.HasValue && request.ListPrice > (request.PublicPrice ?? product.PVenta)),
            Destacado = request.Featured,
            Orden = request.SortOrder,
            Slug = Slugify(product.Descripcion),
            DescripcionPublica = string.IsNullOrWhiteSpace(request.PublicDescription)
                ? product.Descripcion
                : request.PublicDescription.Trim(),
            FechaActualizacionUtc = DateTime.UtcNow
        });

        if (request.CategoryId.HasValue)
        {
            var categoryExists = await _db.ProductosCategorias.AnyAsync(x => x.Id == request.CategoryId, ct);
            if (categoryExists) product.IdCategoria = request.CategoryId;
        }

        var uploads = request.ImageFiles?.Where(x => x.Length > 0).ToList() ?? [];
        if (uploads.Count > 4 || uploads.Any(x => !IsValidImage(x)))
        {
            TempData["WebError"] = "Podés cargar hasta 4 imágenes JPG, PNG o WebP de hasta 5 MB.";
            return RedirectToAction(nameof(Index));
        }

        var publication = _db.WebProductosPublicados.Local.Single(x => x.IdProducto == product.Id);
        var images = new List<WebStagedImage>();
        foreach (var upload in uploads)
        {
            var extension = Path.GetExtension(upload.FileName).ToLowerInvariant();
            var storedName = $"{Guid.NewGuid():N}{extension}";
            var directory = GetStagingDirectory(product.Id);
            Directory.CreateDirectory(directory);
            await using var stream = System.IO.File.Create(Path.Combine(directory, storedName));
            await upload.CopyToAsync(stream, ct);
            images.Add(new WebStagedImage { FileName = storedName, OriginalFileName = Path.GetFileName(upload.FileName) });
        }
        publication.ImagenesJson = JsonSerializer.Serialize(images);
        try
        {
            publication.Modelo3dUrl = await ResolveModel3dAsync(product.Id, request.Model3dFile, removeExisting: false, ct);
        }
        catch (InvalidDataException ex)
        {
            TempData["WebError"] = ex.Message;
            return RedirectToAction(nameof(Index));
        }
        await _db.SaveChangesAsync(ct);

        TempData["WebMessage"] = $"“{product.Descripcion}” se agregó al catálogo web.";
        return RedirectToAction(nameof(Index), new { editProduct = product.Id });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(40 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 40 * 1024 * 1024)]
    public async Task<IActionResult> SaveProduct(WebProductUpdateRequest request, CancellationToken ct)
    {
        var product = await _db.Productos.FindAsync([request.ProductId], ct);
        if (product is null) return NotFound();

        var publication = await _db.WebProductosPublicados
            .FirstOrDefaultAsync(x => x.IdProducto == request.ProductId, ct);

        if (publication is null)
        {
            publication = new WebProductoPublicado { IdProducto = request.ProductId };
            _db.WebProductosPublicados.Add(publication);
        }

        if (request.CategoryId.HasValue && request.CategoryId != product.IdCategoria)
        {
            var categoryExists = await _db.ProductosCategorias.AnyAsync(x => x.Id == request.CategoryId, ct);
            if (categoryExists) product.IdCategoria = request.CategoryId;
        }

        publication.Publicado = request.Published;
        publication.PrecioPublico = request.PublicPrice;
        publication.PrecioLista = request.ListPrice;
        publication.DescuentoPorcentaje = request.DiscountPercent;
        publication.EtiquetaOferta = request.OfferLabel?.Trim();
        publication.EnOferta = request.IsOnOffer
            || (request.DiscountPercent ?? 0) > 0
            || (request.ListPrice.HasValue && request.PublicPrice.HasValue && request.ListPrice > request.PublicPrice);
        publication.Destacado = request.Featured;
        publication.Orden = request.SortOrder;
        publication.Slug = Slugify(product.Descripcion);
        publication.DescripcionPublica = string.IsNullOrWhiteSpace(request.PublicDescription)
            ? product.Descripcion
            : request.PublicDescription.Trim();
        var images = ReadStagedImageMetadata(publication.ImagenesJson);
        var removed = request.RemoveImages?.ToHashSet(StringComparer.OrdinalIgnoreCase) ?? [];
        foreach (var image in images.Where(x => removed.Contains(x.FileName)).ToList())
        {
            DeleteStagedFile(product.Id, image.FileName);
            images.Remove(image);
        }

        var uploads = request.ImageFiles?.Where(x => x.Length > 0).ToList() ?? [];
        if (images.Count + uploads.Count > 4)
        {
            TempData["WebError"] = "Cada producto admite un máximo de 4 imágenes.";
            return RedirectToAction(nameof(Index));
        }

        foreach (var upload in uploads)
        {
            if (!IsValidImage(upload))
            {
                TempData["WebError"] = "Solo se permiten imágenes JPG, PNG o WebP de hasta 5 MB.";
                return RedirectToAction(nameof(Index));
            }

            var extension = Path.GetExtension(upload.FileName).ToLowerInvariant();
            var storedName = $"{Guid.NewGuid():N}{extension}";
            var directory = GetStagingDirectory(product.Id);
            Directory.CreateDirectory(directory);
            await using var stream = System.IO.File.Create(Path.Combine(directory, storedName));
            await upload.CopyToAsync(stream, ct);
            images.Add(new WebStagedImage { FileName = storedName, OriginalFileName = Path.GetFileName(upload.FileName) });
        }

        publication.ImagenesJson = JsonSerializer.Serialize(images);
        try
        {
            publication.Modelo3dUrl = await ResolveModel3dAsync(
                product.Id,
                request.Model3dFile,
                request.RemoveModel3d,
                ct);
        }
        catch (InvalidDataException ex)
        {
            TempData["WebError"] = ex.Message;
            return RedirectToAction(nameof(Index));
        }
        publication.FechaActualizacionUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        TempData["WebMessage"] = "Producto web guardado. Publicá los cambios cuando termines.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteProduct(int productId, CancellationToken ct)
    {
        var publication = await _db.WebProductosPublicados
            .FirstOrDefaultAsync(x => x.IdProducto == productId, ct);
        if (publication is null) return RedirectToAction(nameof(Index));

        _db.WebProductosPublicados.Remove(publication);
        await _db.SaveChangesAsync(ct);

        var folder = GetStagingDirectory(productId);
        if (Directory.Exists(folder)) Directory.Delete(folder, recursive: true);

        TempData["WebMessage"] = "Producto quitado del catálogo web. Publicá los cambios para retirarlo de la Web.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveBanner(WebBannerUpsertRequest request, CancellationToken ct)
    {
        var title = request.Title?.Trim() ?? string.Empty;

        WebBanner banner;
        if (request.Id is > 0)
        {
            banner = await _db.WebBanners.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
                ?? new WebBanner();
            if (banner.Id == 0) _db.WebBanners.Add(banner);
        }
        else
        {
            banner = new WebBanner();
            _db.WebBanners.Add(banner);
        }

        banner.Titulo = title;
        banner.Subtitulo = request.Subtitle?.Trim();
        banner.LinkUrl = request.LinkUrl?.Trim();
        banner.CtaLabel = request.CtaLabel?.Trim();
        banner.Orden = request.SortOrder;
        banner.Activo = request.Active;
        banner.MostrarInicio = request.ShowOnHome;
        banner.MostrarCatalogo = request.ShowOnCatalog;
        banner.FechaActualizacionUtc = DateTime.UtcNow;

        if (request.ImageFile is { Length: > 0 })
        {
            if (!IsValidImage(request.ImageFile))
            {
                TempData["WebError"] = "El banner admite JPG, PNG o WebP de hasta 5 MB.";
                return RedirectToAction(nameof(Index));
            }

            await _db.SaveChangesAsync(ct);
            var extension = Path.GetExtension(request.ImageFile.FileName).ToLowerInvariant();
            var storedName = $"{Guid.NewGuid():N}{extension}";
            var directory = GetBannerDirectory(banner.Id);
            Directory.CreateDirectory(directory);
            if (!string.IsNullOrWhiteSpace(banner.ImagenFileName))
            {
                var old = Path.Combine(directory, Path.GetFileName(banner.ImagenFileName));
                if (System.IO.File.Exists(old)) System.IO.File.Delete(old);
            }
            await using var stream = System.IO.File.Create(Path.Combine(directory, storedName));
            await request.ImageFile.CopyToAsync(stream, ct);
            banner.ImagenFileName = storedName;
            banner.ImagenOriginal = Path.GetFileName(request.ImageFile.FileName);
        }
        else if (banner.Id == 0 || string.IsNullOrWhiteSpace(banner.ImagenFileName))
        {
            TempData["WebError"] = "Subí una imagen para el banner.";
            return RedirectToAction(nameof(Index));
        }

        await _db.SaveChangesAsync(ct);
        TempData["WebMessage"] = "Banner guardado. Publicá para verlo en la Web.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteBanner(int bannerId, CancellationToken ct)
    {
        var banner = await _db.WebBanners.FirstOrDefaultAsync(x => x.Id == bannerId, ct);
        if (banner is null) return RedirectToAction(nameof(Index));

        var folder = GetBannerDirectory(banner.Id);
        _db.WebBanners.Remove(banner);
        await _db.SaveChangesAsync(ct);
        if (Directory.Exists(folder)) Directory.Delete(folder, recursive: true);

        TempData["WebMessage"] = "Banner eliminado. Publicá para retirarlo de la Web.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AddHeroSlides(string placement, List<IFormFile>? files, CancellationToken ct)
    {
        placement = NormalizeHeroPlacement(placement);
        var tab = placement == "catalog" ? "catalog" : "home";
        var valid = (files ?? []).Where(IsValidImage).ToList();
        if (valid.Count == 0)
        {
            TempData["WebError"] = "Subí JPG, PNG o WebP de hasta 5 MB.";
            return RedirectToWeb(tab);
        }

        var currentCount = await _db.WebHeroSlides.CountAsync(x => x.Placement == placement, ct);
        var remaining = MaxHeroSlidesPerPlacement - currentCount;
        if (remaining <= 0)
        {
            TempData["WebError"] = "Podés cargar hasta 8 fotos en cada carrusel.";
            return RedirectToWeb(tab);
        }

        var nextOrder = await _db.WebHeroSlides
            .Where(x => x.Placement == placement)
            .MaxAsync(x => (int?)x.Orden, ct) ?? -1;

        var added = 0;
        foreach (var file in valid.Take(remaining))
        {
            var slide = new WebHeroSlide
            {
                Placement = placement,
                Orden = ++nextOrder,
                Activo = true,
                FechaActualizacionUtc = DateTime.UtcNow
            };
            _db.WebHeroSlides.Add(slide);
            await _db.SaveChangesAsync(ct);

            var storedName = $"{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";
            var directory = GetHeroSlideDirectory(slide.Id);
            Directory.CreateDirectory(directory);
            await using (var stream = System.IO.File.Create(Path.Combine(directory, storedName)))
                await file.CopyToAsync(stream, ct);

            slide.ImagenFileName = storedName;
            slide.ImagenOriginal = Path.GetFileName(file.FileName);
            added++;
        }

        await SyncLegacyHeroSettingAsync(placement, ct);
        await _db.SaveChangesAsync(ct);
        TempData["WebMessage"] = added == 1
            ? "Foto agregada al carrusel. Publicá para verla en la Web."
            : $"{added} fotos agregadas al carrusel. Publicá para verlas en la Web.";
        return RedirectToWeb(tab);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ReorderHeroSlide(int slideId, string direction, CancellationToken ct)
    {
        var slide = await _db.WebHeroSlides.FirstOrDefaultAsync(x => x.Id == slideId, ct);
        if (slide is null) return RedirectToAction(nameof(Index));

        var tab = slide.Placement == "catalog" ? "catalog" : "home";
        var siblings = await _db.WebHeroSlides
            .Where(x => x.Placement == slide.Placement)
            .OrderBy(x => x.Orden)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);
        var index = siblings.FindIndex(x => x.Id == slide.Id);
        var target = string.Equals(direction, "up", StringComparison.OrdinalIgnoreCase) ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= siblings.Count)
            return RedirectToWeb(tab);

        (siblings[index], siblings[target]) = (siblings[target], siblings[index]);
        for (var i = 0; i < siblings.Count; i++)
        {
            siblings[i].Orden = i;
            siblings[i].FechaActualizacionUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        await SyncLegacyHeroSettingAsync(slide.Placement, ct);
        await _db.SaveChangesAsync(ct);
        return RedirectToWeb(tab);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteHeroSlide(int slideId, CancellationToken ct)
    {
        var slide = await _db.WebHeroSlides.FirstOrDefaultAsync(x => x.Id == slideId, ct);
        if (slide is null) return RedirectToAction(nameof(Index));

        var tab = slide.Placement == "catalog" ? "catalog" : "home";
        var placement = slide.Placement;
        var folder = GetHeroSlideDirectory(slide.Id);
        _db.WebHeroSlides.Remove(slide);
        await _db.SaveChangesAsync(ct);
        if (Directory.Exists(folder)) Directory.Delete(folder, recursive: true);

        await SyncLegacyHeroSettingAsync(placement, ct);
        await _db.SaveChangesAsync(ct);
        TempData["WebMessage"] = "Foto quitada del carrusel. Publicá para actualizar la Web.";
        return RedirectToWeb(tab);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Publish(CancellationToken ct)
    {
        var secret = ResolveSyncSecret();
        var endpoint = _configuration["WebIntegration:PublicSiteSyncUrl"];

        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(endpoint))
        {
            if (Request.Headers.XRequestedWith == "XMLHttpRequest")
                return BadRequest(new { ok = false, message = "Falta configurar AGS_WEB_SYNC_SECRET o WebIntegration:PublicSiteSyncUrl en el servidor de Gestión." });

            TempData["WebError"] = "Falta configurar AGS_WEB_SYNC_SECRET o WebIntegration:PublicSiteSyncUrl en el servidor de Gestión.";
            return RedirectToAction(nameof(Index));
        }

        var snapshot = await BuildSnapshotAsync(ct);
        var json = JsonSerializer.Serialize(snapshot, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        var signature = Sign(secret, $"{timestamp}.{json}");

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            request.Headers.Add("X-AGS-Timestamp", timestamp);
            request.Headers.Add("X-AGS-Signature", signature);

            var response = await _httpClientFactory.CreateClient("AgsWebSync").SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("La publicación web fue rechazada. Status: {StatusCode}", response.StatusCode);
                if (Request.Headers.XRequestedWith == "XMLHttpRequest")
                    return BadRequest(new { ok = false, message = "La Web rechazó la publicación. Revisá el endpoint, secreto y logs." });

                TempData["WebError"] = "La Web rechazó la publicación. Revisá el endpoint, secreto y logs.";
                return RedirectToAction(nameof(Index));
            }

            await UpsertSettingAsync("sync.lastPublishedUtc", DateTime.UtcNow.ToString("O"), ct);
            await _db.SaveChangesAsync(ct);
            if (Request.Headers.XRequestedWith == "XMLHttpRequest")
                return Json(new { ok = true, message = "Publicación enviada correctamente. La Web ya refleja el catálogo y la configuración." });

            TempData["WebMessage"] = "Publicación enviada correctamente. La Web ya refleja el catálogo y la configuración.";
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "No se pudo conectar con la Web pública para publicar catálogo.");
            if (Request.Headers.XRequestedWith == "XMLHttpRequest")
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { ok = false, message = "No se pudo conectar con la Web. No se publicaron cambios." });

            TempData["WebError"] = "No se pudo conectar con la Web. No se publicaron cambios.";
        }

        return RedirectToAction(nameof(Index));
    }

    private const string DefaultAudienceItems =
        "Corralones que reponen stock para reventa\nConstructoras que arrancan obra\nDesarrolladoras con compras por partida";

    private string? ResolveSyncSecret()
    {
        var fromConfig = _configuration["WebIntegration:SyncSecret"];
        if (!string.IsNullOrWhiteSpace(fromConfig)) return fromConfig;

        var variableName = _configuration["WebIntegration:SyncSecretEnvironmentVariable"];
        if (string.IsNullOrWhiteSpace(variableName)) variableName = "AGS_WEB_SYNC_SECRET";
        return Environment.GetEnvironmentVariable(variableName);
    }

    private async Task<WebCatalogSnapshot> BuildSnapshotAsync(CancellationToken ct)
    {
        var settings = await ReadSettingsAsync(ct);
        var publications = await _db.WebProductosPublicados.AsNoTracking()
            .Where(x => x.Publicado)
            .Include(x => x.IdProductoNavigation!)
                .ThenInclude(x => x.IdCategoriaNavigation)
            .Include(x => x.IdProductoNavigation!)
                .ThenInclude(x => x.IdUnidadDeMedidaNavigation)
            .OrderBy(x => x.Orden)
            .ToListAsync(ct);

        var snapshot = new WebCatalogSnapshot
        {
            PublishedAtUtc = DateTime.UtcNow,
            Settings = settings
                .Where(x => !x.Key.StartsWith("sync.", StringComparison.Ordinal))
                .ToDictionary(x => x.Key, x => x.Value)
        };

        // Garantiza que todas las claves del contrato viajen en la publicación,
        // aunque todavía no se hayan guardado desde el editor.
        foreach (var (key, value) in WebSiteContentContract.Defaults)
        {
            if (!snapshot.Settings.ContainsKey(key))
                snapshot.Settings[key] = value;
        }

        foreach (var publication in publications)
        {
            var product = publication.IdProductoNavigation!;
            var images = new List<WebCatalogImage>();
            foreach (var image in ReadStagedImageMetadata(publication.ImagenesJson))
            {
                var path = Path.Combine(GetStagingDirectory(product.Id), image.FileName);
                if (!System.IO.File.Exists(path)) continue;
                var bytes = await System.IO.File.ReadAllBytesAsync(path, ct);
                images.Add(new WebCatalogImage
                {
                    FileName = image.OriginalFileName,
                    ContentBase64 = Convert.ToBase64String(bytes)
                });
            }

            var model3d = await BuildModel3dPayloadAsync(publication.IdProducto, publication.Modelo3dUrl, ct);

            snapshot.Products.Add(new WebCatalogProduct
            {
                ExternalId = publication.IdProducto,
                Name = product.Descripcion,
                Category = product.IdCategoriaNavigation?.Nombre ?? "Otros",
                Unit = product.IdUnidadDeMedidaNavigation?.Nombre ?? "Unidad",
                Price = publication.PrecioPublico ?? product.PVenta,
                ListPrice = publication.PrecioLista,
                DiscountPercent = publication.DescuentoPorcentaje,
                OfferLabel = publication.EtiquetaOferta,
                IsOnOffer = publication.EnOferta,
                Slug = publication.Slug ?? Slugify(product.Descripcion),
                Description = publication.DescripcionPublica ?? product.Descripcion,
                Images = images,
                Model3dUrl = model3d.Url,
                Model3dFile = model3d.File,
                Featured = publication.Destacado,
                SortOrder = publication.Orden
            });
        }

        var banners = await _db.WebBanners.AsNoTracking()
            .Where(x => x.Activo)
            .OrderBy(x => x.Orden)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);

        foreach (var banner in banners)
        {
            if (string.IsNullOrWhiteSpace(banner.ImagenFileName)) continue;
            var path = Path.Combine(GetBannerDirectory(banner.Id), banner.ImagenFileName);
            if (!System.IO.File.Exists(path)) continue;
            var bytes = await System.IO.File.ReadAllBytesAsync(path, ct);
            snapshot.Banners.Add(new WebCatalogBanner
            {
                ExternalId = banner.Id,
                Title = banner.Titulo,
                Subtitle = banner.Subtitulo,
                LinkUrl = banner.LinkUrl,
                CtaLabel = banner.CtaLabel,
                SortOrder = banner.Orden,
                IsActive = banner.Activo,
                ShowOnHome = banner.MostrarInicio,
                ShowOnCatalog = banner.MostrarCatalogo,
                Image = new WebCatalogImage
                {
                    FileName = banner.ImagenOriginal ?? banner.ImagenFileName,
                    ContentBase64 = Convert.ToBase64String(bytes)
                }
            });
        }

        var heroSlides = await _db.WebHeroSlides.AsNoTracking()
            .Where(x => x.Activo)
            .OrderBy(x => x.Placement)
            .ThenBy(x => x.Orden)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);

        foreach (var slide in heroSlides)
        {
            if (string.IsNullOrWhiteSpace(slide.ImagenFileName)) continue;
            var path = Path.Combine(GetHeroSlideDirectory(slide.Id), slide.ImagenFileName);
            if (!System.IO.File.Exists(path)) continue;
            var bytes = await System.IO.File.ReadAllBytesAsync(path, ct);
            snapshot.HeroSlides.Add(new WebCatalogHeroSlide
            {
                ExternalId = slide.Id,
                Placement = slide.Placement,
                SortOrder = slide.Orden,
                IsActive = slide.Activo,
                Image = new WebCatalogImage
                {
                    FileName = slide.ImagenOriginal ?? slide.ImagenFileName,
                    ContentBase64 = Convert.ToBase64String(bytes)
                }
            });
        }

        await AddSnapshotAssetAsync(snapshot, "hero", GetSetting(settings, "media.heroImage", "/uploads/web-assets/defaults/hero.jpg"), ct);
        await AddSnapshotAssetAsync(snapshot, "about-story", GetSetting(settings, "media.aboutStoryImage", "/uploads/web-assets/defaults/about-story.jpg"), ct);
        await AddSnapshotAssetAsync(snapshot, "catalog-hero", GetSetting(settings, "media.catalogHeroImage", "/uploads/web-assets/defaults/catalog-hero.jpg"), ct);

        return snapshot;
    }

    private async Task AddSnapshotAssetAsync(WebCatalogSnapshot snapshot, string key, string url, CancellationToken ct)
    {
        var relative = url.TrimStart('~', '/').Replace('/', Path.DirectorySeparatorChar);
        var path = Path.Combine(_environment.WebRootPath, relative);
        if (!System.IO.File.Exists(path)) return;
        var bytes = await System.IO.File.ReadAllBytesAsync(path, ct);
        snapshot.Assets.Add(new WebCatalogAsset
        {
            Key = key,
            FileName = Path.GetFileName(path),
            ContentBase64 = Convert.ToBase64String(bytes)
        });
    }

    private List<WebStagedImage> ReadStagedImageMetadata(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<WebStagedImage>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private List<WebProductImageViewModel> ReadStagedImages(string? json, int productId) =>
        ReadStagedImageMetadata(json).Take(4).Select(x => new WebProductImageViewModel
        {
            FileName = x.FileName,
            OriginalFileName = x.OriginalFileName,
            PreviewUrl = $"/uploads/web-products/{productId}/{Uri.EscapeDataString(x.FileName)}"
        }).ToList();

    private string GetStagingDirectory(int productId) =>
        Path.Combine(_environment.WebRootPath, "uploads", "web-products", productId.ToString(CultureInfo.InvariantCulture));

    private string GetBannerDirectory(int bannerId) =>
        Path.Combine(_environment.WebRootPath, "uploads", "web-banners", bannerId.ToString(CultureInfo.InvariantCulture));

    private string GetHeroSlideDirectory(int slideId) =>
        Path.Combine(_environment.WebRootPath, "uploads", "web-hero", slideId.ToString(CultureInfo.InvariantCulture));

    private const int MaxHeroSlidesPerPlacement = 8;

    private static string NormalizeHeroPlacement(string? placement) =>
        string.Equals(placement, "catalog", StringComparison.OrdinalIgnoreCase) ? "catalog" : "home";

    private IActionResult RedirectToWeb(string tab)
    {
        TempData["WebTab"] = tab;
        return RedirectToAction(nameof(Index));
    }

    private async Task SyncLegacyHeroSettingAsync(string placement, CancellationToken ct)
    {
        var first = await _db.WebHeroSlides.AsNoTracking()
            .Where(x => x.Placement == placement && x.Activo && x.ImagenFileName != null)
            .OrderBy(x => x.Orden)
            .ThenBy(x => x.Id)
            .FirstOrDefaultAsync(ct);
        if (first?.ImagenFileName is null) return;

        var url = $"/uploads/web-hero/{first.Id}/{Uri.EscapeDataString(first.ImagenFileName)}";
        var key = placement == "catalog" ? "media.catalogHeroImage" : "media.heroImage";
        await UpsertSettingAsync(key, url, ct);
    }

    private string GetAssetDirectory(string key) =>
        Path.Combine(_environment.WebRootPath, "uploads", "web-assets", key);

    private void DeleteStagedFile(int productId, string fileName)
    {
        var safeName = Path.GetFileName(fileName);
        var path = Path.Combine(GetStagingDirectory(productId), safeName);
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
    }

    private static bool IsValidImage(IFormFile file)
    {
        if (file.Length <= 0 || file.Length > 5 * 1024 * 1024) return false;
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        return extension is ".jpg" or ".jpeg" or ".png" or ".webp";
    }

    private static bool IsValidModel3d(IFormFile file)
    {
        if (file.Length <= 0 || file.Length > 25 * 1024 * 1024) return false;
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        return extension is ".glb";
    }

    private static bool IsLocalModel3d(string? url) =>
        !string.IsNullOrWhiteSpace(url)
        && url.StartsWith("/uploads/web-products/", StringComparison.OrdinalIgnoreCase);

    private static string? GetModel3dDisplayName(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        return Path.GetFileName(url.Split('?', 2)[0]);
    }

    private async Task<string?> ResolveModel3dAsync(
        int productId,
        IFormFile? upload,
        bool removeExisting,
        CancellationToken ct)
    {
        var publication = await _db.WebProductosPublicados
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.IdProducto == productId, ct);
        var current = publication?.Modelo3dUrl;

        if (upload is { Length: > 0 })
        {
            if (!IsValidModel3d(upload))
                throw new InvalidDataException("El modelo 3D debe ser un archivo .glb de hasta 25 MB.");

            if (IsLocalModel3d(current))
                DeleteStagedFile(productId, Path.GetFileName(current!));

            var extension = Path.GetExtension(upload.FileName).ToLowerInvariant();
            var storedName = $"model-{Guid.NewGuid():N}{extension}";
            var directory = GetStagingDirectory(productId);
            Directory.CreateDirectory(directory);
            await using (var stream = System.IO.File.Create(Path.Combine(directory, storedName)))
                await upload.CopyToAsync(stream, ct);

            return $"/uploads/web-products/{productId}/{storedName}";
        }

        if (removeExisting)
        {
            if (IsLocalModel3d(current))
                DeleteStagedFile(productId, Path.GetFileName(current!));
            return null;
        }

        // Solo se admiten archivos .glb propios. Los links externos heredados
        // se descartan al guardar el producto.
        return IsLocalModel3d(current) ? current : null;
    }

    private async Task<(string? Url, WebCatalogImage? File)> BuildModel3dPayloadAsync(
        int productId,
        string? model3dUrl,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(model3dUrl))
            return (null, null);

        if (!IsLocalModel3d(model3dUrl))
            return (model3dUrl, null);

        var fileName = Path.GetFileName(model3dUrl);
        var path = Path.Combine(GetStagingDirectory(productId), fileName);
        if (!System.IO.File.Exists(path))
            return (null, null);

        var bytes = await System.IO.File.ReadAllBytesAsync(path, ct);
        return (null, new WebCatalogImage
        {
            FileName = fileName,
            ContentBase64 = Convert.ToBase64String(bytes)
        });
    }

    private async Task<Dictionary<string, string>> ReadSettingsAsync(CancellationToken ct) =>
        await _db.WebConfiguraciones.AsNoTracking()
            .ToDictionaryAsync(x => x.Clave, x => x.Valor, ct);

    private async Task UpsertSettingAsync(string key, string? value, CancellationToken ct)
    {
        var entity = await _db.WebConfiguraciones.FirstOrDefaultAsync(x => x.Clave == key, ct);
        if (entity is null)
        {
            entity = new WebConfiguracion { Clave = key };
            _db.WebConfiguraciones.Add(entity);
        }
        entity.Valor = value?.Trim() ?? string.Empty;
        entity.FechaActualizacionUtc = DateTime.UtcNow;
    }

    private static string GetSetting(IReadOnlyDictionary<string, string> values, string key, string? fallback) =>
        values.TryGetValue(key, out var value) ? value : fallback ?? string.Empty;

    private static string Sign(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    private static string Slugify(string value)
    {
        var raw = new string(value.Trim().ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray());
        while (raw.Contains("--", StringComparison.Ordinal)) raw = raw.Replace("--", "-", StringComparison.Ordinal);
        return raw.Trim('-');
    }
}

public sealed class WebCatalogSnapshot
{
    public DateTime PublishedAtUtc { get; set; }
    public Dictionary<string, string> Settings { get; set; } = new();
    public List<WebCatalogProduct> Products { get; set; } = new();
    public List<WebCatalogBanner> Banners { get; set; } = new();
    public List<WebCatalogHeroSlide> HeroSlides { get; set; } = new();
    public List<WebCatalogAsset> Assets { get; set; } = new();
}

public sealed class WebCatalogAsset
{
    public string Key { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentBase64 { get; set; } = string.Empty;
}

public sealed class WebCatalogProduct
{
    public int ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "Otros";
    public string Unit { get; set; } = "Unidad";
    public decimal Price { get; set; }
    public decimal? ListPrice { get; set; }
    public decimal? DiscountPercent { get; set; }
    public string? OfferLabel { get; set; }
    public bool IsOnOffer { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<WebCatalogImage> Images { get; set; } = new();
    public string? Model3dUrl { get; set; }
    public WebCatalogImage? Model3dFile { get; set; }
    public bool Featured { get; set; }
    public int SortOrder { get; set; }
}

public sealed class WebCatalogBanner
{
    public int ExternalId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? LinkUrl { get; set; }
    public string? CtaLabel { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool ShowOnHome { get; set; } = true;
    public bool ShowOnCatalog { get; set; } = true;
    public WebCatalogImage? Image { get; set; }
}

public sealed class WebCatalogHeroSlide
{
    public int ExternalId { get; set; }
    public string Placement { get; set; } = "home";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public WebCatalogImage? Image { get; set; }
}

public sealed class WebCatalogImage
{
    public string FileName { get; set; } = string.Empty;
    public string ContentBase64 { get; set; } = string.Empty;
}

public sealed class WebStagedImage
{
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
}
