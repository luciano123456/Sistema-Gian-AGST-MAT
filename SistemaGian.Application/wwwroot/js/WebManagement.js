(function () {
    "use strict";

    const admin = document.querySelector(".web-admin");
    if (!admin) return;

    const canvases = Array.prototype.slice.call(document.querySelectorAll("[data-preview]"));
    const dirtyFlag = document.querySelector("[data-dirty]");
    let dirty = false;

    function markDirty() {
        if (dirty) return;
        dirty = true;
        if (dirtyFlag) dirtyFlag.hidden = false;
    }

    function clearDirty() {
        dirty = false;
        if (dirtyFlag) dirtyFlag.hidden = true;
    }

    /* ---------- Toasts (mismo patrón del sistema) ---------- */

    function toastOptions() {
        return {
            timeOut: 5000,
            extendedTimeOut: 2000,
            positionClass: "toast-bottom-right",
            progressBar: true,
            closeButton: true,
            newestOnTop: true,
            toastClass: "toastr ancho-personalizado"
        };
    }

    function notify(type, message, title) {
        if (!message || typeof toastr === "undefined") return;
        const opts = toastOptions();
        if (type === "error") toastr.error(message, title || "Web AGS MAT", opts);
        else if (type === "warning") toastr.warning(message, title || "Web AGS MAT", opts);
        else toastr.success(message, title || "Web AGS MAT", opts);
    }

    /* ---------- Guardado sin refrescar toda la gestión ---------- */

    async function submitInline(form, successMessage) {
        const submitter = form.querySelector("button[type='submit']");
        const originalHtml = submitter?.innerHTML;
        if (submitter) {
            submitter.disabled = true;
            submitter.classList.add("web-save-busy");
            submitter.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Guardando…';
        }

        try {
            const response = await fetch(form.action, {
                method: "POST",
                headers: { "X-Requested-With": "XMLHttpRequest" },
                body: new FormData(form)
            });
            const payload = await response.json().catch(function () { return {}; });
            if (!response.ok || !payload.ok) throw new Error(payload.message || "No se pudieron guardar los cambios.");

            clearDirty();
            notify("success", payload.message || successMessage, "Cambios guardados");
        } catch (error) {
            notify("error", error.message || "No se pudieron guardar los cambios.");
        } finally {
            if (submitter) {
                submitter.disabled = false;
                submitter.classList.remove("web-save-busy");
                submitter.innerHTML = originalHtml;
            }
        }
    }

    document.getElementById("settingsForm")?.addEventListener("submit", function (event) {
        event.preventDefault();
        submitInline(event.currentTarget, "Configuración guardada. Presioná Publicar para reflejarla en la Web.");
    });

    document.querySelector(".home-media-editor")?.addEventListener("submit", function (event) {
        event.preventDefault();
        submitInline(event.currentTarget, "Imágenes guardadas. Publicá para reflejarlas en la Web.");
    });

    /* ---------- Dock de publicación ---------- */

    const publishDock = document.getElementById("webPublishDock");
    const publishFill = document.getElementById("webPublishFill");
    const publishTrack = publishDock?.querySelector("[data-publish-track]");
    const publishTitle = publishDock?.querySelector("[data-publish-title]");
    const publishSubtitle = publishDock?.querySelector("[data-publish-subtitle]");
    const publishPct = publishDock?.querySelector("[data-publish-pct]");
    const publishIcon = publishDock?.querySelector("[data-publish-icon]");
    const publishButton = document.querySelector("[data-publish-button]");
    const publishLabel = document.querySelector("[data-publish-label]");
    let publishTimer = null;
    let publishProgress = 0;

    function setPublishProgress(value) {
        publishProgress = Math.max(0, Math.min(100, value));
        if (publishFill) publishFill.style.width = publishProgress + "%";
        if (publishPct) publishPct.textContent = Math.round(publishProgress) + "%";
        if (publishTrack) publishTrack.setAttribute("aria-valuenow", String(Math.round(publishProgress)));
    }

    function showPublishDock(mode) {
        if (!publishDock) return;
        publishDock.hidden = false;
        publishDock.classList.toggle("is-busy", mode === "busy");
        publishDock.classList.toggle("is-done", mode === "done");
        publishDock.classList.toggle("is-error", mode === "error");
    }

    function hidePublishDockSoon() {
        window.setTimeout(function () {
            if (!publishDock) return;
            publishDock.hidden = true;
            publishDock.classList.remove("is-busy", "is-done", "is-error");
            setPublishProgress(0);
        }, 900);
    }

    function startPublishProgress() {
        showPublishDock("busy");
        setPublishProgress(4);
        if (publishTitle) publishTitle.textContent = "Publicando en la web…";
        if (publishSubtitle) publishSubtitle.textContent = "Sincronizando catálogo, imágenes y textos";
        if (publishIcon) publishIcon.innerHTML = '<i class="fa fa-cloud-upload"></i>';

        window.clearInterval(publishTimer);
        publishTimer = window.setInterval(function () {
            if (publishProgress >= 92) return;
            const step = publishProgress < 40 ? 2.4 : publishProgress < 70 ? 1.3 : 0.55;
            setPublishProgress(publishProgress + step);
        }, 180);
    }

    function finishPublishProgress(ok, message) {
        window.clearInterval(publishTimer);
        setPublishProgress(100);
        showPublishDock(ok ? "done" : "error");
        if (publishTitle) publishTitle.textContent = ok ? "Publicación lista" : "No se pudo publicar";
        if (publishSubtitle) publishSubtitle.textContent = message || (ok ? "La web ya refleja los cambios" : "Revisá la conexión y volvé a intentar");
        if (publishIcon) publishIcon.innerHTML = ok ? '<i class="fa fa-check"></i>' : '<i class="fa fa-exclamation-triangle"></i>';
        hidePublishDockSoon();
    }

    document.querySelector("[data-publish-form]")?.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearDirty();
        startPublishProgress();
        if (publishButton) publishButton.classList.add("is-busy");
        if (publishLabel) publishLabel.textContent = "Publicando…";

        try {
            const response = await fetch(event.currentTarget.action, {
                method: "POST",
                headers: { "X-Requested-With": "XMLHttpRequest" },
                body: new FormData(event.currentTarget)
            });
            const payload = await response.json().catch(function () { return {}; });
            if (!response.ok || !payload.ok) throw new Error(payload.message || "No se pudo publicar.");
            finishPublishProgress(true, payload.message);
            notify("success", payload.message, "Publicación exitosa");
        } catch (error) {
            finishPublishProgress(false, error.message);
            notify("error", error.message, "Publicación");
        } finally {
            if (publishButton) publishButton.classList.remove("is-busy");
            if (publishLabel) publishLabel.textContent = "Publicar en la web";
        }
    });

    /* ---------- Feedback al volver de guardar / publicar ---------- */

    (function showFlashFeedback() {
        const node = document.getElementById("webFlashMessages");
        if (!node) return;

        let flash = { ok: null, error: null };
        try { flash = JSON.parse(node.textContent || "{}") || flash; } catch (e) { /* ignore */ }

        let wasPublishing = false;
        try {
            wasPublishing = sessionStorage.getItem("webPublishPending") === "1";
            sessionStorage.removeItem("webPublishPending");
        } catch (e) { /* ignore */ }

        if (wasPublishing) {
            finishPublishProgress(!flash.error, flash.ok || flash.error);
            window.setTimeout(function () {
                if (flash.error) notify("error", flash.error, "Publicación");
                else if (flash.ok) notify("success", flash.ok, "Publicación exitosa");
            }, 350);
            return;
        }

        if (flash.error) notify("error", flash.error);
        else if (flash.ok) notify("success", flash.ok, "Cambios guardados");
    })();

    /* ---------- Solapas ---------- */

    const TAB_KEY = "webManagement.activeTab";
    const WIDTH_KEY = "webManagement.previewWidth";

    function openTab(name, options) {
        const opts = options || {};
        if (!name || !document.getElementById("web-tab-" + name)) name = "home";

        document.querySelectorAll(".web-tab[data-web-tab]").forEach(function (item) {
            item.classList.toggle("active", item.dataset.webTab === name);
            item.setAttribute("aria-selected", item.dataset.webTab === name ? "true" : "false");
        });

        document.querySelectorAll(".site-nav [data-web-tab]").forEach(function (item) {
            item.classList.toggle("is-current", item.dataset.webTab === name);
        });

        const currentPage = {
            home: "Inicio",
            catalog: "Catálogo",
            about: "Nosotros",
            contact: "Contacto",
            cart: "Carrito"
        };
        document.querySelectorAll("[data-current-page]").forEach(function (item) {
            item.textContent = currentPage[name] || "Inicio";
        });

        document.querySelectorAll(".web-tab-pane").forEach(function (pane) {
            pane.classList.toggle("active", pane.id === "web-tab-" + name);
        });

        try { sessionStorage.setItem(TAB_KEY, name); } catch (e) { /* ignore */ }

        if (!opts.silentScroll) {
            window.scrollTo({ top: 0, behavior: opts.instant ? "auto" : "smooth" });
        }
    }

    document.querySelectorAll("[data-web-tab]").forEach(function (item) {
        item.addEventListener("click", function () { openTab(item.dataset.webTab); });
    });

    document.querySelectorAll(".site-nav [data-edit-nav]").forEach(function (pencil) {
        pencil.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            const label = pencil.closest(".site-nav-item")?.querySelector("[data-edit-field='" + pencil.dataset.editNav + "']");
            enableInlineEditing(label);
        });
    });

    function restoreTab() {
        let saved = null;
        try { saved = sessionStorage.getItem(TAB_KEY); } catch (e) { /* ignore */ }
        if (admin.dataset.editProduct) {
            openTab("catalog", { silentScroll: true, instant: true });
            return;
        }
        if (admin.dataset.preferredTab) {
            openTab(admin.dataset.preferredTab, { silentScroll: true, instant: true });
            return;
        }
        openTab(saved || "home", { silentScroll: true, instant: true });
    }

    /* ---------- Edición directa sobre el lienzo ---------- */

    function readText(block) {
        return block.innerText.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    }

    function mirror(field, value) {
        document.querySelectorAll("[data-bind='" + field + "']").forEach(function (node) {
            node.textContent = value || node.dataset.fallback || "";
        });
    }

    function commitField(block) {
        const field = block && block.dataset.editField;
        if (!field) return;
        const value = readText(block);
        const target = document.getElementById(field);
        if (target) target.value = value;
        document.querySelectorAll("[data-edit-field='" + field + "']").forEach(function (replica) {
            if (replica === block || replica.classList.contains("is-editing")) return;
            replica.textContent = value;
        });
        mirror(field, value);
    }

    function closeInlineEditors(except) {
        document.querySelectorAll("[data-edit-field].is-editing").forEach(function (current) {
            if (current === except) return;
            commitField(current);
            current.contentEditable = "false";
            current.classList.remove("is-editing");
            current.setAttribute("aria-readonly", "true");
        });
    }

    function enableInlineEditing(block) {
        if (!block) return;
        closeInlineEditors(block);
        block.contentEditable = "true";
        block.classList.add("is-editing");
        block.setAttribute("aria-readonly", "false");
        block.tabIndex = 0;

        // El foco puede quedar en el botón del lápiz; se reintenta en el próximo tick.
        block.focus({ preventScroll: true });
        if (document.activeElement !== block) {
            window.setTimeout(function () {
                block.focus({ preventScroll: true });
                placeCaretAtEnd(block);
            }, 0);
            return;
        }

        placeCaretAtEnd(block);
    }

    document.querySelectorAll("[data-edit-field]").forEach(function (block) {
        const target = document.getElementById(block.dataset.editField);
        if (!target) return;
        block.contentEditable = "false";
        block.setAttribute("aria-readonly", "true");

        block.addEventListener("input", function () {
            commitField(block);
            markDirty();
        });

        block.addEventListener("paste", function (event) {
            event.preventDefault();
            const text = (event.clipboardData || window.clipboardData).getData("text/plain");
            document.execCommand("insertText", false, block.dataset.singleLine ? text.replace(/\s+/g, " ") : text);
        });

        block.addEventListener("keydown", function (event) {
            if (event.key === "Enter" && block.dataset.singleLine) event.preventDefault();
        });

        block.addEventListener("blur", function () {
            commitField(block);
            block.contentEditable = "false";
            block.classList.remove("is-editing");
            block.setAttribute("aria-readonly", "true");
        });
    });

    function isTextPencil(pencil) {
        return pencil
            && !pencil.classList.contains("nav-pencil")
            && !pencil.dataset.openProduct
            && !pencil.dataset.editNav;
    }

    function directEditFields(wrap) {
        return Array.prototype.filter.call(wrap.children || [], function (el) {
            return el && el.hasAttribute && el.hasAttribute("data-edit-field");
        });
    }

    function hasDedicatedPencil(block) {
        const wrap = block.parentElement;
        if (!wrap || !wrap.classList.contains("live-auto-wrap")) return false;
        return Array.prototype.some.call(wrap.children, function (child) {
            return child.classList
                && child.classList.contains("live-pencil")
                && child.dataset.editTarget === block.dataset.editField;
        });
    }

    function ensureDedicatedPencil(block) {
        if (hasDedicatedPencil(block)) return;

        const isBlock = /^(DIV|P|H1|H2|H3|H4|SECTION|ARTICLE|STRONG|LABEL)$/i.test(block.tagName);
        const wrapper = document.createElement(isBlock ? "div" : "span");
        wrapper.className = "live-wrap live-auto-wrap" + (isBlock ? "" : " is-inline");
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);

        const pencil = document.createElement("button");
        pencil.type = "button";
        pencil.className = "live-pencil";
        pencil.title = "Editar este texto";
        pencil.setAttribute("data-edit-target", block.dataset.editField);
        pencil.innerHTML = '<i class="fa fa-pencil"></i>';
        wrapper.appendChild(pencil);
    }

    // Un lápiz por texto, siempre. No se reutilizan lápices de un contenedor
    // compartido: al editar un título y una bajada, cada uno debe apuntar a su
    // propio data-edit-field y, por ende, a su input oculto.
    document.querySelectorAll("[data-edit-field]").forEach(function (block) {
        if (block.classList.contains("nav-label")) return;
        ensureDedicatedPencil(block);
    });

    // Al envolver cada campo pueden quedar lápices genéricos del Razor. No
    // representan un campo específico y eran la causa de que algunos clics
    // terminaran editando la bajada en lugar del título.
    document.querySelectorAll(".live-wrap > .live-pencil").forEach(function (pencil) {
        if (!isTextPencil(pencil)) return;
        if (!pencil.dataset.editTarget) pencil.remove();
    });

    function resolvePencilField(pencil) {
        const scope = pencil.closest(".live-wrap") || pencil.parentElement;
        const targetName = pencil.dataset.editTarget;
        if (targetName && scope) {
            const local = scope.querySelector("[data-edit-field='" + targetName + "']");
            if (local) return local;
        }

        const prev = pencil.previousElementSibling;
        if (prev && prev.hasAttribute("data-edit-field")) return prev;
        if (!scope) return null;

        const ownFields = directEditFields(scope);
        return ownFields.length === 1 ? ownFields[0] : null;
    }

    /* Los lápices sólo llevan el cursor al bloque que representan. */
    document.querySelectorAll(".live-pencil").forEach(function (pencil) {
        pencil.addEventListener("mousedown", function (event) {
            event.preventDefault();
        });

        pencil.addEventListener("click", function () {
            if (pencil.dataset.openProduct) {
                focusProduct(pencil.dataset.openProduct);
                return;
            }
            const block = resolvePencilField(pencil);
            if (!block) return;
            enableInlineEditing(block);
        });
    });

    function placeCaretAtEnd(node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function focusProduct(productId) {
        openTab("catalog");
        const card = document.getElementById("product-editor-" + productId);
        if (!card) return;
        window.setTimeout(function () {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.classList.add("is-editing");
            window.setTimeout(function () { card.classList.remove("is-editing"); }, 2000);
        }, 60);
    }

    /* ---------- Colores, WhatsApp y ancho ---------- */

    function applyColors() {
        const primary = valueOf("PrimaryColor", "#1F4F7A");
        const accent = valueOf("AccentColor", "#128C7E");
        admin.style.setProperty("--site-primary", primary);
        admin.style.setProperty("--site-accent", accent);
        document.querySelectorAll("[data-section-theme]").forEach(applySectionTheme);
    }

    function hexLuminance(hex) {
        const match = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
        if (!match) return 0.5;
        const n = parseInt(match[1], 16);
        const r = (n >> 16) & 255;
        const g = (n >> 8) & 255;
        const b = n & 255;
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }

    function contrastText(bgHex) {
        return hexLuminance(bgHex) > 0.55 ? "#1D2430" : "#FFFFFF";
    }

    function applySectionTheme(section) {
        const bg = section.querySelector("[data-theme='bg']");
        const fg = section.querySelector("[data-theme='fg']");
        const bgValue = bg && bg.value ? bg.value : "";
        let fgValue = fg && fg.value ? fg.value : "";

        if (bgValue) section.style.background = bgValue;
        if (bgValue && fgValue && Math.abs(hexLuminance(bgValue) - hexLuminance(fgValue)) < 0.28) {
            fgValue = contrastText(bgValue);
            if (fg) fg.value = fgValue;
        }
        if (fgValue) section.style.color = fgValue;
    }

    function applyWhatsApp() {
        const number = valueOf("WhatsAppNumber", "").trim();
        document.querySelectorAll("[data-bind-whatsapp]").forEach(function (label) {
            label.textContent = number ? "WhatsApp +" + number : "Configurá tu WhatsApp";
        });
    }

    function valueOf(id, fallback) {
        const el = document.getElementById(id);
        return el && el.value ? el.value : fallback;
    }

    ["PrimaryColor", "AccentColor", "WhatsAppNumber"].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("input", function () {
            applyColors();
            applyWhatsApp();
            markDirty();
        });
    });

    document.addEventListener("input", function (event) {
        const swatch = event.target.closest("[data-theme]");
        if (!swatch) return;
        const section = swatch.closest("[data-section-theme]");
        if (section) applySectionTheme(section);
        markDirty();
    });

    document.querySelectorAll("[data-preview-width]").forEach(function (button) {
        button.addEventListener("click", function () {
            setPreviewWidth(button.dataset.previewWidth);
        });
    });

    function setPreviewWidth(width) {
        const isMobile = width === "mobile";
        canvases.forEach(function (canvas) { canvas.classList.toggle("is-mobile", isMobile); });
        document.querySelectorAll("[data-preview-width]").forEach(function (other) {
            other.classList.toggle("active", other.dataset.previewWidth === width);
        });
        try { sessionStorage.setItem(WIDTH_KEY, width); } catch (e) { /* ignore */ }
    }

    function restorePreviewWidth() {
        let saved = "desktop";
        try { saved = sessionStorage.getItem(WIDTH_KEY) || "desktop"; } catch (e) { /* ignore */ }
        setPreviewWidth(saved);
    }

    /* ---------- Catálogo ---------- */

    if (window.jQuery && window.jQuery.fn.select2) {
        window.jQuery(".web-product-select").select2({
            width: "100%",
            placeholder: "Buscá un producto de Gestión para sumarlo...",
            allowClear: true,
            dropdownCssClass: "web-select2-dropdown",
            language: {
                noResults: function () { return "No encontramos productos disponibles"; },
                searching: function () { return "Buscando..."; }
            }
        });
    }

    /* ---------- Galería en cards Destacados ---------- */

    function initCardGalleries(root) {
        (root || document).querySelectorAll("[data-card-gallery]").forEach(function (gallery) {
            if (gallery.dataset.ready === "1") return;
            gallery.dataset.ready = "1";

            const main = gallery.querySelector("[data-gallery-main]");
            const countEl = gallery.querySelector("[data-gallery-count]");
            const jsonNode = gallery.querySelector("[data-gallery-images]");
            if (!main || !jsonNode) return;

            let images = [];
            try { images = JSON.parse(jsonNode.textContent || "[]"); } catch (e) { images = []; }
            if (!Array.isArray(images) || images.length < 2) return;

            let active = 0;
            function show(index) {
                active = (index + images.length) % images.length;
                main.src = images[active];
                if (countEl) countEl.textContent = (active + 1) + " / " + images.length;
            }

            gallery.querySelector("[data-gallery-prev]")?.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                show(active - 1);
            });
            gallery.querySelector("[data-gallery-next]")?.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                show(active + 1);
            });
        });
    }

    initCardGalleries(document);

    /* ---------- Previsualización de fotos (hasta 4) ---------- */

    function initImagePickers(root) {
        (root || document).querySelectorAll("[data-image-picker]").forEach(function (picker) {
            if (picker.dataset.ready === "1") return;
            picker.dataset.ready = "1";

            const input = picker.querySelector('input[type="file"][name="ImageFiles"]');
            const pendingBox = picker.querySelector("[data-pending-previews]");
            const addSlot = picker.querySelector("[data-add-slot]");
            if (!input || !pendingBox || !addSlot) return;

            const bag = [];

            function savedVisibleCount() {
                return picker.querySelectorAll(".catalog-photo.is-saved:not(.is-marked-remove)").length;
            }

            function syncInput() {
                const transfer = new DataTransfer();
                bag.forEach(function (item) { transfer.items.add(item.file); });
                input.files = transfer.files;
                render();
            }

            function render() {
                pendingBox.innerHTML = "";
                bag.forEach(function (item, index) {
                    const thumb = document.createElement("div");
                    thumb.className = "catalog-photo is-pending";
                    thumb.title = item.file.name;

                    const img = document.createElement("img");
                    img.src = item.url;
                    img.alt = item.file.name;

                    const remove = document.createElement("button");
                    remove.type = "button";
                    remove.className = "catalog-photo-remove is-button";
                    remove.title = "Quitar esta foto";
                    remove.innerHTML = '<i class="fa fa-times"></i>';
                    remove.addEventListener("click", function () {
                        URL.revokeObjectURL(item.url);
                        bag.splice(index, 1);
                        syncInput();
                    });

                    thumb.appendChild(img);
                    thumb.appendChild(remove);
                    pendingBox.appendChild(thumb);
                });

                const total = savedVisibleCount() + bag.length;
                const remaining = Math.max(0, 4 - total);
                addSlot.hidden = remaining === 0;
                addSlot.title = remaining
                    ? "Agregar fotos (quedan " + remaining + ")"
                    : "Máximo 4 fotos";

                const status = picker.parentElement?.querySelector("[data-new-product-images]");
                if (status) {
                    status.textContent = bag.length
                        ? bag.length + " foto" + (bag.length === 1 ? "" : "s") + " lista" + (bag.length === 1 ? "" : "s") + " para subir · máximo 4"
                        : "JPG, PNG o WebP. Hasta 4 fotos.";
                    status.classList.toggle("is-error", false);
                }
            }

            input.addEventListener("change", function () {
                const incoming = Array.prototype.slice.call(input.files || []);
                const room = Math.max(0, 4 - savedVisibleCount() - bag.length);
                if (!room) {
                    input.value = "";
                    render();
                    return;
                }

                incoming.slice(0, room).forEach(function (file) {
                    if (!/^image\/(jpeg|png|webp)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) return;
                    bag.push({ file: file, url: URL.createObjectURL(file) });
                });

                syncInput();
            });

            picker.querySelectorAll(".catalog-photo.is-saved .catalog-photo-remove input").forEach(function (checkbox) {
                checkbox.addEventListener("change", function () {
                    checkbox.closest(".catalog-photo")?.classList.toggle("is-marked-remove", checkbox.checked);
                    render();
                });
            });

            render();
        });
    }

    initImagePickers(document);

    /* ---------- Vista previa de modelos GLB ---------- */

    document.querySelectorAll("[data-model3d-input]").forEach(function (input) {
        let objectUrl = null;

        input.addEventListener("change", function () {
            const preview = input.closest(".model3d-editor, .modal-field")?.querySelector("[data-model3d-pending]");
            if (!preview) return;

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }

            preview.innerHTML = "";
            const file = input.files?.[0];
            if (!file) {
                preview.hidden = true;
                return;
            }

            if (!/\.glb$/i.test(file.name)) {
                input.value = "";
                preview.hidden = true;
                notify("error", "Elegí un archivo .glb para el modelo 3D.");
                return;
            }

            objectUrl = URL.createObjectURL(file);
            const viewer = document.createElement("model-viewer");
            viewer.src = objectUrl;
            viewer.setAttribute("camera-controls", "");
            viewer.setAttribute("auto-rotate", "");
            viewer.setAttribute("shadow-intensity", "1");
            viewer.setAttribute("alt", "Vista previa del modelo 3D");
            preview.appendChild(viewer);
            preview.hidden = false;
        });
    });

    function paintToggleChip(chip) {
        const box = chip.querySelector('input[type="checkbox"]');
        if (!box) return;
        chip.classList.toggle("is-on", box.checked);
    }

    function paintProductCard(card) {
        if (!card) return;
        const state = function (name) {
            const box = card.querySelector('.toggle-chip.' + name + ' input[type="checkbox"]');
            return Boolean(box && box.checked);
        };
        card.classList.toggle("has-featured", state("is-featured"));
        card.classList.toggle("has-offer", state("is-offer"));
        card.classList.toggle("is-hidden-product", !state("is-visible"));
    }

    document.querySelectorAll(".toggle-chip").forEach(function (chip) {
        paintToggleChip(chip);
        const box = chip.querySelector('input[type="checkbox"]');
        box?.addEventListener("change", function () {
            paintToggleChip(chip);
            paintProductCard(chip.closest(".catalog-card"));
        });
    });

    document.querySelectorAll(".catalog-card").forEach(paintProductCard);

    (function initCatalogProductSearch() {
        const root = document.querySelector("[data-catalog-product-search]");
        const grid = document.querySelector("[data-catalog-product-grid]");
        if (!root || !grid) return;

        const input = root.querySelector("[data-catalog-product-query]");
        const clearBtn = root.querySelector("[data-catalog-product-clear]");
        const countEl = root.querySelector("[data-catalog-product-count]");
        const cards = Array.prototype.slice.call(grid.querySelectorAll("[data-catalog-card]"));
        if (!input || !cards.length) return;

        let emptyEl = grid.querySelector("[data-catalog-product-empty]");
        if (!emptyEl) {
            emptyEl = document.createElement("div");
            emptyEl.className = "catalog-product-empty";
            emptyEl.setAttribute("data-catalog-product-empty", "");
            emptyEl.textContent = "No hay productos que coincidan con la búsqueda.";
            grid.appendChild(emptyEl);
        }

        const normalize = function (value) {
            return String(value || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();
        };

        const applyFilter = function () {
            const query = normalize(input.value);
            const matches = [];

            cards.forEach(function (card) {
                const haystack = normalize(card.getAttribute("data-search") || "");
                const match = !query || haystack.indexOf(query) !== -1;
                card.classList.toggle("is-search-hidden", !match);
                if (match) matches.push(card);
            });

            const pageSize = 16;
            const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
            if (currentPage > totalPages) currentPage = totalPages;

            matches.forEach(function (card, index) {
                const start = (currentPage - 1) * pageSize;
                card.classList.toggle("is-page-hidden", index < start || index >= start + pageSize);
            });

            if (clearBtn) clearBtn.hidden = !query;
            if (countEl) {
                const from = matches.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
                const to = Math.min(matches.length, currentPage * pageSize);
                countEl.textContent = query
                    ? (matches.length + " de " + cards.length + (totalPages > 1 ? " · pág. " + currentPage : ""))
                    : (totalPages > 1
                        ? (from + "–" + to + " de " + cards.length)
                        : (cards.length + " producto" + (cards.length === 1 ? "" : "s")));
            }
            emptyEl.classList.toggle("is-visible", matches.length === 0);
            renderPager(totalPages);
        };

        let currentPage = 1;
        let pagerEl = document.querySelector("[data-catalog-product-pager]");
        if (!pagerEl) {
            pagerEl = document.createElement("nav");
            pagerEl.className = "catalog-product-pager";
            pagerEl.setAttribute("data-catalog-product-pager", "");
            pagerEl.setAttribute("aria-label", "Páginas de productos");
            grid.insertAdjacentElement("afterend", pagerEl);
        }

        const renderPager = function (totalPages) {
            if (totalPages <= 1) {
                pagerEl.hidden = true;
                pagerEl.innerHTML = "";
                return;
            }
            pagerEl.hidden = false;
            let html = '<button type="button" data-page="' + (currentPage - 1) + '"' + (currentPage <= 1 ? " disabled" : "") + ">Anterior</button>";
            html += '<div class="catalog-product-pager-pages">';
            for (let i = 1; i <= totalPages; i++) {
                if (i > 1 && i < totalPages && Math.abs(i - currentPage) > 2 && !(currentPage <= 4 && i <= 5) && !(currentPage >= totalPages - 3 && i >= totalPages - 4)) {
                    if (i === 2 || i === totalPages - 1) html += "<span>…</span>";
                    continue;
                }
                html += '<button type="button" data-page="' + i + '"' + (i === currentPage ? ' class="is-active"' : "") + ">" + i + "</button>";
            }
            html += "</div>";
            html += '<button type="button" data-page="' + (currentPage + 1) + '"' + (currentPage >= totalPages ? " disabled" : "") + ">Siguiente</button>";
            pagerEl.innerHTML = html;
        };

        pagerEl.addEventListener("click", function (event) {
            const button = event.target.closest("[data-page]");
            if (!button || button.disabled) return;
            const next = Number(button.getAttribute("data-page") || "1");
            if (!next || next === currentPage) return;
            currentPage = next;
            applyFilter();
            root.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        input.addEventListener("input", function () {
            currentPage = 1;
            applyFilter();
        });
        input.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                input.value = "";
                currentPage = 1;
                applyFilter();
                input.blur();
            }
        });
        clearBtn?.addEventListener("click", function () {
            input.value = "";
            currentPage = 1;
            applyFilter();
            input.focus();
        });

        applyFilter();
    })();

    const categoryModal = document.getElementById("categoryModal");
    const categoryModalTitle = document.getElementById("categoryModalTitle");
    const categoryModalText = document.getElementById("categoryModalText");
    const categoryCreateForm = document.getElementById("categoryCreateForm");
    const categoryEditForm = document.getElementById("categoryEditForm");
    const categoryCreateName = document.getElementById("categoryCreateName");
    const categoryEditName = document.getElementById("categoryEditName");
    const categoryEditId = document.getElementById("categoryEditId");

    function openCategoryModal(category) {
        if (!categoryModal) return;
        const isEdit = Boolean(category);
        categoryModalTitle.textContent = isEdit ? "Editar categoría" : "Nueva categoría";
        categoryModalText.textContent = isEdit
            ? "El cambio de nombre también se reflejará en sus productos publicados."
            : "Creala y después asignala a los productos que correspondan.";
        categoryCreateForm.hidden = isEdit;
        categoryEditForm.hidden = !isEdit;

        // Evitar que un input required oculto bloquee el submit del otro form.
        if (categoryCreateName) categoryCreateName.disabled = isEdit;
        if (categoryEditName) categoryEditName.disabled = !isEdit;
        if (categoryEditId) categoryEditId.disabled = !isEdit;

        const input = isEdit ? categoryEditName : categoryCreateName;
        if (isEdit) {
            categoryEditId.value = category.id;
            categoryEditName.value = category.name;
        } else {
            categoryCreateName.value = "";
        }

        categoryModal.hidden = false;
        window.setTimeout(function () { input.focus(); input.select(); }, 20);
    }

    function closeCategoryModal() {
        if (categoryModal) categoryModal.hidden = true;
    }

    document.querySelectorAll("[data-create-category]").forEach(function (button) {
        button.addEventListener("click", function () { openCategoryModal(null); });
    });

    document.querySelectorAll("[data-edit-category]").forEach(function (button) {
        button.addEventListener("click", function () {
            openCategoryModal({ id: button.dataset.editCategory, name: button.dataset.categoryName });
        });
    });

    document.querySelectorAll("[data-close-category-modal]").forEach(function (button) {
        button.addEventListener("click", closeCategoryModal);
    });

    document.querySelectorAll("[data-delete-category]").forEach(function (form) {
        form.addEventListener("submit", function (event) {
            const name = form.dataset.deleteCategory;
            if (!window.confirm("¿Eliminar la categoría “" + name + "”? Sus productos quedarán sin categoría; no se eliminan los productos.")) {
                event.preventDefault();
            }
        });
    });

    /* ---------- Alta de producto ---------- */

    const productModal = document.getElementById("productModal");
    const newProductSelect = document.getElementById("newProductId");
    const newProductPrice = document.getElementById("newProductPrice");

    function openProductModal() {
        if (!productModal) return;
        productModal.hidden = false;
        window.setTimeout(function () {
            if (window.jQuery && window.jQuery.fn.select2) {
                window.jQuery(newProductSelect).select2("open");
            } else {
                newProductSelect?.focus();
            }
        }, 20);
    }

    function closeProductModal() {
        if (productModal) productModal.hidden = true;
    }

    document.querySelectorAll("[data-open-product-modal]").forEach(function (button) {
        button.addEventListener("click", openProductModal);
    });
    document.querySelectorAll("[data-close-product-modal]").forEach(function (button) {
        button.addEventListener("click", closeProductModal);
    });

    function fillPublicPriceFromSelection() {
        if (!newProductSelect || !newProductPrice) return;
        const option = newProductSelect.options[newProductSelect.selectedIndex];
        const price = option?.dataset?.price;
        if (!price) return;
        newProductPrice.value = price;
    }

    newProductSelect?.addEventListener("change", fillPublicPriceFromSelection);

    // Select2 a veces no dispara el change nativo de forma confiable: se escucha el suyo.
    if (window.jQuery && newProductSelect) {
        window.jQuery(newProductSelect)
            .on("select2:select change", fillPublicPriceFromSelection)
            .on("select2:clear", function () {
                if (newProductPrice) newProductPrice.value = "";
            });
    }

    if (admin.dataset.editProduct) focusProduct(admin.dataset.editProduct);

    /* ---------- Banners ---------- */

    const bannerModal = document.getElementById("bannerModal");
    const bannerForm = document.getElementById("bannerForm");
    const bannerId = document.getElementById("bannerId");
    const bannerTitle = document.getElementById("bannerTitle");
    const bannerSubtitle = document.getElementById("bannerSubtitle");
    const bannerLink = document.getElementById("bannerLink");
    const bannerCta = document.getElementById("bannerCta");
    const bannerOrder = document.getElementById("bannerOrder");
    const bannerImage = document.getElementById("bannerImage");
    const bannerActive = document.getElementById("bannerActive");
    const bannerHome = document.getElementById("bannerHome");
    const bannerCatalog = document.getElementById("bannerCatalog");
    const bannerModalTitle = document.getElementById("bannerModalTitle");
    const bannerPreviewBox = document.querySelector("[data-banner-preview-box]");
    const bannerPreviewImg = document.querySelector("[data-banner-preview-img]");
    const bannerPreviewTitle = document.querySelector("[data-banner-preview-title]");
    const bannerPreviewName = document.querySelector("[data-banner-preview-name]");
    let bannerObjectUrl = null;

    function clearBannerObjectUrl() {
        if (bannerObjectUrl) {
            URL.revokeObjectURL(bannerObjectUrl);
            bannerObjectUrl = null;
        }
    }

    function hideBannerPreview() {
        clearBannerObjectUrl();
        if (bannerPreviewBox) bannerPreviewBox.hidden = true;
        if (bannerPreviewImg) bannerPreviewImg.removeAttribute("src");
        if (bannerPreviewTitle) bannerPreviewTitle.textContent = "Vista previa";
        if (bannerPreviewName) bannerPreviewName.textContent = "Sin archivo";
    }

    function showBannerPreview(url, label, isExisting) {
        if (!bannerPreviewBox || !bannerPreviewImg || !url) {
            hideBannerPreview();
            return;
        }
        bannerPreviewImg.src = url;
        if (bannerPreviewTitle) bannerPreviewTitle.textContent = isExisting ? "Imagen actual" : "Nueva imagen";
        if (bannerPreviewName) bannerPreviewName.textContent = label || "Banner";
        bannerPreviewBox.hidden = false;
    }

    function openBannerModal(data) {
        if (!bannerModal) return;
        const isEdit = Boolean(data && data.id);
        bannerModalTitle.textContent = isEdit ? "Editar banner" : "Nuevo banner";
        bannerId.value = isEdit ? data.id : "";
        bannerTitle.value = isEdit ? (data.title || "") : "";
        bannerSubtitle.value = isEdit ? (data.subtitle || "") : "";
        bannerLink.value = isEdit ? (data.link || "") : "/Catalog";
        bannerCta.value = isEdit ? (data.cta || "") : "Ver más";
        bannerOrder.value = isEdit ? (data.order || "0") : "0";
        if (bannerImage) bannerImage.value = "";
        if (bannerImage) bannerImage.required = !isEdit;
        bannerActive.checked = isEdit ? data.active !== "false" : true;
        bannerHome.checked = isEdit ? data.home !== "false" : true;
        bannerCatalog.checked = isEdit ? data.catalog !== "false" : true;

        hideBannerPreview();
        if (isEdit && data.preview) {
            showBannerPreview(data.preview, data.title || "Banner guardado", true);
        }

        bannerModal.hidden = false;
        window.setTimeout(function () { bannerTitle.focus(); }, 20);
    }

    function closeBannerModal() {
        if (bannerModal) bannerModal.hidden = true;
        hideBannerPreview();
    }

    bannerImage?.addEventListener("change", function () {
        const file = bannerImage.files && bannerImage.files[0];
        clearBannerObjectUrl();
        if (!file) {
            hideBannerPreview();
            return;
        }
        bannerObjectUrl = URL.createObjectURL(file);
        showBannerPreview(bannerObjectUrl, file.name, false);
    });

    document.querySelectorAll("[data-open-banner-modal]").forEach(function (button) {
        button.addEventListener("click", function () { openBannerModal(null); });
    });
    document.querySelectorAll("[data-edit-banner]").forEach(function (button) {
        button.addEventListener("click", function () {
            openBannerModal({
                id: button.dataset.bannerId,
                title: button.dataset.bannerTitle,
                subtitle: button.dataset.bannerSubtitle,
                link: button.dataset.bannerLink,
                cta: button.dataset.bannerCta,
                order: button.dataset.bannerOrder,
                preview: button.dataset.bannerPreview,
                active: button.dataset.bannerActive,
                home: button.dataset.bannerHome,
                catalog: button.dataset.bannerCatalog
            });
        });
    });
    document.querySelectorAll("[data-close-banner-modal]").forEach(function (button) {
        button.addEventListener("click", closeBannerModal);
    });

    window.addEventListener("beforeunload", function (event) {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = "";
    });

    admin.querySelectorAll("form").forEach(function (form) {
        form.addEventListener("submit", function (event) {
            if (event.defaultPrevented) return;
            clearDirty();

            // Antes de recargar, asegurar solapa / ancho actuales.
            try {
                const activeTab = document.querySelector(".web-tab.active[data-web-tab]");
                if (activeTab) sessionStorage.setItem(TAB_KEY, activeTab.dataset.webTab);
                const activeWidth = document.querySelector("[data-preview-width].active");
                if (activeWidth) sessionStorage.setItem(WIDTH_KEY, activeWidth.dataset.previewWidth);
            } catch (e) { /* ignore */ }

            if (form.hasAttribute("data-publish-form")) return;

            const submitter = event.submitter || form.querySelector("button[type=submit], .web-save");
            if (!submitter || submitter.classList.contains("web-save-busy") || submitter.classList.contains("is-busy")) return;

            const isDelete = submitter.classList.contains("catalog-delete")
                || submitter.classList.contains("is-danger")
                || /eliminar|quitar|borrar/i.test(submitter.getAttribute("title") || submitter.textContent || "");

            // No tocar el botón en el mismo tick del submit: en Chrome/Edge
            // reescribir innerHTML cancela el POST y parece que "no guarda".
            window.setTimeout(function () {
                if (!submitter.isConnected) return;
                submitter.classList.add("web-save-busy");
                submitter.setAttribute("aria-busy", "true");
                submitter.innerHTML = isDelete
                    ? '<i class="fa fa-spinner fa-spin"></i> Eliminando…'
                    : '<i class="fa fa-spinner fa-spin"></i> Guardando…';
            }, 0);
        });
    });

    restorePreviewWidth();
    restoreTab();
    applyColors();
    applyWhatsApp();
})();
