(function () {
    let state = {
        recorridoId: null,
        paradaId: null,
        lat: null,
        lng: null,
        busy: false
    };

    function pick(...vals) {
        for (const v of vals) {
            if (v === undefined || v === null || v === '') continue;
            return v;
        }
        return null;
    }

    function pickId(...vals) {
        for (const v of vals) {
            if (v === undefined || v === null || v === '') continue;
            const n = Number(v);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return null;
    }

    function isResuelta(est) {
        const e = String(est || 'Pendiente').trim().toLowerCase();
        return e === 'visitada' || e === 'omitida';
    }

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

    let toastHideTimer = null;

    function toast(msg, type) {
        // En pantalla Recorridos usamos su toast; en Home / resto, el toast del chip.
        if (window.RecorridosApp?.toast && document.querySelector('.rec-app')) {
            window.RecorridosApp.toast(msg, type || undefined);
            return;
        }

        const el = document.getElementById('recPendingToast');
        const text = document.getElementById('recPendingToastText');
        if (el && text) {
            const t = type || 'info';
            text.textContent = msg || '';
            el.classList.remove('is-show', 'is-hide', 'is-success', 'is-error', 'is-warn', 'is-info');
            el.classList.add('is-' + (t === 'success' || t === 'error' || t === 'warn' ? t : 'info'));
            el.hidden = false;
            // reflow para reiniciar animación
            void el.offsetWidth;
            el.classList.add('is-show');
            if (toastHideTimer) clearTimeout(toastHideTimer);
            toastHideTimer = setTimeout(() => {
                el.classList.add('is-hide');
                el.classList.remove('is-show');
                setTimeout(() => { el.hidden = true; el.classList.remove('is-hide'); }, 280);
            }, t === 'success' ? 4200 : 3200);
            return;
        }

        if (type === 'success' && window.toastr?.success) {
            toastr.success(msg);
            return;
        }
        if (window.toastr?.info) {
            toastr.info(msg);
            return;
        }
        try { console.log(msg); } catch { /* ignore */ }
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

    function setChipVisible(visible) {
        const chip = document.getElementById('recorridoPendienteChip');
        if (!chip) return;
        chip.hidden = !visible;
        if (visible) restoreChipPos(chip);
    }

    const LS_CHIP_POS = 'rec_pending_chip_pos';
    const CHIP_HOLD_MS = 500;

    function restoreChipPos(chip) {
        try {
            const raw = localStorage.getItem(LS_CHIP_POS);
            if (!raw) return;
            const pos = JSON.parse(raw);
            if (pos && Number.isFinite(Number(pos.left)) && Number.isFinite(Number(pos.top))) {
                applyChipPos(chip, Number(pos.left), Number(pos.top));
                chip.classList.add('is-custom-pos');
            }
        } catch { /* ignore */ }
    }

    function applyChipPos(chip, left, top) {
        const w = chip.offsetWidth || 200;
        const h = chip.offsetHeight || 48;
        const L = Math.max(8, Math.min(left, Math.max(8, window.innerWidth - w - 8)));
        const T = Math.max(8, Math.min(top, Math.max(8, window.innerHeight - h - 8)));
        chip.style.left = L + 'px';
        chip.style.top = T + 'px';
        chip.style.right = 'auto';
        chip.style.bottom = 'auto';
        return { left: L, top: T };
    }

    function enableChipDrag() {
        const chip = document.getElementById('recorridoPendienteChip');
        if (!chip || chip.dataset.dragWired === '1') return;
        chip.dataset.dragWired = '1';

        let holdTimer = null;
        let dragArmed = false;
        let dragging = false;
        let tracking = false;
        let skipNextClick = false;
        let startX = 0, startY = 0, lastX = 0, lastY = 0, offsetX = 0, offsetY = 0;

        function clearHold() {
            if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
            chip.classList.remove('is-holding');
        }

        function armDrag(x, y) {
            dragArmed = true;
            chip.classList.remove('is-holding');
            chip.classList.add('is-drag-ready');
            const rect = chip.getBoundingClientRect();
            offsetX = x - rect.left;
            offsetY = y - rect.top;
            try { if (navigator.vibrate) navigator.vibrate(18); } catch { /* ignore */ }
        }

        function detach() {
            document.removeEventListener('mousemove', onMoveMouse, true);
            document.removeEventListener('mouseup', onUp, true);
            document.removeEventListener('touchmove', onMoveTouch, true);
            document.removeEventListener('touchend', onUp, true);
            document.removeEventListener('touchcancel', onUp, true);
        }

        function endTrack() {
            if (!tracking) return;
            tracking = false;
            clearHold();
            if (dragging) {
                const rect = chip.getBoundingClientRect();
                const pos = applyChipPos(chip, rect.left, rect.top);
                try { localStorage.setItem(LS_CHIP_POS, JSON.stringify(pos)); } catch { /* ignore */ }
                chip.classList.add('is-custom-pos');
                skipNextClick = true;
            } else if (dragArmed) {
                skipNextClick = true;
            }
            dragging = false;
            dragArmed = false;
            chip.classList.remove('is-drag-ready', 'is-dragging', 'is-holding');
            detach();
        }

        function onMove(x, y) {
            lastX = x;
            lastY = y;
            if (!dragArmed) {
                if (Math.hypot(x - startX, y - startY) > 14) clearHold();
                return;
            }
            dragging = true;
            chip.classList.add('is-dragging');
            applyChipPos(chip, x - offsetX, y - offsetY);
        }

        function onMoveMouse(e) {
            if (!tracking) return;
            onMove(e.clientX, e.clientY);
        }

        function onMoveTouch(e) {
            if (!tracking || !e.touches[0]) return;
            if (dragArmed) e.preventDefault();
            onMove(e.touches[0].clientX, e.touches[0].clientY);
        }

        function onUp() { endTrack(); }

        function isActionTarget(t) {
            return !!(t && t.closest && t.closest('.rec-chip-btn, .rec-pending-chip-actions'));
        }

        function startHold(x, y) {
            tracking = true;
            dragArmed = false;
            dragging = false;
            startX = lastX = x;
            startY = lastY = y;
            chip.classList.add('is-holding');
            clearHold();
            holdTimer = setTimeout(() => {
                if (!tracking) return;
                armDrag(lastX, lastY);
            }, CHIP_HOLD_MS);
        }

        restoreChipPos(chip);

        // Click derecho 0.5s en el cuerpo del chip → mover (igual que botón Inicio)
        chip.addEventListener('contextmenu', (e) => {
            if (!isActionTarget(e.target)) e.preventDefault();
        });

        chip.addEventListener('mousedown', (e) => {
            if (e.button !== 2) return;
            if (isActionTarget(e.target)) return;
            e.preventDefault();
            startHold(e.clientX, e.clientY);
            document.addEventListener('mousemove', onMoveMouse, true);
            document.addEventListener('mouseup', onUp, true);
        });

        // Táctil: long-press 0.5s (no hay click derecho)
        chip.addEventListener('touchstart', (e) => {
            if (!e.touches[0] || isActionTarget(e.target)) return;
            startHold(e.touches[0].clientX, e.touches[0].clientY);
            document.addEventListener('touchmove', onMoveTouch, { capture: true, passive: false });
            document.addEventListener('touchend', onUp, true);
            document.addEventListener('touchcancel', onUp, true);
        }, { passive: true });

        chip.addEventListener('click', (e) => {
            if (!skipNextClick) return;
            e.preventDefault();
            e.stopPropagation();
            skipNextClick = false;
        }, true);

        window.addEventListener('resize', () => {
            if (!chip.classList.contains('is-custom-pos') || chip.hidden) return;
            const rect = chip.getBoundingClientRect();
            const pos = applyChipPos(chip, rect.left, rect.top);
            try { localStorage.setItem(LS_CHIP_POS, JSON.stringify(pos)); } catch { /* ignore */ }
        });
    }

    function setActionButtonsEnabled(enabled) {
        const btnVisit = document.getElementById('recChipVisit');
        const btnOmit = document.getElementById('recChipOmit');
        const on = !!enabled && !state.busy;
        if (btnVisit) btnVisit.disabled = !on;
        if (btnOmit) btnOmit.disabled = !on;
    }

    function applyChipActions(data) {
        const id = pickId(data.id, data.Id);
        const paradaId = pickId(data.proximaParadaId, data.ProximaParadaId, data.paradaId, data.ParadaId);
        const lat = pick(data.proximaLat, data.ProximaLat);
        const lng = pick(data.proximaLng, data.ProximaLng);
        const hrefRec = id ? ('/Recorridos?abrir=' + encodeURIComponent(id)) : '/Recorridos';

        state.recorridoId = id;
        if (paradaId) state.paradaId = paradaId;
        state.lat = lat;
        state.lng = lng;

        const label = document.getElementById('recPendingChipText');
        const proxima = pick(data.proximaParadaNombre, data.ProximaParadaNombre);
        const nombre = pick(data.nombre, data.Nombre) || 'Recorrido';
        if (label) {
            label.textContent = proxima
                ? ('En curso · ' + proxima)
                : ('En curso · ' + nombre);
            label.title = label.textContent;
        }

        const btnMaps = document.getElementById('recChipMaps');
        const btnOpen = document.getElementById('recChipOpen');

        // Habilitar si hay parada resuelta O si hay recorrido en curso (se resuelve al click)
        const canAct = !!state.paradaId || !!state.recorridoId;
        setActionButtonsEnabled(canAct);

        if (btnMaps) {
            const url = buildMapsUrl(lat, lng);
            if (url) {
                btnMaps.href = url;
                btnMaps.hidden = false;
            } else {
                btnMaps.hidden = true;
                btnMaps.removeAttribute('href');
            }
        }

        if (btnOpen) btnOpen.href = hrefRec;
    }

    async function resolveParadaId(recorridoId) {
        if (!recorridoId) return null;
        try {
            const res = await fetch('/Recorridos/Obtener?id=' + encodeURIComponent(recorridoId), {
                credentials: 'same-origin'
            });
            if (!res.ok) return null;
            const data = await res.json();
            const paradas = data.paradas || data.Paradas || [];
            const next = paradas.find(p => !isResuelta(p.estadoParada ?? p.EstadoParada));
            if (!next) return null;
            return pickId(next.id, next.Id);
        } catch (e) {
            console.warn('RecorridoPendiente resolve:', e);
            return null;
        }
    }

    async function ensureParadaId() {
        if (pickId(state.paradaId)) return state.paradaId;
        if (!state.recorridoId) return null;
        const id = await resolveParadaId(state.recorridoId);
        if (id) state.paradaId = id;
        return id;
    }

    async function marcarParada(estado, notas) {
        if (state.busy) return;

        state.busy = true;
        setActionButtonsEnabled(false);

        try {
            const paradaId = await ensureParadaId();
            if (!paradaId) {
                toast('No hay una parada pendiente para marcar');
                return;
            }

            const params = new URLSearchParams({
                idParada: String(paradaId),
                estado: estado
            });
            if (notas) params.set('notas', notas);

            const res = await fetch('/Recorridos/MarcarParada?' + params.toString(), {
                method: 'POST',
                credentials: 'same-origin'
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !(data.valor ?? data.Valor)) {
                toast(data.mensaje || data.Mensaje || 'No se pudo actualizar la parada');
                return;
            }
            if (data.finalizado || data.Finalizado) toast('¡Has finalizado el recorrido!', 'success');
            else toast(estado === 'Visitada' ? 'Parada visitada' : 'Parada omitida · siguiente');

            state.paradaId = null;
            await refresh();
            if (window.RecorridosApp?.reloadIfOpen) {
                try { window.RecorridosApp.reloadIfOpen(); } catch { /* ignore */ }
            }
        } catch (e) {
            console.warn(e);
            toast('Error de red al actualizar la parada');
        } finally {
            state.busy = false;
            await refresh();
        }
    }

    async function refresh() {
        try {
            const res = await fetch('/Recorridos/Pendiente', { credentials: 'same-origin' });
            if (!res.ok) {
                setChipVisible(false);
                markHomeButtons(false);
                return;
            }
            const data = await res.json();
            const tiene = !!(data.tienePendiente ?? data.TienePendiente);
            const estado = pick(data.estado, data.Estado) || '';
            const nombre = pick(data.nombre, data.Nombre) || 'Recorrido';
            const proxima = pick(data.proximaParadaNombre, data.ProximaParadaNombre);
            const enCurso = tiene && estado === 'EnCurso';
            const idHome = pickId(data.id, data.Id);

            if (tiene && (estado === 'EnCurso' || estado === 'Borrador')) {
                const detalle = estado === 'EnCurso'
                    ? (proxima ? `En curso · visitar a ${proxima}` : `En curso · ${nombre}`)
                    : `Pendiente · ${nombre}`;
                markHomeButtons(true, estado, detalle, estado === 'EnCurso' ? idHome : null);
            } else {
                markHomeButtons(false);
            }

            if (!enCurso) {
                setChipVisible(false);
                state = { recorridoId: null, paradaId: null, lat: null, lng: null, busy: false };
                return;
            }

            setChipVisible(true);
            applyChipActions(data);

            // Si el API no mandó Id de parada, resolverlo en segundo plano
            if (!pickId(state.paradaId) && state.recorridoId) {
                const resolved = await resolveParadaId(state.recorridoId);
                if (resolved) {
                    state.paradaId = resolved;
                    setActionButtonsEnabled(true);
                } else if (!proxima) {
                    // Sin pendientes reales
                    setActionButtonsEnabled(false);
                }
            }
        } catch (err) {
            console.warn('RecorridoPendiente:', err);
            setChipVisible(false);
            markHomeButtons(false);
        }
    }

    function abrirModalOmitirChip() {
        const modal = document.getElementById('recChipModalOmitir');
        const ta = document.getElementById('txtChipOmitirObs');
        const sub = document.getElementById('recChipOmitSub');
        const err = document.getElementById('recChipOmitirError');
        const label = document.getElementById('recPendingChipText')?.textContent || '';
        if (sub) {
            sub.textContent = label
                ? `Omitir «${label.replace(/^En curso ·\s*/, '')}»: indicá por qué no se visitó.`
                : 'Indicá por qué no se visitó (cerrado, no estaba, etc.).';
        }
        if (ta) {
            ta.value = '';
            ta.classList.remove('is-invalid');
        }
        if (err) {
            err.hidden = true;
            err.classList.remove('is-shake');
        }
        if (modal) modal.hidden = false;
        setTimeout(() => ta?.focus(), 50);
    }

    function cerrarModalOmitirChip() {
        const modal = document.getElementById('recChipModalOmitir');
        if (modal) modal.hidden = true;
    }

    async function confirmarOmitirChip() {
        const ta = document.getElementById('txtChipOmitirObs');
        const err = document.getElementById('recChipOmitirError');
        const nota = String(ta?.value || '').trim();
        if (!nota) {
            if (err) {
                err.hidden = false;
                err.classList.remove('is-shake');
                void err.offsetWidth;
                err.classList.add('is-shake');
            }
            if (ta) {
                ta.classList.add('is-invalid');
                ta.focus();
            }
            return;
        }
        cerrarModalOmitirChip();
        await marcarParada('Omitida', nota);
    }

    function wire() {
        if (window.__recPendienteWired) return;
        window.__recPendienteWired = true;

        document.getElementById('recChipVisit')?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await marcarParada('Visitada');
        });

        document.getElementById('recChipOmit')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            abrirModalOmitirChip();
        });

        document.getElementById('btnChipConfirmarOmitir')?.addEventListener('click', (e) => {
            e.preventDefault();
            confirmarOmitirChip();
        });

        document.querySelectorAll('[data-chip-omit-close]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                cerrarModalOmitirChip();
            });
        });

        document.getElementById('txtChipOmitirObs')?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                cerrarModalOmitirChip();
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                confirmarOmitirChip();
            }
        });

        document.getElementById('txtChipOmitirObs')?.addEventListener('input', () => {
            const err = document.getElementById('recChipOmitirError');
            const ta = document.getElementById('txtChipOmitirObs');
            if (err) err.hidden = true;
            if (ta) ta.classList.remove('is-invalid');
        });

        document.querySelector('.rec-pending-chip-actions')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        enableChipDrag();

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
