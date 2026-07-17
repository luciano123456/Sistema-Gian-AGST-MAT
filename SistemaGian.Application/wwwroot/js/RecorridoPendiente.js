(function () {
    const DISMISS_KEY = 'recPendingDismissUntil';

    function buildMapsUrl(lat, lng) {
        if (lat == null || lng == null) return null;
        const params = new URLSearchParams({
            api: '1',
            destination: Number(lat) + ',' + Number(lng),
            travelmode: 'driving',
            dir_action: 'navigate'
        });
        return 'https://www.google.com/maps/dir/?' + params.toString();
    }

    function markHomeButtons(activo, estado, detalle, enCursoId) {
        const nodes = document.querySelectorAll('[data-rec-home-btn], #btnHomeRecorridos');
        nodes.forEach(el => {
            el.classList.toggle('rec-home-active', !!activo);
            el.classList.toggle('is-en-curso', estado === 'EnCurso');
            el.classList.toggle('is-borrador', estado === 'Borrador');

            if (activo) {
                el.setAttribute('title', detalle || (estado === 'EnCurso'
                    ? 'Tenés un recorrido en curso'
                    : 'Tenés un recorrido pendiente'));
                if (estado === 'EnCurso' && el.tagName === 'A' && enCursoId) {
                    el.setAttribute('href', '/Recorridos?abrir=' + encodeURIComponent(enCursoId));
                }
            } else {
                el.removeAttribute('title');
            }

            let badge = el.querySelector('.rec-home-badge');
            if (activo) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'rec-home-badge';
                    el.appendChild(badge);
                }
                badge.textContent = estado === 'EnCurso' ? 'EN CURSO' : 'PENDIENTE';
            } else if (badge) {
                badge.remove();
            }
        });

        const wrap = document.getElementById('homeRecorridosWrap');
        if (wrap) wrap.classList.toggle('rec-home-wrap-active', !!activo);

        // FAB Inicio en todas las pantallas
        document.querySelectorAll('[data-fab], .fab-wrap').forEach(fab => {
            fab.classList.toggle('rec-fab-active', !!activo && estado === 'EnCurso');
            const main = fab.querySelector('.fab-main');
            if (main) {
                if (activo && estado === 'EnCurso') {
                    main.setAttribute('data-rec-badge', 'EN CURSO');
                    main.setAttribute('title', detalle || 'Tenés un recorrido en curso');
                } else {
                    main.removeAttribute('data-rec-badge');
                }
            }
        });
    }

    function setChip(visible, text) {
        const chip = document.getElementById('recorridoPendienteChip');
        if (!chip) return;
        const label = document.getElementById('recPendingChipText');
        if (label && text) label.textContent = text;
        chip.hidden = !visible;
    }

    async function refresh() {
        const banner = document.getElementById('recorridoPendienteBanner');

        try {
            const res = await fetch('/Recorridos/Pendiente', { credentials: 'same-origin' });
            if (!res.ok) {
                if (banner) banner.hidden = true;
                setChip(false);
                markHomeButtons(false);
                return;
            }
            const data = await res.json();
            const tiene = !!(data.tienePendiente ?? data.TienePendiente);
            const estado = data.estado ?? data.Estado ?? '';
            const nombre = data.nombre ?? data.Nombre ?? 'Recorrido';
            const proxima = data.proximaParadaNombre ?? data.ProximaParadaNombre;
            const enCurso = tiene && estado === 'EnCurso';

            const idHome = data.id ?? data.Id;
            if (tiene && (estado === 'EnCurso' || estado === 'Borrador')) {
                const detalle = estado === 'EnCurso'
                    ? (proxima ? `En curso · visitar a ${proxima}` : `En curso · ${nombre}`)
                    : `Pendiente · ${nombre}`;
                markHomeButtons(true, estado, detalle, estado === 'EnCurso' ? idHome : null);
            } else {
                markHomeButtons(false);
            }

            if (!enCurso) {
                if (banner) banner.hidden = true;
                setChip(false);
                return;
            }

            const tipo = data.proximaParadaTipo ?? data.ProximaParadaTipo ?? '';
            const pendientes = data.paradasPendientes ?? data.ParadasPendientes ?? 0;
            const lat = data.proximaLat ?? data.ProximaLat;
            const lng = data.proximaLng ?? data.ProximaLng;

            const id = data.id ?? data.Id;
            const hrefRec = id ? ('/Recorridos?abrir=' + encodeURIComponent(id)) : '/Recorridos';

            const sub = proxima
                ? `Tenés que visitar a ${proxima}${tipo ? ' (' + tipo + ')' : ''} · ${nombre}` +
                  (pendientes > 1 ? ` · quedan ${pendientes} paradas` : '')
                : `${nombre} · sin paradas pendientes`;

            const chipText = proxima
                ? `En curso · visitar a ${proxima}`
                : `En curso · ${nombre}`;

            // Chip siempre visible mientras esté en curso
            setChip(true, chipText);
            const chip = document.getElementById('recorridoPendienteChip');
            if (chip) chip.href = hrefRec;

            if (!banner) return;

            const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
            const minimizado = until && Date.now() < until;

            if (minimizado) {
                banner.hidden = true;
                return;
            }

            const titleEl = document.getElementById('recPendingTitle');
            const subEl = document.getElementById('recPendingSub');
            if (titleEl) titleEl.textContent = 'Recorrido en curso';
            if (subEl) subEl.textContent = sub;

            const bannerLink = document.getElementById('recPendingBannerLink');
            if (bannerLink) bannerLink.href = hrefRec;

            const link = document.getElementById('recPendingContinue');
            if (link) link.href = hrefRec;

            const mapsBtn = document.getElementById('recPendingMaps');
            if (mapsBtn) {
                const url = buildMapsUrl(lat, lng);
                if (url) {
                    mapsBtn.href = url;
                    mapsBtn.hidden = false;
                } else {
                    mapsBtn.hidden = true;
                }
            }

            banner.hidden = false;
            banner.classList.add('is-en-curso');
        } catch (err) {
            console.warn('RecorridoPendiente:', err);
            if (banner) banner.hidden = true;
            setChip(false);
            markHomeButtons(false);
        }
    }

    function wire() {
        const btn = document.getElementById('recPendingDismiss');
        if (btn) {
            btn.addEventListener('click', () => {
                // Solo minimiza el banner grande; el chip sigue visible
                localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 60 * 1000));
                const banner = document.getElementById('recorridoPendienteBanner');
                if (banner) banner.hidden = true;
            });
        }
        refresh();
        setInterval(refresh, 30000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) refresh();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wire);
    } else {
        wire();
    }

    window.RecorridoBanner = { refresh };
})();
