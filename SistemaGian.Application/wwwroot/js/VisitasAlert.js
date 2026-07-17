(function (window) {
    'use strict';

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fmtFecha(val) {
        if (!val) return null;
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return null;
        return d.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function labelEntidad(tipo, plural) {
        if (plural) return tipo === 'Proveedor' ? 'proveedores' : 'clientes';
        return tipo === 'Proveedor' ? 'proveedor' : 'cliente';
    }

    function inicial(nombre) {
        const t = String(nombre || '').trim();
        if (!t) return '?';
        return t.charAt(0).toUpperCase();
    }

    function renderList(items, filtro) {
        const q = (filtro || '').toLowerCase().trim();
        const filtrados = !q ? items : items.filter(it => {
            const blob = [
                it.nombre, it.Nombre,
                it.direccion, it.Direccion,
                it.localidad, it.Localidad,
                it.telefono, it.Telefono
            ].filter(Boolean).join(' ').toLowerCase();
            return blob.includes(q);
        });

        const list = document.getElementById('svModalBody');
        const chipVisible = document.getElementById('svChipVisible');
        if (!list) return;

        if (chipVisible) {
            if (q) {
                chipVisible.hidden = false;
                chipVisible.textContent = 'Mostrando ' + filtrados.length;
            } else {
                chipVisible.hidden = true;
            }
        }

        if (!filtrados.length) {
            list.innerHTML = `
                <div class="sv-empty">
                    <i class="fa fa-search"></i>
                    No hay resultados para ese filtro.
                </div>`;
            return;
        }

        list.innerHTML = filtrados.map(it => {
            const nombre = it.nombre ?? it.Nombre ?? '';
            const dir = it.direccion ?? it.Direccion ?? '';
            const loc = it.localidad ?? it.Localidad ?? '';
            const tel = it.telefono ?? it.Telefono ?? '';
            const nunca = !!(it.nuncaVisitado ?? it.NuncaVisitado);
            const dias = it.diasSinVisita ?? it.DiasSinVisita;
            const ultima = fmtFecha(it.ultimaVisita ?? it.UltimaVisita);

            const metaParts = [];
            if (dir) metaParts.push('<i class="fa fa-map-marker"></i>' + escapeHtml(dir));
            if (loc) metaParts.push('<i class="fa fa-building"></i>' + escapeHtml(loc));
            if (tel) metaParts.push('<i class="fa fa-phone"></i>' + escapeHtml(tel));

            let pill;
            let hint;
            if (nunca) {
                pill = '<span class="sv-pill nunca"><i class="fa fa-ban"></i> Sin visitas</span>';
                hint = '<span class="sv-card-hint">No hay registros de visita en recorridos</span>';
            } else {
                pill = `<span class="sv-pill vieja"><i class="fa fa-clock-o"></i> ${dias != null ? dias + ' días' : 'Hace tiempo'}</span>`;
                hint = ultima
                    ? `<span class="sv-card-hint">Última visita · ${escapeHtml(ultima)}</span>`
                    : '<span class="sv-card-hint">Última visita sin fecha registrada</span>';
            }

            return `
            <article class="sv-card">
                <div class="sv-avatar ${nunca ? 'is-nunca' : ''}" aria-hidden="true">${escapeHtml(inicial(nombre))}</div>
                <div class="sv-card-main">
                    <div class="sv-card-top">
                        <h4 class="sv-card-name">${escapeHtml(nombre)}</h4>
                        ${pill}
                    </div>
                    ${metaParts.length ? `<p class="sv-card-meta">${metaParts.join(' &nbsp;·&nbsp; ')}</p>` : ''}
                    <div class="sv-card-foot">${hint}</div>
                </div>
            </article>`;
        }).join('');
    }

    async function init(opts) {
        const tipo = opts.tipo === 'Proveedor' ? 'Proveedor' : 'Cliente';
        const banner = document.getElementById('svBanner');
        const titleEl = document.getElementById('svBannerTitle');
        const subEl = document.getElementById('svBannerSub');
        const modalTitle = document.getElementById('svModalTitle');
        const modalSub = document.getElementById('svModalSub');
        const chip = document.getElementById('svChipCount');
        if (!banner) return;

        try {
            const res = await fetch('/Recorridos/SinVisitaReciente?tipo=' + encodeURIComponent(tipo) + '&dias=30');
            if (!res.ok) return;
            const data = await res.json();
            const items = data.items || data.Items || [];
            const cantidad = data.cantidad ?? data.Cantidad ?? items.length;
            const umbral = data.diasUmbral ?? data.DiasUmbral ?? 30;

            if (cantidad <= 1) {
                banner.hidden = true;
                return;
            }

            const plural = labelEntidad(tipo, true);
            titleEl.textContent = 'Tenés ' + cantidad + ' ' + plural + ' sin visitar';
            subEl.textContent = 'Sin visita en los últimos ' + umbral + ' días (o sin registros de visita).';
            if (modalTitle) {
                modalTitle.textContent = plural.charAt(0).toUpperCase() + plural.slice(1) + ' sin visitar';
            }
            if (modalSub) {
                modalSub.textContent = 'Hace más de ' + umbral + ' días sin visita, o nunca aparecen en un recorrido.';
            }
            if (chip) chip.textContent = cantidad + ' ' + plural;

            banner.hidden = false;
            window.__svItems = items;
            renderList(items, '');

            const btn = document.getElementById('svBannerBtn');
            if (btn) {
                btn.onclick = () => {
                    const modalEl = document.getElementById('svModal');
                    if (!modalEl) return;
                    if (window.bootstrap?.Modal) {
                        window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
                    } else if (window.$) {
                        window.$(modalEl).modal('show');
                    }
                };
            }

            const filtro = document.getElementById('svFiltro');
            if (filtro) {
                filtro.oninput = () => renderList(window.__svItems || [], filtro.value);
            }
        } catch (e) {
            console.warn('VisitasAlert:', e);
        }
    }

    function labelVeces(n) {
        const c = Number(n) || 0;
        return c === 1 ? '1 vez' : (c + ' veces');
    }

    function showResumen(opts) {
        const nombre = (opts && opts.nombre) || 'Sin nombre';
        const tipo = (opts && opts.tipo) === 'Proveedor' ? 'Proveedor' : 'Cliente';
        const s = (opts && opts.stats) || {};
        const dias7 = Number(s.dias7 ?? s.Dias7 ?? 0) || 0;
        const dias15 = Number(s.dias15 ?? s.Dias15 ?? 0) || 0;
        const dias30 = Number(s.dias30 ?? s.Dias30 ?? 0) || 0;

        const title = document.getElementById('svResumenTitle');
        const sub = document.getElementById('svResumenSub');
        const kicker = document.getElementById('svResumenKicker');
        const avatar = document.getElementById('svResumenAvatar');
        const grid = document.getElementById('svResumenGrid');
        const modalEl = document.getElementById('svResumenModal');
        if (!modalEl || !grid) {
            // fallback mínimo
            window.alert(
                nombre + '\n\n' +
                'En los últimos 7 días se lo visitó ' + labelVeces(dias7) + '.\n' +
                'En los últimos 15 días se lo visitó ' + labelVeces(dias15) + '.\n' +
                'En los últimos 30 días se lo visitó ' + labelVeces(dias30) + '.'
            );
            return;
        }

        if (title) title.textContent = nombre;
        if (kicker) kicker.textContent = 'Visitas · ' + labelEntidad(tipo, false);
        if (sub) sub.textContent = 'Cuántas veces apareció como visitado en recorridos';
        if (avatar) avatar.textContent = inicial(nombre);

        const rows = [
            { dias: 7, count: dias7 },
            { dias: 15, count: dias15 },
            { dias: 30, count: dias30 }
        ];

        grid.innerHTML = rows.map(r => {
            const zero = r.count === 0;
            return `
            <article class="sv-stat-card ${zero ? 'is-zero' : ''}">
                <div class="sv-stat-num">${r.count}</div>
                <div class="sv-stat-body">
                    <strong>Últimos ${r.dias} días</strong>
                    <span>Se lo visitó <em>${escapeHtml(labelVeces(r.count))}</em></span>
                </div>
            </article>`;
        }).join('');

        if (window.bootstrap?.Modal) {
            window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
        } else if (window.$) {
            window.$(modalEl).modal('show');
        }
    }

    window.VisitasAlert = { init, showResumen };
})(window);
