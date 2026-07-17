(function () {
    const state = {
        map: null,
        directionsService: null,
        directionsRenderer: null,
        geocoder: null,
        autocomplete: null,
        clientes: [],
        markers: [],
        paradas: [],
        origen: null,
        origenMarker: null,
        dragIndex: null,
        recorridoId: 0,
        estado: 'Borrador',
        distanciaMetros: null,
        duracionSegundos: null,
        activeInfo: null,
        tipoDestino: 'Clientes',
        puntos: [],
        routePolylines: [],
        lastOverviewPolyline: null,
        ultimaPlantilla: null,
        soloLectura: false,
        esAdmin: false,
        vistaUsuarioId: 0,
        vistaUsuarioNombre: ''
    };

    (function initVistaAdmin() {
        const v = window.__recorridosVista || {};
        state.vistaUsuarioId = Number(v.vistaUsuarioId || 0);
        state.vistaUsuarioNombre = v.vistaUsuarioNombre || '';
        state.soloLectura = state.vistaUsuarioId > 0;
        state.esAdmin = !!v.esAdmin;
    })();

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => [...document.querySelectorAll(sel)];

    function toastTypeFromMsg(msg) {
        const t = String(msg || '').toLowerCase();
        if (/completado|finalizado|guardado|visitada|omitida|exportado|pdf listo|excel|agregado|aplicada|dibujada|abierto|abierta|gps|abriendo|en curso ·|has iniciado|iniciado el recorrido|has finalizado|eliminado/.test(t)) {
            return 'success';
        }
        if (/no se pudo|error|permití|cerrado|solo lectura|antes de|tenés que|escribí|supera/.test(t)) {
            return 'error';
        }
        if (/pendiente|otro en curso|definir|agregá|maps no|histórico/.test(t)) {
            return 'warn';
        }
        return 'info';
    }

    function toastIcon(type) {
        if (type === 'success') return '<i class="fa fa-check-circle" aria-hidden="true"></i>';
        if (type === 'error') return '<i class="fa fa-exclamation-circle" aria-hidden="true"></i>';
        if (type === 'warn') return '<i class="fa fa-info-circle" aria-hidden="true"></i>';
        return '<i class="fa fa-bell" aria-hidden="true"></i>';
    }

    function toast(msg, type) {
        const el = $('#recToast');
        if (!el) return;
        const kind = type || toastTypeFromMsg(msg);
        el.hidden = false;
        el.className = 'rec-toast is-' + kind;
        el.innerHTML = '<span class="rec-toast-icon">' + toastIcon(kind) + '</span>'
            + '<span class="rec-toast-text"></span>'
            + '<span class="rec-toast-shine" aria-hidden="true"></span>';
        const text = el.querySelector('.rec-toast-text');
        if (text) text.textContent = msg;

        // retrigger enter animation
        el.classList.remove('is-show');
        void el.offsetWidth;
        el.classList.add('is-show');

        clearTimeout(toast._t);
        toast._t = setTimeout(() => {
            el.classList.remove('is-show');
            el.classList.add('is-hide');
            setTimeout(() => {
                el.hidden = true;
                el.classList.remove('is-hide');
            }, 280);
        }, 3800);
    }

    function fmtKm(m) {
        if (m == null) return '—';
        return (m / 1000).toFixed(1) + ' km';
    }

    function fmtTime(s) {
        if (s == null) return '—';
        const mins = Math.round(s / 60);
        if (mins < 60) return mins + ' min';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h + ' h ' + m + ' m';
    }

    function labelEstado(estado) {
        switch (estado) {
            case 'EnCurso': return 'En curso';
            case 'Finalizado': return 'Finalizado';
            case 'Cancelado': return 'Cancelado';
            case 'Borrador':
            default: return 'Armando ruta';
        }
    }

    function updateStats() {
        $('#statParadas').textContent = state.paradas.length;
        $('#statDist').textContent = fmtKm(state.distanciaMetros);
        $('#statTime').textContent = fmtTime(state.duracionSegundos);
        $('#recEstadoPill').textContent = labelEstado(state.estado);
        lockEditorSegunEstado();
    }

    function refrescarRutaAuto() {
        if (!state.map || !state.directionsService) return;
        if (!state.origen || state.paradas.length < 1) {
            limpiarRutaDibujada();
            state.lastOverviewPolyline = null;
            state.distanciaMetros = null;
            state.duracionSegundos = null;
            updateStats();
            return;
        }
        dibujarRuta(false, true);
    }

    function paradaResuelta(p) {
        const est = p.estadoParada || 'Pendiente';
        return est === 'Visitada' || est === 'Omitida';
    }

    function indiceParadaActual() {
        if (state.estado !== 'EnCurso') return -1;
        return state.paradas.findIndex(p => !paradaResuelta(p));
    }

    function esCerrado() {
        return state.estado === 'Finalizado' || state.estado === 'Cancelado';
    }

    function esEditable() {
        return !state.soloLectura && !esCerrado();
    }

    /** Durante EnCurso no se agregan ni quitan paradas (solo visitar/omitir). */
    function puedeEditarParadas() {
        return esEditable() && state.estado !== 'EnCurso';
    }

    function visualParada(p, idx) {
        const est = p.estadoParada || 'Pendiente';
        if (est === 'Visitada') return 'visitada';
        if (est === 'Omitida') return 'omitida';
        if (state.estado === 'EnCurso') {
            return idx === indiceParadaActual() ? 'actual' : 'pendiente';
        }
        // Finalizado / Cancelado / historial: mostrar tal cual quedó
        if (esCerrado()) return 'pendiente';
        return 'enruta';
    }

    function colorMarcador(visual, tipoEntidad) {
        if (visual === 'visitada') return '#22c55e';
        if (visual === 'omitida') return '#ef4444';
        if (visual === 'actual') return '#38bdf8';
        if (visual === 'pendiente') return '#f97316';
        if (visual === 'enruta') return tipoEntidad === 'Proveedor' ? '#a855f7' : '#ef4444';
        return tipoEntidad === 'Proveedor' ? '#8b5cf6' : '#e11d48';
    }

    function claveParada(p) {
        const tipo = p.tipoParada || p.TipoParada || 'Cliente';
        const id = tipo === 'Proveedor'
            ? (p.idProveedor ?? p.IdProveedor)
            : (p.idCliente ?? p.IdCliente);
        return `${tipo}:${id}`;
    }

    function setTipoDestino(tipo, opts = {}) {
        const nuevo = tipo || 'Clientes';

        if (!opts.force && state.soloLectura) {
            toast('Solo lectura');
            syncTipoDestinoUi();
            return;
        }

        // En curso: no se cambia el destino (parecería un recorrido nuevo)
        if (!opts.force && state.estado === 'EnCurso') {
            toast('El recorrido está en curso: no se puede cambiar el destino');
            syncTipoDestinoUi();
            return;
        }

        if (!opts.force && state.estado === 'Finalizado') {
            toast('Este recorrido ya está finalizado');
            syncTipoDestinoUi();
            return;
        }

        state.tipoDestino = nuevo;
        syncTipoDestinoUi();

        // Solo cambia qué puntos se muestran en el mapa para agregar.
        // NUNCA borra paradas ya armadas.
        if (!opts.skipCargarPuntos) cargarPuntos();
        lockEditorSegunEstado();
    }

    function syncTipoDestinoUi() {
        $$('#recTipoDestino .rec-dest-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tipo === state.tipoDestino);
        });

        const buscar = $('#txtBuscarClienteMapa');
        if (buscar) {
            buscar.placeholder = state.tipoDestino === 'Proveedores'
                ? 'Filtrar proveedores en el mapa...'
                : state.tipoDestino === 'Ambos'
                    ? 'Filtrar clientes y proveedores...'
                    : 'Filtrar clientes en el mapa...';
        }
    }

    function lockEditorSegunEstado() {
        const enCurso = state.estado === 'EnCurso';
        const cerrado = esCerrado();
        const bloqueado = !esEditable() || enCurso;

        $$('#recTipoDestino .rec-dest-btn').forEach(b => {
            b.disabled = bloqueado;
            b.classList.toggle('is-locked', bloqueado);
            b.title = bloqueado
                ? (state.soloLectura ? 'Solo lectura' : (enCurso ? 'Bloqueado: recorrido en curso' : 'Recorrido cerrado'))
                : '';
        });

        const toggle = $('#recTipoDestino');
        if (toggle) toggle.classList.toggle('is-locked', bloqueado);

        const btnNuevo = $('#btnNuevoRecorrido');
        if (btnNuevo) {
            btnNuevo.disabled = state.soloLectura || enCurso;
            btnNuevo.classList.toggle('is-locked', state.soloLectura || enCurso);
            btnNuevo.title = state.soloLectura
                ? 'Solo lectura'
                : (enCurso ? 'No podés crear otro: tenés un recorrido en curso' : 'Nuevo recorrido');
        }

        const readonly = state.soloLectura || cerrado;
        ['#btnGuardarRecorrido', '#btnIniciarRecorrido', '#btnFinalizarRecorrido', '#btnOptimizar', '#btnMiUbicacion']
            .forEach(sel => {
                const el = $(sel);
                if (!el) return;
                if (sel === '#btnFinalizarRecorrido') {
                    el.disabled = state.soloLectura || cerrado || state.estado === 'Borrador';
                } else if (sel === '#btnIniciarRecorrido') {
                    el.disabled = readonly || enCurso;
                } else {
                    el.disabled = readonly;
                }
                el.classList.toggle('is-locked', el.disabled);
            });

        const nombre = $('#txtRecNombre');
        const origen = $('#txtOrigen');
        if (nombre) nombre.readOnly = readonly;
        if (origen) origen.readOnly = readonly;

        if (state.origenMarker) {
            try { state.origenMarker.setDraggable(!readonly && !enCurso); } catch { /* ignore */ }
        }

        document.getElementById('recApp')?.classList.toggle('rec-solo-lectura', state.soloLectura || cerrado);
    }

    function bootSvg(color) {
        // Botita simple, relleno con color
        return `
        <svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="${color}" stroke="#fff" stroke-width="3" stroke-linejoin="round"
                d="M14 40c0-8 4-14 12-16l4-12c1-3 4-5 7-5h2c3 0 5 3 4 6l-3 11h8c7 0 12 4 12 10v4c0 2-2 4-4 4H18c-2 0-4-2-4-4v-0z"/>
            <path fill="rgba(0,0,0,.18)" d="M18 48h36c1 0 2 1 2 2v2H16v-2c0-1 1-2 2-2z"/>
            <circle cx="28" cy="34" r="2.2" fill="rgba(255,255,255,.55)"/>
            <circle cx="35" cy="34" r="2.2" fill="rgba(255,255,255,.55)"/>
            <circle cx="42" cy="34" r="2.2" fill="rgba(255,255,255,.55)"/>
        </svg>`;
    }

    function createBootOverlay(position, opts) {
        const overlay = new google.maps.OverlayView();
        overlay._pos = position;
        overlay._opts = opts;
        overlay._div = null;

        overlay.onAdd = function () {
            const div = document.createElement('div');
            div.className = 'rec-boot-marker' +
                (opts.visual ? ` is-${opts.visual}` : '') +
                (opts.isActual ? ' is-actual' : '');
            div.title = opts.title || '';
            div.innerHTML = `
                <div class="rec-boot-shadow"></div>
                <div class="rec-boot-icon">${bootSvg(opts.color)}</div>
                ${opts.isActual ? '<span class="rec-boot-pulse"></span>' : ''}`;
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof opts.onClick === 'function') opts.onClick();
            });
            overlay._div = div;
            const panes = overlay.getPanes();
            panes.overlayMouseTarget.appendChild(div);
        };

        overlay.draw = function () {
            if (!overlay._div) return;
            const projection = overlay.getProjection();
            if (!projection) return;
            const point = projection.fromLatLngToDivPixel(new google.maps.LatLng(overlay._pos.lat, overlay._pos.lng));
            if (!point) return;
            overlay._div.style.left = point.x + 'px';
            overlay._div.style.top = point.y + 'px';
            overlay._div.style.zIndex = String(opts.zIndex || 10);
        };

        overlay.onRemove = function () {
            if (overlay._div?.parentNode) overlay._div.parentNode.removeChild(overlay._div);
            overlay._div = null;
        };

        overlay.setMap(state.map);
        return overlay;
    }

    function clearMarkers() {
        if (state.activeInfo) {
            state.activeInfo.close();
            state.activeInfo = null;
        }
        state.markers.forEach(m => {
            if (m.setMap) m.setMap(null);
        });
        state.markers = [];
    }

    function styleInfoWindowChrome() {
        document.querySelectorAll('.gm-style-iw-c').forEach(el => {
            el.classList.add('rec-iw-chrome');
        });
        document.querySelectorAll('.gm-style-iw-d').forEach(el => {
            el.style.overflow = 'hidden';
            el.style.maxHeight = 'none';
        });
        document.querySelectorAll('.gm-style-iw-chr button, .gm-ui-hover-effect').forEach(btn => {
            btn.classList.add('rec-iw-close');
        });
    }

    function drawClientMarkers(filter = '', opts = {}) {
        if (!state.map) return;
        clearMarkers();
        const q = (filter || '').toLowerCase().trim();
        const bounds = new google.maps.LatLngBounds();
        let any = false;
        const idxActual = indiceParadaActual();

        state.puntos.forEach(c => {
            const hay = !q || (c.nombre || '').toLowerCase().includes(q) ||
                (c.direccion || '').toLowerCase().includes(q) ||
                (c.localidad || '').toLowerCase().includes(q) ||
                (c.apodo || '').toLowerCase().includes(q);
            if (!hay) return;

            const pos = { lat: Number(c.latitud), lng: Number(c.longitud) };
            const idxParada = state.paradas.findIndex(p => claveParada(p) === claveParada({
                tipoParada: c.tipo,
                idCliente: c.tipo === 'Cliente' ? c.id : null,
                idProveedor: c.tipo === 'Proveedor' ? c.id : null
            }));
            const inRoute = idxParada >= 0;
            const visual = inRoute ? visualParada(state.paradas[idxParada], idxParada) : 'cliente';
            const fill = colorMarcador(visual, c.tipo);
            const isActual = visual === 'actual';

            const addr = c.direccionMaps || c.direccion || 'Sin dirección';
            const tel = c.telefono ? escapeHtml(c.telefono) : '';
            const loc = [c.localidad, c.provincia, c.apodo].filter(Boolean).join(', ');
            const puedeVisitar = state.estado === 'EnCurso' && !state.soloLectura && idxParada === idxActual;
            const tipoLabel = c.tipo === 'Proveedor' ? 'Proveedor' : 'Cliente';
            let actionHtml;
            if (puedeVisitar) {
                actionHtml = `<button type="button" class="rec-iw-btn" id="btnVisit_${c.tipo}_${c.id}"><i class="fa fa-check"></i> Marcar visitada</button>`
                    + `<button type="button" class="rec-iw-btn rec-iw-btn-omit" id="btnOmit_${c.tipo}_${c.id}"><i class="fa fa-forward"></i> Omitir</button>`;
            } else if (inRoute) {
                actionHtml = `<button type="button" class="rec-iw-btn is-added" disabled><i class="fa fa-check"></i> ${escapeHtml(labelVisual(visual))}</button>`;
            } else if (puedeEditarParadas()) {
                actionHtml = `<button type="button" class="rec-iw-btn" id="btnAdd_${c.tipo}_${c.id}"><i class="fa fa-plus"></i> Agregar a ruta</button>`;
            } else if (state.estado === 'EnCurso') {
                actionHtml = `<button type="button" class="rec-iw-btn is-added" disabled><i class="fa fa-lock"></i> Recorrido en curso</button>`;
            } else {
                actionHtml = `<button type="button" class="rec-iw-btn is-added" disabled><i class="fa fa-eye"></i> Solo lectura</button>`;
            }

            const info = new google.maps.InfoWindow({
                maxWidth: 320,
                pixelOffset: new google.maps.Size(0, -28),
                content: `
                <div class="rec-iw">
                    <div class="rec-iw-top">
                        <div class="rec-iw-avatar" style="background:${fill}33;color:${fill};border-color:${fill}55">${bootSvg(fill)}</div>
                        <div class="rec-iw-titles">
                            <strong class="rec-iw-name">${escapeHtml(c.nombre)}</strong>
                            <span class="rec-iw-loc"><i class="fa fa-tag"></i> ${tipoLabel}</span>
                            ${loc ? `<span class="rec-iw-loc"><i class="fa fa-map-pin"></i> ${escapeHtml(loc)}</span>` : ''}
                            ${inRoute ? `<span class="rec-stop-badge ${visual}">${labelVisual(visual)}</span>` : ''}
                        </div>
                    </div>
                    <div class="rec-iw-addr">
                        <i class="fa fa-map-marker"></i>
                        <span>${escapeHtml(addr)}</span>
                    </div>
                    ${tel ? `<div class="rec-iw-tel"><i class="fa fa-phone"></i> ${tel}</div>` : ''}
                    <div class="rec-iw-actions">${actionHtml}</div>
                </div>`
            });

            const openInfo = () => {
                if (state.activeInfo) state.activeInfo.close();
                state.activeInfo = info;
                info.setPosition(pos);
                info.open({ map: state.map });
                google.maps.event.addListenerOnce(info, 'domready', () => {
                    styleInfoWindowChrome();
                    const bAdd = document.getElementById(`btnAdd_${c.tipo}_${c.id}`);
                    if (bAdd) {
                        bAdd.onclick = () => {
                            addParadaFromPunto(c);
                            info.close();
                        };
                    }
                    const bVisit = document.getElementById(`btnVisit_${c.tipo}_${c.id}`);
                    if (bVisit) {
                        bVisit.onclick = async () => {
                            await marcarParadaVisitada(idxParada);
                            info.close();
                        };
                    }
                    const bOmit = document.getElementById(`btnOmit_${c.tipo}_${c.id}`);
                    if (bOmit) {
                        bOmit.onclick = () => {
                            info.close();
                            abrirModalOmitir(idxParada);
                        };
                    }
                });
            };

            const boot = createBootOverlay(pos, {
                color: fill,
                visual,
                isActual,
                title: `${c.nombre} (${tipoLabel})` + (inRoute ? ` · ${labelVisual(visual)}` : ''),
                zIndex: isActual ? 999 : (inRoute ? 50 : 10),
                onClick: openInfo
            });

            state.markers.push(boot);
            bounds.extend(pos);
            any = true;
        });

        if (state.origen) bounds.extend(state.origen);
        if (any && opts.fit) state.map.fitBounds(bounds, 60);
    }

    function highlightRouteMarkers() {
        drawClientMarkers($('#txtBuscarClienteMapa')?.value || '', { fit: false });
    }

    function labelVisual(visual) {
        switch (visual) {
            case 'visitada': return 'Visitado';
            case 'omitida': return 'Omitido';
            case 'actual': return 'Siguiente visita';
            case 'pendiente':
                return esCerrado() ? 'No visitado' : 'Pendiente';
            default: return 'En ruta';
        }
    }

    let omitirIdxPendiente = null;

    function abrirModalOmitir(idx) {
        omitirIdxPendiente = idx;
        const p = state.paradas[idx];
        const sub = $('#recOmitirSub');
        if (sub) {
            sub.textContent = p
                ? `Omitir «${p.nombreCliente || 'parada'}»: indicá por qué no se visitó (cerrado, no estaba, etc.).`
                : 'Indicá por qué no se visitó (cerrado, no estaba, etc.).';
        }
        const ta = $('#txtOmitirObs');
        if (ta) ta.value = '';
        const err = $('#recOmitirError');
        if (err) {
            err.hidden = true;
            err.classList.remove('is-shake');
        }
        if (ta) ta.classList.remove('is-invalid');
        const modal = $('#recModalOmitir');
        if (modal) modal.hidden = false;
        setTimeout(() => ta?.focus(), 50);
    }

    function cerrarModalOmitir() {
        const modal = $('#recModalOmitir');
        if (modal) modal.hidden = true;
        omitirIdxPendiente = null;
    }

    function abrirModalObs(idx) {
        const p = state.paradas[idx];
        if (!p) return;
        const title = $('#recObsTitle');
        if (title) title.textContent = 'Observación · ' + (p.nombreCliente || 'Parada');
        const texto = $('#recObsTexto');
        if (texto) texto.textContent = (p.notas || '').trim() || '(Sin observación)';
        const modal = $('#recModalVerObs');
        if (modal) modal.hidden = false;
    }

    function cerrarModalObs() {
        const modal = $('#recModalVerObs');
        if (modal) modal.hidden = true;
    }

    function renderParadas() {
        const ul = $('#listaParadas');
        ul.innerHTML = '';
        if (!state.paradas.length) {
            ul.innerHTML = '<li class="rec-hist-item"><small>Agregá clientes o proveedores desde el mapa</small></li>';
            updateStats();
            return;
        }

        const enCurso = state.estado === 'EnCurso' && !state.soloLectura;
        const editableParadas = puedeEditarParadas();
        const idxActual = indiceParadaActual();

        state.paradas.forEach((p, idx) => {
            const visual = visualParada(p, idx);
            const puedeVisitar = enCurso && visual === 'actual';
            const tieneObs = !!(p.notas && String(p.notas).trim());
            const tipo = p.tipoParada || 'Cliente';
            const tipoCls = tipo === 'Proveedor' ? 'tipo-prov' : 'tipo-cli';
            const li = document.createElement('li');
            li.className = `rec-stop is-${visual}`;
            li.draggable = editableParadas;
            li.dataset.index = idx;
            const delTitle = editableParadas
                ? 'Quitar'
                : (state.estado === 'EnCurso'
                    ? 'No se puede quitar: recorrido en curso'
                    : (esCerrado() ? 'Recorrido cerrado' : 'Solo lectura'));
            li.innerHTML = `
                <div class="ord">${idx + 1}</div>
                <div class="meta">
                    <div class="rec-stop-title">
                        <strong class="rec-stop-name" title="${escapeHtml(p.nombreCliente || 'Parada')}">${escapeHtml(p.nombreCliente || 'Parada')}</strong>
                        <em class="rec-tipo-tag ${tipoCls}">${escapeHtml(tipo)}</em>
                    </div>
                    <small title="${escapeHtml(p.direccion || '')}">${escapeHtml(p.direccion || '')}</small>
                    <span class="rec-stop-badge ${visual}">${labelVisual(visual)}</span>
                </div>
                <div class="ops">
                    <button type="button" title="${puedeVisitar ? 'Marcar visitada' : (enCurso ? 'Primero resolvé la parada actual' : (esCerrado() ? 'Recorrido cerrado' : 'Iniciá el recorrido para marcar visitas'))}"
                        data-act="visit" ${puedeVisitar ? '' : 'disabled'}>
                        <i class="fa fa-check"></i>
                    </button>
                    <button type="button" class="rec-act-omit" title="${puedeVisitar ? 'Omitir y pasar al siguiente' : 'Solo se puede omitir la parada actual'}"
                        data-act="omit" ${puedeVisitar ? '' : 'disabled'}>
                        <i class="fa fa-forward"></i>
                    </button>
                    <button type="button" class="rec-act-eye" title="${tieneObs ? 'Ver observación' : 'Sin observación'}"
                        data-act="obs" ${tieneObs ? '' : 'disabled'}>
                        <i class="fa fa-eye"></i>
                    </button>
                    <button type="button" title="${delTitle}" data-act="del" ${editableParadas ? '' : 'disabled'}>
                        <i class="fa fa-trash"></i>
                    </button>
                </div>`;

            if (editableParadas) {
                li.addEventListener('dragstart', () => { state.dragIndex = idx; });
                li.addEventListener('dragover', (e) => e.preventDefault());
                li.addEventListener('drop', () => {
                    if (state.dragIndex == null || state.dragIndex === idx) return;
                    const moved = state.paradas.splice(state.dragIndex, 1)[0];
                    state.paradas.splice(idx, 0, moved);
                    state.dragIndex = null;
                    renderParadas();
                    highlightRouteMarkers();
                    refrescarRutaAuto();
                });
            }

            const btnDel = li.querySelector('[data-act="del"]');
            if (btnDel && editableParadas) {
                btnDel.onclick = () => {
                    state.paradas.splice(idx, 1);
                    renderParadas();
                    highlightRouteMarkers();
                    refrescarRutaAuto();
                };
            }

            const btnVisit = li.querySelector('[data-act="visit"]');
            if (btnVisit && puedeVisitar) {
                btnVisit.onclick = async () => {
                    await marcarParadaVisitada(idx);
                };
            }

            const btnOmit = li.querySelector('[data-act="omit"]');
            if (btnOmit && puedeVisitar) {
                btnOmit.onclick = () => abrirModalOmitir(idx);
            }

            const btnObs = li.querySelector('[data-act="obs"]');
            if (btnObs && tieneObs) {
                btnObs.onclick = () => abrirModalObs(idx);
            }

            ul.appendChild(li);
        });
        updateStats();

        const hint = document.querySelector('.rec-list-head small');
        if (hint) {
            if (state.soloLectura) {
                hint.textContent = 'Solo lectura · recorridos de ' + (state.vistaUsuarioNombre || 'usuario');
            } else if (enCurso) {
                hint.textContent = idxActual >= 0
                    ? `En curso · siguiente: ${state.paradas[idxActual].nombreCliente || 'parada'}`
                    : 'Todas las paradas resueltas · podés finalizar';
            } else if (esCerrado()) {
                const visitadas = state.paradas.filter(p => (p.estadoParada || '') === 'Visitada').length;
                const omitidas = state.paradas.filter(p => (p.estadoParada || '') === 'Omitida').length;
                const pendientes = state.paradas.filter(p => !paradaResuelta(p)).length;
                hint.textContent = `Historial · ${visitadas} visitadas · ${omitidas} omitidas · ${pendientes} no visitadas`;
            } else {
                hint.textContent = 'Arrastrá para reordenar · Click en mapa para agregar';
            }
        }
    }

    async function marcarParadaVisitada(idx) {
        if (state.estado !== 'EnCurso') {
            toast('Iniciá el recorrido para marcar visitas');
            return;
        }
        if (idx !== indiceParadaActual()) {
            toast('Tenés que resolver la parada actual primero');
            return;
        }
        const p = state.paradas[idx];
        const prevEstado = p.estadoParada;
        const prevFecha = p.fechaVisitada;
        p.estadoParada = 'Visitada';
        p.fechaVisitada = new Date().toISOString();

        const ok = await guardarRecorrido(true);
        if (!ok) {
            p.estadoParada = prevEstado || 'Pendiente';
            p.fechaVisitada = prevFecha;
            toast('No se pudo guardar la visita');
            return;
        }

        toast('Visitada: ' + (p.nombreCliente || 'parada'));
        renderParadas();
        highlightRouteMarkers();
        refrescarRutaAuto();
        if (window.RecorridoBanner) window.RecorridoBanner.refresh();
        if (indiceParadaActual() < 0) {
            await finalizarRecorrido(true, '¡Has finalizado el recorrido!', { skipConfirm: true });
        }
    }

    async function confirmarOmitirParada() {
        const idx = omitirIdxPendiente;
        if (idx == null) return;
        if (state.estado !== 'EnCurso') {
            toast('Iniciá el recorrido para omitir paradas');
            return;
        }
        if (idx !== indiceParadaActual()) {
            toast('Solo se puede omitir la parada actual');
            cerrarModalOmitir();
            return;
        }
        const obs = ($('#txtOmitirObs')?.value || '').trim();
        if (!obs) {
            const err = $('#recOmitirError');
            const ta = $('#txtOmitirObs');
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
        if (obs.length > 2000) {
            toast('La observación no puede superar 2000 caracteres', 'warn');
            return;
        }

        const p = state.paradas[idx];
        const prev = {
            estadoParada: p.estadoParada,
            notas: p.notas,
            fechaOmitida: p.fechaOmitida
        };
        p.estadoParada = 'Omitida';
        p.notas = obs;
        p.fechaOmitida = new Date().toISOString();

        const ok = await guardarRecorrido(true);
        if (!ok) {
            p.estadoParada = prev.estadoParada || 'Pendiente';
            p.notas = prev.notas;
            p.fechaOmitida = prev.fechaOmitida;
            toast('No se pudo omitir la parada');
            return;
        }

        cerrarModalOmitir();
        toast('Omitida: ' + (p.nombreCliente || 'parada') + ' · siguiente en celeste');
        renderParadas();
        highlightRouteMarkers();
        refrescarRutaAuto();
        if (window.RecorridoBanner) window.RecorridoBanner.refresh();
        if (indiceParadaActual() < 0) {
            await finalizarRecorrido(true, '¡Has finalizado el recorrido!', { skipConfirm: true });
        }
    }

    async function sincronizarDesdeServidor(id) {
        const res = await fetch('/Recorridos/Obtener?id=' + id);
        if (!res.ok) return;
        const r = await res.json();
        const keepEstado = state.estado;
        state.recorridoId = r.id ?? r.Id;
        state.estado = r.estado ?? r.Estado ?? keepEstado;
        // Si estábamos en curso localmente, no pisar por un Borrador viejo del server en medio de marcar visita
        if (keepEstado === 'EnCurso' && state.estado === 'Borrador') state.estado = 'EnCurso';

        state.distanciaMetros = r.distanciaMetros ?? r.DistanciaMetros;
        state.duracionSegundos = r.duracionSegundos ?? r.DuracionSegundos;
        $('#txtRecId').value = state.recorridoId;
        if (r.nombre || r.Nombre) $('#txtRecNombre').value = r.nombre ?? r.Nombre;

        state.paradas = (r.paradas || r.Paradas || []).map(p => ({
            id: p.id ?? p.Id,
            idCliente: p.idCliente ?? p.IdCliente,
            idProveedor: p.idProveedor ?? p.IdProveedor,
            tipoParada: p.tipoParada ?? p.TipoParada ?? 'Cliente',
            orden: p.orden ?? p.Orden,
            nombreCliente: p.nombreCliente ?? p.NombreCliente,
            direccion: p.direccion ?? p.Direccion,
            latitud: Number(p.latitud ?? p.Latitud),
            longitud: Number(p.longitud ?? p.Longitud),
            estadoParada: p.estadoParada ?? p.EstadoParada ?? 'Pendiente',
            notas: p.notas ?? p.Notas ?? null,
            fechaVisitada: p.fechaVisitada ?? p.FechaVisitada ?? null,
            fechaOmitida: p.fechaOmitida ?? p.FechaOmitida ?? null
        }));
    }

    async function guardarRecorrido(silent) {
        if (state.soloLectura) {
            if (!silent) toast('Solo lectura: no se puede guardar');
            return false;
        }
        if (esCerrado()) {
            if (!silent) toast('Este recorrido ya está cerrado');
            return false;
        }
        const body = payloadGuardar();
        if (!body.paradas.length) {
            if (!silent) toast('Agregá paradas antes de guardar');
            return false;
        }
        const res = await fetch('/Recorridos/Guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.valor) {
            if (!silent) toast(data.mensaje || data.Mensaje || 'Error al guardar');
            return false;
        }
        state.recorridoId = data.id;
        $('#txtRecId').value = data.id;
        await sincronizarDesdeServidor(data.id);
        capturarPlantilla();
        if (!silent) toast('¡Recorrido guardado!', 'success');
        await cargarHistorial();
        if (window.RecorridoBanner) window.RecorridoBanner.refresh();
        return true;
    }

    async function iniciarRecorrido() {
        if (state.soloLectura) {
            toast('Solo lectura');
            return;
        }
        if (!state.recorridoId) {
            const ok = await guardarRecorrido(true);
            if (!ok) return;
        }
        if (!state.recorridoId) return;
        const res = await fetch('/Recorridos/Iniciar?id=' + state.recorridoId, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.valor) {
            toast(data.mensaje || data.Mensaje || 'No se pudo iniciar. ¿Ya tenés otro en curso?');
            return;
        }
        if (data.valor) {
            state.estado = 'EnCurso';
            try { localStorage.removeItem('recPendingDismissUntil'); } catch { /* ignore */ }
            await guardarRecorrido(true);
            updateStats();
            renderParadas();
            highlightRouteMarkers();
            toast('¡Has iniciado el recorrido!', 'success');
            if (window.RecorridoBanner) window.RecorridoBanner.refresh();
            await cargarHistorial();
        }
    }

    let finalizarOptsPendiente = null;

    function abrirModalFinalizar(pendientes, opts) {
        finalizarOptsPendiente = opts || {};
        const sub = $('#recFinalizarSub');
        const warn = $('#recFinalizarWarn');
        const lista = $('#recFinalizarLista');
        const note = $('#recFinalizarNote');
        const n = (pendientes || []).length;

        if (sub) {
            sub.textContent = n
                ? 'Todavía hay paradas sin resolver. ¿Finalizar igual?'
                : '¿Estás seguro de finalizar el recorrido?';
        }
        if (warn) {
            if (n) {
                warn.hidden = false;
                warn.innerHTML = `<i class="fa fa-exclamation-triangle"></i> Te queda${n === 1 ? '' : 'n'} <strong>${n} parada${n === 1 ? '' : 's'}</strong> por visitar.`;
            } else {
                warn.hidden = true;
                warn.innerHTML = '';
            }
        }
        if (lista) {
            if (n) {
                lista.hidden = false;
                lista.innerHTML = pendientes.map(p =>
                    `<li><span class="rec-finalizar-dot"></span>${escapeHtml(p.nombreCliente || 'Parada')}</li>`
                ).join('');
            } else {
                lista.hidden = true;
                lista.innerHTML = '';
            }
        }
        if (note) {
            note.textContent = n
                ? 'Al finalizar se guarda el recorrido tal como está (visitadas, omitidas y pendientes).'
                : 'Se cerrará el recorrido y quedará en el historial.';
        }
        const modal = $('#recModalFinalizar');
        if (modal) modal.hidden = false;
    }

    function cerrarModalFinalizar() {
        const modal = $('#recModalFinalizar');
        if (modal) modal.hidden = true;
        finalizarOptsPendiente = null;
    }

    async function confirmarFinalizarRecorrido() {
        const opts = finalizarOptsPendiente || {};
        cerrarModalFinalizar();
        return ejecutarFinalizar(!!opts.silentGuardar, opts.mensajeExito);
    }

    async function finalizarRecorrido(silentGuardar, mensajeExito, opts = {}) {
        // Si viene de un click, el 1er arg es el Event
        if (silentGuardar && typeof silentGuardar === 'object' && silentGuardar.type) {
            silentGuardar = false;
            mensajeExito = undefined;
            opts = {};
        }
        if (state.soloLectura) {
            toast('Solo lectura: no podés finalizar recorridos de otro usuario');
            return false;
        }
        if (!state.recorridoId) {
            toast('Guardá el recorrido primero');
            return false;
        }
        if (esCerrado()) {
            toast('Este recorrido ya está cerrado');
            return false;
        }

        const pendientes = state.paradas.filter(p => !paradaResuelta(p));
        if (!opts.skipConfirm) {
            abrirModalFinalizar(pendientes, { silentGuardar: !!silentGuardar, mensajeExito });
            return false;
        }
        return ejecutarFinalizar(!!silentGuardar, mensajeExito);
    }

    async function ejecutarFinalizar(silentGuardar, mensajeExito) {
        const saved = await guardarRecorrido(true);
        if (!saved) {
            toast('No se pudo guardar antes de finalizar');
            return false;
        }

        const res = await fetch('/Recorridos/Finalizar?id=' + state.recorridoId, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (data.valor) {
            state.estado = 'Finalizado';
            updateStats();
            renderParadas();
            highlightRouteMarkers();
            refrescarRutaAuto();
            toast(mensajeExito || '¡Has finalizado el recorrido!', 'success');
            await cargarHistorial();
            if (window.RecorridoBanner) window.RecorridoBanner.refresh();
            return true;
        }
        toast(data.mensaje || data.Mensaje || 'No se pudo finalizar');
        return false;
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function addParadaFromPunto(c) {
        if (!puedeEditarParadas()) {
            if (state.estado === 'EnCurso') {
                toast('Con el recorrido iniciado no se pueden agregar ni quitar paradas', 'warn');
            } else {
                toast(state.soloLectura ? 'Solo lectura' : 'Este recorrido está cerrado');
            }
            return;
        }
        const tipo = c.tipo === 'Proveedor' ? 'Proveedor' : 'Cliente';
        const draft = {
            tipoParada: tipo,
            idCliente: tipo === 'Cliente' ? c.id : null,
            idProveedor: tipo === 'Proveedor' ? c.id : null
        };
        if (state.paradas.some(p => claveParada(p) === claveParada(draft))) {
            toast('Ese ' + tipo.toLowerCase() + ' ya está en el recorrido');
            return;
        }
        state.paradas.push({
            id: 0,
            idCliente: draft.idCliente,
            idProveedor: draft.idProveedor,
            tipoParada: tipo,
            orden: state.paradas.length + 1,
            nombreCliente: c.nombre,
            direccion: c.direccionMaps || c.direccion || '',
            latitud: Number(c.latitud),
            longitud: Number(c.longitud),
            estadoParada: 'Pendiente'
        });
        renderParadas();
        highlightRouteMarkers();
        refrescarRutaAuto();
        toast('Agregado: ' + c.nombre);
    }

    // compat por si quedó alguna referencia
    function addParadaFromCliente(c) {
        addParadaFromPunto({ ...c, tipo: c.tipo || 'Cliente' });
    }

    function setOrigen(lat, lng, address) {
        state.origen = {
            lat: Number(lat),
            lng: Number(lng),
            direccion: address || state.origen?.direccion || null
        };
        if (!state.map) {
            $('#origenMeta').textContent = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            return;
        }
        if (!state.origenMarker) {
            state.origenMarker = new google.maps.Marker({
                map: state.map,
                draggable: true,
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 6,
                    fillColor: '#14b8a6',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                    rotation: 0
                }
            });
            state.origenMarker.addListener('dragend', (e) => {
                setOrigen(e.latLng.lat(), e.latLng.lng(), null);
                reverseGeocodeOrigen();
            });
        }
        state.origenMarker.setPosition(state.origen);
        state.map.panTo(state.origen);
        $('#origenMeta').textContent = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (address) $('#txtOrigen').value = address;
        if (state.paradas.length) refrescarRutaAuto();
    }

    function reverseGeocodeOrigen() {
        if (!state.geocoder || !state.origen) return;
        state.geocoder.geocode({ location: state.origen }, (results, status) => {
            if (status === 'OK' && results[0]) {
                $('#txtOrigen').value = results[0].formatted_address;
                $('#origenMeta').textContent = results[0].formatted_address;
            }
        });
    }

    function usarGps() {
        if (!navigator.geolocation) {
            toast('Geolocalización no disponible');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setOrigen(pos.coords.latitude, pos.coords.longitude, null);
                reverseGeocodeOrigen();
                toast('Origen tomado de tu GPS');
            },
            () => toast('No se pudo obtener tu ubicación'),
            { enableHighAccuracy: true, timeout: 12000 }
        );
    }

    function dist2(a, b) {
        const dx = a.lat - b.latitud;
        const dy = a.lng - b.longitud;
        return dx * dx + dy * dy;
    }

    function aplicarStatsDeRuta(result) {
        let metros = 0, segundos = 0;
        result.routes[0].legs.forEach(leg => {
            metros += leg.distance?.value || 0;
            segundos += leg.duration?.value || 0;
        });
        state.distanciaMetros = metros;
        state.duracionSegundos = segundos;
        updateStats();
    }

    function limpiarPolylinesRuta() {
        (state.routePolylines || []).forEach(p => {
            try { p.setMap(null); } catch { /* ignore */ }
        });
        state.routePolylines = [];
    }

    function limpiarRutaDibujada() {
        if (state.directionsRenderer) {
            state.directionsRenderer.set('directions', null);
        }
        limpiarPolylinesRuta();
    }

    function pintarRutaColoreada(result) {
        limpiarPolylinesRuta();
        if (!result?.routes?.[0]?.legs?.length || !state.map) return;

        const legs = result.routes[0].legs;
        // legs[i] llega a state.paradas[i]
        legs.forEach((leg, i) => {
            const parada = state.paradas[i];
            const est = (parada && (parada.estadoParada || '')) || '';
            const visitada = est === 'Visitada';
            const omitida = est === 'Omitida';
            const path = [];
            (leg.steps || []).forEach(step => {
                (step.path || []).forEach(ll => path.push(ll));
            });
            if (!path.length && leg.start_location && leg.end_location) {
                path.push(leg.start_location, leg.end_location);
            }
            if (!path.length) return;

            const strokeColor = visitada ? '#22c55e' : (omitida ? '#ef4444' : '#f59e0b');
            const poly = new google.maps.Polyline({
                path,
                map: state.map,
                geodesic: true,
                strokeColor,
                strokeOpacity: (visitada || omitida) ? 0.95 : 0.92,
                strokeWeight: (visitada || omitida) ? 6 : 5,
                zIndex: visitada ? 3 : (omitida ? 4 : 2)
            });
            state.routePolylines.push(poly);
        });
    }

    async function dibujarRuta(optimize, silent) {
        if (!state.map || !state.directionsService) {
            if (!silent) toast('Maps no está listo');
            return;
        }
        if (!state.origen) {
            if (!silent) toast('Definí el punto de partida');
            return;
        }
        if (state.paradas.length < 1) {
            if (!silent) toast('Agregá al menos una parada');
            return;
        }

        // Evitar trazo doble si había una ruta anterior
        limpiarRutaDibujada();

        // Ruta sugerida: una sola ruta ABIERTA (sin volver al origen).
        // Destino = parada más lejos del origen; el resto se optimiza como waypoints.
        if (optimize && state.paradas.length > 1) {
            let idxDest = 0;
            let best = -1;
            state.paradas.forEach((p, i) => {
                const d = dist2(state.origen, p);
                if (d > best) { best = d; idxDest = i; }
            });

            const destino = state.paradas[idxDest];
            const intermedias = state.paradas.filter((_, i) => i !== idxDest);

            state.directionsService.route({
                origin: state.origen,
                destination: { lat: destino.latitud, lng: destino.longitud },
                waypoints: intermedias.map(p => ({
                    location: { lat: p.latitud, lng: p.longitud },
                    stopover: true
                })),
                optimizeWaypoints: true,
                travelMode: google.maps.TravelMode.DRIVING
            }, (result, status) => {
                if (status !== 'OK' || !result) {
                    if (!silent) toast('No se pudo optimizar: ' + status);
                    return;
                }

                const order = result.routes[0].waypoint_order || [];
                state.paradas = [
                    ...order.map(i => intermedias[i]),
                    destino
                ];

                state.directionsRenderer.setDirections(result);
                pintarRutaColoreada(result);
                state.lastOverviewPolyline = result.routes[0]?.overview_polyline || null;
                aplicarStatsDeRuta(result);
                renderParadas();
                highlightRouteMarkers();
                if (!silent) toast('Ruta sugerida aplicada');
            });
            return;
        }

        const destination = state.paradas[state.paradas.length - 1];
        const waypoints = state.paradas.slice(0, -1).map(p => ({
            location: { lat: p.latitud, lng: p.longitud },
            stopover: true
        }));

        state.directionsService.route({
            origin: state.origen,
            destination: { lat: destination.latitud, lng: destination.longitud },
            waypoints,
            optimizeWaypoints: false,
            travelMode: google.maps.TravelMode.DRIVING
        }, (result, status) => {
            if (status !== 'OK' || !result) {
                if (!silent) toast('No se pudo calcular la ruta: ' + status);
                return;
            }

            state.directionsRenderer.setDirections(result);
            pintarRutaColoreada(result);
            state.lastOverviewPolyline = result.routes[0]?.overview_polyline || null;
            aplicarStatsDeRuta(result);
            if (!silent) toast('Ruta dibujada');
        });
    }

    function payloadGuardar() {
        return {
            id: state.recorridoId || 0,
            nombre: $('#txtRecNombre').value.trim() || ('Recorrido ' + new Date().toLocaleString()),
            estado: state.estado || 'Borrador',
            tipoDestino: state.tipoDestino || 'Clientes',
            origenLat: state.origen?.lat ?? null,
            origenLng: state.origen?.lng ?? null,
            origenDireccion: $('#txtOrigen').value || $('#origenMeta').textContent,
            distanciaMetros: state.distanciaMetros,
            duracionSegundos: state.duracionSegundos,
            paradas: state.paradas.map((p, i) => ({
                id: p.id || 0,
                idCliente: p.idCliente || null,
                idProveedor: p.idProveedor || null,
                tipoParada: p.tipoParada || 'Cliente',
                orden: i + 1,
                nombreCliente: p.nombreCliente,
                direccion: p.direccion,
                latitud: p.latitud,
                longitud: p.longitud,
                estadoParada: p.estadoParada || 'Pendiente',
                fechaVisitada: p.fechaVisitada || null,
                fechaOmitida: p.fechaOmitida || null,
                notas: p.notas || null
            }))
        };
    }

    async function cargarPuntos() {
        const tipo = state.tipoDestino || 'Clientes';
        const res = await fetch('/Recorridos/PuntosMapa?tipo=' + encodeURIComponent(tipo));
        const data = await res.json();
        state.puntos = (data || []).map(c => ({
            id: c.id ?? c.Id,
            tipo: c.tipo ?? c.Tipo ?? 'Cliente',
            nombre: c.nombre ?? c.Nombre,
            apodo: c.apodo ?? c.Apodo,
            telefono: c.telefono ?? c.Telefono,
            direccion: c.direccion ?? c.Direccion,
            direccionMaps: c.direccionMaps ?? c.DireccionMaps,
            localidad: c.localidad ?? c.Localidad,
            provincia: c.provincia ?? c.Provincia,
            latitud: c.latitud ?? c.Latitud,
            longitud: c.longitud ?? c.Longitud
        }));
        // alias legacy
        state.clientes = state.puntos.filter(p => p.tipo === 'Cliente');
        drawClientMarkers('', { fit: true });
        if (!state.puntos.length) {
            toast(tipo === 'Proveedores'
                ? 'No hay proveedores con coordenadas. Ubicalos desde Proveedores.'
                : tipo === 'Clientes'
                    ? 'No hay clientes con coordenadas. Ubicalos desde Clientes.'
                    : 'No hay puntos con coordenadas. Ubicalos desde Clientes/Proveedores.');
        }
    }

    function buildGoogleMapsUrl(opts = {}) {
        const navigate = opts.navigate !== false;
        const includeOrigin = opts.includeOrigin === true || (!navigate && opts.includeOrigin !== false);

        const stops = (state.estado === 'EnCurso'
            ? state.paradas.filter(p => !paradaResuelta(p))
            : state.paradas.slice()
        ).filter(p => p.latitud && p.longitud);

        if (!stops.length) return null;

        // Google Maps: hasta 9 waypoints + destination (en browser móvil suelen limitar a 3)
        const dest = stops[stops.length - 1];
        const middles = stops.slice(0, -1).slice(0, 9);
        const params = new URLSearchParams({
            api: '1',
            destination: Number(dest.latitud) + ',' + Number(dest.longitud),
            travelmode: 'driving'
        });

        // Para poder "Iniciar" navegación: NO fijar origin (usa ubicación actual del dispositivo).
        // Si mandamos un origen lejano (ej. depósito), Maps solo muestra vista previa.
        if (includeOrigin && !navigate && state.origen?.lat != null && state.origen?.lng != null) {
            params.set('origin', Number(state.origen.lat) + ',' + Number(state.origen.lng));
        }

        if (navigate) {
            params.set('dir_action', 'navigate');
        }

        if (middles.length) {
            params.set('waypoints', middles.map(w => Number(w.latitud) + ',' + Number(w.longitud)).join('|'));
        }

        return 'https://www.google.com/maps/dir/?' + params.toString();
    }

    function abrirEnGoogleMaps() {
        const url = buildGoogleMapsUrl({ navigate: true, includeOrigin: false });
        if (!url) {
            toast('Agregá al menos una parada con ubicación');
            return;
        }

        const ua = navigator.userAgent || '';
        const isAndroid = /Android/i.test(ua);
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isMobile = isAndroid || isIOS;

        if (isAndroid) {
            // Preferir la app de Maps (ahí sí aparece Iniciar / navegación)
            const intentUrl = 'intent://' + url.replace(/^https?:\/\//i, '') +
                '#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=' +
                encodeURIComponent(url) + ';end';
            window.location.href = intentUrl;
        } else {
            window.open(url, '_blank', 'noopener');
        }

        if (!isMobile) {
            toast('En la PC Maps no inicia el GPS. En Maps usá «Enviar a tu teléfono», o abrí el link en el celu.', 'warn');
        } else {
            toast('Abriendo Google Maps… tocá Iniciar si te lo pide', 'success');
        }
    }

    function nombreArchivoExport() {
        const base = ($('#txtRecNombre').value || 'recorrido').trim()
            .replace(/[\\/:*?"<>|]+/g, '-')
            .replace(/\s+/g, '_');
        const d = new Date();
        const stamp = d.getFullYear() +
            String(d.getMonth() + 1).padStart(2, '0') +
            String(d.getDate()).padStart(2, '0');
        return base + '_' + stamp;
    }

    function ensureSheetJs() {
        if (window.XLSX) return Promise.resolve(true);
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
            s.async = true;
            s.onload = () => resolve(!!window.XLSX);
            s.onerror = () => reject(new Error('No se pudo cargar SheetJS'));
            document.head.appendChild(s);
        });
    }

    async function exportarExcel() {
        if (!state.paradas.length) {
            toast('No hay paradas para exportar');
            return;
        }

        try {
            toast('Generando Excel…');
            await ensureSheetJs();
        } catch {
            toast('No se pudo cargar el exportador de Excel');
            return;
        }

        const nombreRec = ($('#txtRecNombre').value || 'Recorrido').trim();
        const info = [
            ['Campo', 'Valor'],
            ['Recorrido', nombreRec],
            ['Estado', labelEstado(state.estado)],
            ['Destino', state.tipoDestino || 'Clientes'],
            ['Origen', state.origen?.direccion || $('#txtOrigen')?.value || ''],
            ['Distancia', fmtKm(state.distanciaMetros)],
            ['Tiempo', fmtTime(state.duracionSegundos)],
            ['Paradas', state.paradas.length],
            ['Exportado', new Date().toLocaleString()]
        ];

        const paradasAoA = [
            ['Orden', 'Tipo', 'Nombre', 'Direccion', 'Estado', 'Observacion', 'Latitud', 'Longitud', 'Link_Maps']
        ];

        state.paradas.forEach((p, i) => {
            const lat = p.latitud != null && p.latitud !== '' ? Number(p.latitud) : null;
            const lng = p.longitud != null && p.longitud !== '' ? Number(p.longitud) : null;
            const maps = (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng))
                ? ('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving')
                : '';

            paradasAoA.push([
                i + 1,
                p.tipoParada || 'Cliente',
                p.nombreCliente || '',
                p.direccion || '',
                p.estadoParada || 'Pendiente',
                p.notas || '',
                lat != null && !Number.isNaN(lat) ? lat : '',
                lng != null && !Number.isNaN(lng) ? lng : '',
                maps
            ]);
        });

        const wb = XLSX.utils.book_new();
        const wsInfo = XLSX.utils.aoa_to_sheet(info);
        const wsParadas = XLSX.utils.aoa_to_sheet(paradasAoA);

        // Forzar texto en Link_Maps y números en lat/lng
        const range = XLSX.utils.decode_range(wsParadas['!ref'] || 'A1');
        for (let R = 1; R <= range.e.r; R++) {
            const latCell = wsParadas[XLSX.utils.encode_cell({ r: R, c: 6 })];
            const lngCell = wsParadas[XLSX.utils.encode_cell({ r: R, c: 7 })];
            const linkCell = wsParadas[XLSX.utils.encode_cell({ r: R, c: 8 })];
            if (latCell && typeof latCell.v === 'number') {
                latCell.t = 'n';
                latCell.z = '0.0000000';
            }
            if (lngCell && typeof lngCell.v === 'number') {
                lngCell.t = 'n';
                lngCell.z = '0.0000000';
            }
            if (linkCell && linkCell.v) {
                linkCell.t = 's';
                linkCell.v = String(linkCell.v);
                // evita que Excel lo tome como fórmula
                if (String(linkCell.v).startsWith('=')) linkCell.v = "'" + linkCell.v;
            }
        }

        wsInfo['!cols'] = [{ wch: 14 }, { wch: 60 }];
        wsParadas['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 28 }, { wch: 45 },
            { wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 55 }
        ];

        XLSX.utils.book_append_sheet(wb, wsInfo, 'Informacion');
        XLSX.utils.book_append_sheet(wb, wsParadas, 'Paradas');

        const fileName = nombreArchivoExport() + '.xlsm';
        XLSX.writeFile(wb, fileName, { bookType: 'xlsm' });
        toast('Excel exportado (.xlsm)');
        cerrarMenuExport();
    }

    function exportPointKind(p, idxParada) {
        const est = (p && p.estadoParada) || '';
        if (est === 'Visitada') return 'visitada';
        if (est === 'Omitida') return 'omitida';
        if (state.estado === 'EnCurso' && idxParada === indiceParadaActual()) return 'actual';
        return 'pendiente';
    }

    function exportKindStyle(kind) {
        switch (kind) {
            case 'origen': return { hex: '#14b8a6', map: '0x14b8a6', label: 'Origen' };
            case 'visitada': return { hex: '#22c55e', map: 'green', label: 'Visitada' };
            case 'omitida': return { hex: '#ef4444', map: 'red', label: 'Omitida' };
            case 'actual': return { hex: '#38bdf8', map: '0x38bdf8', label: 'Actual' };
            default: return { hex: '#f59e0b', map: 'orange', label: 'Pendiente' };
        }
    }

    function exportMarkerLabel(n) {
        if (n <= 9) return String(n);
        return String.fromCharCode(65 + Math.min(n - 10, 25));
    }

    /** Misma secuencia para esquema SVG y mapa estático (orden de visita). */
    function buildExportPoints() {
        const pts = [];
        if (state.origen?.lat != null && state.origen?.lng != null) {
            pts.push({
                lat: Number(state.origen.lat),
                lng: Number(state.origen.lng),
                label: '0',
                kind: 'origen',
                name: 'Origen',
                idx: -1
            });
        }
        state.paradas.forEach((p, i) => {
            if (p.latitud == null || p.longitud == null) return;
            const lat = Number(p.latitud);
            const lng = Number(p.longitud);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            pts.push({
                lat,
                lng,
                label: exportMarkerLabel(i + 1),
                kind: exportPointKind(p, i),
                name: p.nombreCliente || ('Parada ' + (i + 1)),
                idx: i
            });
        });
        return pts;
    }

    function staticMapUrl() {
        const key = window.__googleMapsApiKey || '';
        const pts = buildExportPoints();
        if (!key || pts.length < 1) return '';

        const parts = [];

        // Misma secuencia que el esquema: un tramo por tramo (origen → 1 → 2 → …)
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            const col = exportKindStyle(b.kind).map;
            const mapColor = col.startsWith('0x') ? (col + 'ff') : col;
            parts.push(
                'path=color:' + mapColor + '%7Cweight:5%7C'
                + a.lat + ',' + a.lng + '%7C' + b.lat + ',' + b.lng
            );
        }

        // Si hay polyline de Directions, trazo fino de calles (fondo) + tramos de orden encima
        if (state.lastOverviewPolyline && pts.length >= 2) {
            parts.unshift('path=color:0x94a3b880%7Cweight:3%7Cenc:' + state.lastOverviewPolyline);
        }

        pts.forEach((p) => {
            const col = exportKindStyle(p.kind).map;
            parts.push(
                'markers=color:' + col + '%7Csize:mid%7Clabel:' + encodeURIComponent(p.label) + '%7C'
                + p.lat + ',' + p.lng
            );
        });

        const base = 'https://maps.googleapis.com/maps/api/staticmap'
            + '?size=640x400&scale=2&maptype=roadmap&format=png';

        let url = base + '&' + parts.join('&') + '&key=' + encodeURIComponent(key);

        if (url.length > 7800) {
            // Priorizar marcadores + polyline (o solo marcadores)
            const slim = [];
            if (state.lastOverviewPolyline) {
                slim.push('path=color:0xf59e0bff%7Cweight:5%7Cenc:' + state.lastOverviewPolyline);
            } else {
                for (let i = 0; i < pts.length - 1; i++) {
                    const a = pts[i];
                    const b = pts[i + 1];
                    slim.push('path=color:0xf59e0bff%7Cweight:4%7C' + a.lat + ',' + a.lng + '%7C' + b.lat + ',' + b.lng);
                }
            }
            pts.forEach((p) => {
                const col = exportKindStyle(p.kind).map;
                slim.push(
                    'markers=color:' + col + '%7Csize:mid%7Clabel:' + encodeURIComponent(p.label) + '%7C'
                    + p.lat + ',' + p.lng
                );
            });
            url = base + '&' + slim.join('&') + '&key=' + encodeURIComponent(key);
            if (url.length > 7800) {
                const onlyMarkers = slim.filter(s => s.startsWith('markers='));
                url = base + '&' + onlyMarkers.join('&') + '&key=' + encodeURIComponent(key);
            }
        }

        return url;
    }

    function separateClosePoints(projected, minDist) {
        const pts = projected.map(p => ({ ...p }));
        const min = minDist || 30;
        for (let pass = 0; pass < 10; pass++) {
            let moved = false;
            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const dx = pts[j].x - pts[i].x;
                    const dy = pts[j].y - pts[i].y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
                    if (dist >= min) continue;
                    const push = (min - dist) / 2;
                    const ux = dx / dist;
                    const uy = dy / dist;
                    pts[i].x -= ux * push;
                    pts[i].y -= uy * push;
                    pts[j].x += ux * push;
                    pts[j].y += uy * push;
                    moved = true;
                }
            }
            if (!moved) break;
        }
        return pts;
    }

    function buildRouteSvgDiagram() {
        const pts = buildExportPoints();
        if (pts.length < 1) return '';

        const lats = pts.map(p => p.lat);
        const lngs = pts.map(p => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const w = 720;
        const h = 280;
        const margin = 28;
        const dx = Math.max(maxLng - minLng, 0.0015);
        const dy = Math.max(maxLat - minLat, 0.0015);

        const xy = (p) => {
            const x = margin + ((p.lng - minLng) / dx) * (w - margin * 2);
            const y = margin + (1 - (p.lat - minLat) / dy) * (h - margin * 2);
            return { x, y };
        };

        let projected = pts.map(p => ({ ...p, ...xy(p) }));
        projected = separateClosePoints(projected, 32);

        // Clamp inside viewBox after separation
        projected.forEach(p => {
            p.x = Math.max(18, Math.min(w - 18, p.x));
            p.y = Math.max(18, Math.min(h - 18, p.y));
        });

        let lines = '';
        for (let i = 0; i < projected.length - 1; i++) {
            const a = projected[i];
            const b = projected[i + 1];
            const color = exportKindStyle(b.kind).hex;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
            lines += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-width="4.5" stroke-linecap="round" opacity="0.92"/>`;
            lines += `<polygon points="0,-5 10,0 0,5" fill="${color}" transform="translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${ang.toFixed(1)})"/>`;
        }

        const dots = projected.map(p => {
            const fill = exportKindStyle(p.kind).hex;
            return `<g>
                <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="15" fill="${fill}" stroke="#fff" stroke-width="3"/>
                <text x="${p.x.toFixed(1)}" y="${(p.y + 4.5).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="12" font-weight="800" font-family="Segoe UI, Arial">${escapeHtml(p.label)}</text>
              </g>`;
        }).join('');

        const legend = projected.map(p => {
            const st = exportKindStyle(p.kind);
            return `<div class="leg-item">
                <span class="leg-dot" style="background:${st.hex}"></span>
                <strong>${escapeHtml(p.label)}</strong>
                <span class="leg-name">${escapeHtml(p.name)}</span>
                <em class="leg-state">${escapeHtml(st.label)}</em>
              </div>`;
        }).join('');

        const key = `
          <div class="map-key">
            <span><i style="background:#14b8a6"></i>Origen</span>
            <span><i style="background:#22c55e"></i>Visitada</span>
            <span><i style="background:#ef4444"></i>Omitida</span>
            <span><i style="background:#38bdf8"></i>Actual</span>
            <span><i style="background:#f59e0b"></i>Pendiente</span>
          </div>`;

        return `
        <div class="map-wrap">
          <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
            ${lines}
            ${dots}
          </svg>
          ${key}
          <div class="map-legend">${legend}</div>
        </div>`;
    }

    function exportarPdf() {
        if (!state.paradas.length) {
            toast('No hay paradas para exportar');
            return;
        }

        const nombre = escapeHtml($('#txtRecNombre').value || 'Recorrido');
        const estado = escapeHtml(labelEstado(state.estado));
        const origenRaw = state.origen?.direccion || $('#txtOrigen')?.value || 'Sin origen';
        const origen = escapeHtml(origenRaw);
        const dist = escapeHtml(fmtKm(state.distanciaMetros));
        const tiempo = escapeHtml(fmtTime(state.duracionSegundos));
        const mapsUrl = buildGoogleMapsUrl({ navigate: false, includeOrigin: true }) || '';
        const mapImg = staticMapUrl();
        const svgDiagram = buildRouteSvgDiagram();
        const destino = escapeHtml(state.tipoDestino || 'Clientes');
        const exportado = escapeHtml(new Date().toLocaleString());

        const filas = state.paradas.map((p, i) => {
            const est = p.estadoParada || 'Pendiente';
            const estCls = est === 'Visitada' ? 'ok' : (est === 'Omitida' ? 'omit' : 'pend');
            return `
            <tr>
                <td class="ord">${i + 1}</td>
                <td>${escapeHtml(p.tipoParada || 'Cliente')}</td>
                <td>
                    <strong>${escapeHtml(p.nombreCliente || '')}</strong>
                    ${p.direccion ? `<div class="addr">${escapeHtml(p.direccion)}</div>` : ''}
                </td>
                <td><span class="pill ${estCls}">${escapeHtml(est)}</span></td>
                <td class="obs">${escapeHtml(p.notas || '—')}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${nombre} · Recorrido</title>
<style>
  @page { margin: 10mm; size: A4; }
  * { box-sizing: border-box; }
  body {
    font-family: Segoe UI, Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 12px 14px 18px;
    font-size: 12px;
    line-height: 1.35;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  .head-left { min-width: 0; flex: 1; }
  .head h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
  }
  .head .sub {
    margin: 3px 0 0;
    color: #64748b;
    font-size: 11px;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
    flex: 0 1 auto;
    max-width: 55%;
  }
  .stat {
    display: inline-flex;
    flex-direction: column;
    gap: 1px;
    padding: 5px 9px;
    border-radius: 8px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    min-width: 68px;
  }
  .stat b {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .03em;
  }
  .stat span {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
  }
  .origen {
    margin: 0 0 10px;
    padding: 7px 10px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    font-size: 11px;
    color: #334155;
  }
  .origen b { color: #64748b; font-weight: 700; margin-right: 6px; }
  .origen-txt {
    display: inline;
    word-break: break-word;
  }
  h2 {
    font-size: 12px;
    margin: 12px 0 6px;
    color: #334155;
    text-transform: uppercase;
    letter-spacing: .04em;
    font-weight: 800;
  }
  .map-wrap { margin: 0 0 10px; }
  .map-wrap svg {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    display: block;
    width: 100%;
    height: auto;
    max-height: 300px;
  }
  .map-key {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin: 6px 0 4px;
    font-size: 10px;
    color: #64748b;
    font-weight: 600;
  }
  .map-key i {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 5px;
    vertical-align: middle;
  }
  .map-legend {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 14px;
    margin-top: 6px;
    font-size: 10px;
    color: #475569;
  }
  .leg-item {
    display: grid;
    grid-template-columns: 10px auto 1fr auto;
    gap: 5px;
    align-items: center;
    min-width: 0;
  }
  .leg-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }
  .leg-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .leg-state {
    font-style: normal;
    font-size: 9px;
    color: #94a3b8;
    font-weight: 700;
  }
  .map {
    width: 100%;
    max-height: 280px;
    object-fit: contain;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    margin: 0 0 6px;
  }
  .map-fallback {
    display: none;
    padding: 8px 10px;
    border-radius: 8px;
    background: #fff7ed;
    border: 1px solid #fdba74;
    color: #9a3412;
    font-size: 11px;
    margin: 0 0 8px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td {
    border-bottom: 1px solid #e2e8f0;
    padding: 6px 6px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f1f5f9;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .03em;
    color: #64748b;
  }
  .ord { width: 28px; font-weight: 800; color: #2563eb; }
  .addr { margin-top: 2px; color: #64748b; font-size: 10px; }
  .obs { color: #64748b; max-width: 180px; word-break: break-word; }
  .pill {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
  }
  .pill.ok { background: #dcfce7; color: #166534; }
  .pill.omit { background: #fee2e2; color: #991b1b; }
  .pill.pend { background: #ffedd5; color: #9a3412; }
  .actions { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
  .btn {
    border: 0;
    border-radius: 8px;
    padding: 8px 12px;
    font-weight: 700;
    cursor: pointer;
    font-size: 12px;
    text-decoration: none;
  }
  .btn-print { background: #2563eb; color: #fff; }
  .btn-maps { background: #10b981; color: #052e1c; }
  .foot { margin-top: 10px; font-size: 10px; color: #94a3b8; }
  @media print {
    .actions { display: none !important; }
    body { padding: 0; }
    .map-wrap svg { max-height: 260px; }
    .map { max-height: 260px; }
  }
</style>
</head>
<body>
  <header class="head">
    <div class="head-left">
      <h1>${nombre}</h1>
      <p class="sub">Exportado ${exportado}</p>
    </div>
    <div class="stats">
      <div class="stat"><b>Estado</b><span>${estado}</span></div>
      <div class="stat"><b>Destino</b><span>${destino}</span></div>
      <div class="stat"><b>Paradas</b><span>${state.paradas.length}</span></div>
      <div class="stat"><b>Distancia</b><span>${dist}</span></div>
      <div class="stat"><b>Tiempo</b><span>${tiempo}</span></div>
    </div>
  </header>
  <div class="origen"><b>Origen</b><span class="origen-txt">${origen}</span></div>

  <h2>Esquema del recorrido</h2>
  ${svgDiagram}
  ${mapImg ? `
    <h2>Mapa (mismo orden · 0 → N)</h2>
    <img class="map" id="staticMapImg" src="${mapImg}" alt="Mapa del recorrido"
         onerror="this.style.display='none'; var f=document.getElementById('mapFail'); if(f) f.style.display='block';"/>
    <div class="map-fallback" id="mapFail">No se pudo cargar el mapa estático de Google. El esquema de arriba muestra el recorrido completo.</div>
  ` : ''}

  <h2>Detalle de paradas</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Tipo</th><th>Parada</th><th>Estado</th><th>Observación</th></tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="actions">
    <button class="btn btn-print" onclick="window.print()">Guardar como PDF / Imprimir</button>
    ${mapsUrl ? `<a class="btn btn-maps" href="${mapsUrl}" target="_blank" rel="noopener">Abrir en Google Maps</a>` : ''}
  </div>
  <div class="foot">Sistema Gian · Recorridos</div>
  <script>
    (function(){
      var img = document.getElementById('staticMapImg');
      function go(){ setTimeout(function(){ window.print(); }, 250); }
      if (!img) { go(); return; }
      if (img.complete) go();
      else { img.onload = go; img.onerror = go; }
      setTimeout(go, 2500);
    })();
  <\/script>
</body>
</html>`;

        const w = window.open('', '_blank');
        if (!w) {
            toast('Permití popups para exportar el PDF');
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
        toast('PDF listo · esquema y mapa usan el mismo orden');
        cerrarMenuExport();
    }

    function cerrarMenuExport() {
        const m = $('#recExportMenu');
        if (m) m.hidden = true;
    }

    function toggleMenuExport() {
        const m = $('#recExportMenu');
        if (!m) return;
        m.hidden = !m.hidden;
    }

    function formatearFechaCorta(d = new Date()) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return dd + '/' + mm + '/' + yyyy;
    }

    /** Quita "Copia de" y fechas al final para no acumularlas al duplicar. */
    function nombreBasePlantilla(nombre) {
        let n = String(nombre || '').trim();
        while (/^copia de\s+/i.test(n)) {
            n = n.replace(/^copia de\s+/i, '').trim();
        }
        n = n.replace(/\s*[·\-–]\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/u, '').trim();
        n = n.replace(/\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/, '').trim();
        return n;
    }

    /** Ej: "Ruta semanal · 17/07/2026" */
    function nombrePlantillaConFecha(nombre) {
        const base = nombreBasePlantilla(nombre);
        const fecha = formatearFechaCorta();
        return base ? (base + ' · ' + fecha) : ('Recorrido · ' + fecha);
    }

    function plantillaDesdeRecorrido(r) {
        if (!r) return null;
        const paradas = (r.paradas || r.Paradas || []).map((p, i) => ({
            idCliente: p.idCliente ?? p.IdCliente ?? null,
            idProveedor: p.idProveedor ?? p.IdProveedor ?? null,
            tipoParada: p.tipoParada ?? p.TipoParada ?? 'Cliente',
            orden: i + 1,
            nombreCliente: p.nombreCliente ?? p.NombreCliente ?? '',
            direccion: p.direccion ?? p.Direccion ?? '',
            latitud: Number(p.latitud ?? p.Latitud),
            longitud: Number(p.longitud ?? p.Longitud),
            estadoParada: 'Pendiente',
            notas: null,
            fechaVisitada: null,
            fechaOmitida: null
        }));
        if (!paradas.length) return null;
        const olat = r.origenLat ?? r.OrigenLat;
        const olng = r.origenLng ?? r.OrigenLng;
        return {
            nombre: (r.nombre ?? r.Nombre ?? '').trim(),
            tipoDestino: r.tipoDestino ?? r.TipoDestino ?? 'Clientes',
            origen: (olat != null && olng != null)
                ? {
                    lat: Number(olat),
                    lng: Number(olng),
                    direccion: r.origenDireccion ?? r.OrigenDireccion ?? ''
                }
                : null,
            paradas
        };
    }

    async function cargarHistorial() {
        const url = state.vistaUsuarioId > 0
            ? '/Recorridos/Lista?usuarioId=' + state.vistaUsuarioId
            : '/Recorridos/Lista';
        const res = await fetch(url);
        if (!res.ok) {
            toast('No se pudo cargar el historial');
            return;
        }
        const data = await res.json();
        const ul = $('#listaHistorial');
        ul.innerHTML = '';

        if (!data || !data.length) {
            const empty = document.createElement('li');
            empty.className = 'rec-hist-empty';
            empty.innerHTML = `
                <i class="fa fa-map-o" aria-hidden="true"></i>
                <strong>No hay recorridos</strong>
                <span>Cuando guardes o finalices uno, va a aparecer acá.</span>`;
            ul.appendChild(empty);
            return;
        }

        const hayEnCurso = data.some(r => (r.estado ?? r.Estado) === 'EnCurso')
            || state.estado === 'EnCurso';

        data.forEach(r => {
            const id = r.id ?? r.Id;
            const estado = r.estado ?? r.Estado ?? '';
            const li = document.createElement('li');
            li.className = 'rec-hist-item' +
                (estado === 'EnCurso' ? ' is-en-curso' : '') +
                (estado === 'Borrador' ? ' is-borrador' : '') +
                (estado === 'Finalizado' ? ' is-finalizado' : '') +
                (Number(state.recorridoId) === Number(id) ? ' is-selected' : '');
            li.dataset.id = String(id);
            li.innerHTML = `
                <div class="rec-hist-top">
                    <strong>${escapeHtml(r.nombre ?? r.Nombre)}</strong>
                    ${estado === 'EnCurso' ? '<span class="rec-hist-badge">EN CURSO</span>' : ''}
                </div>
                <small>${escapeHtml(labelEstado(estado))} · ${(r.cantidadParadas ?? r.CantidadParadas ?? 0)} paradas</small>
                <div class="row-actions">
                    <button type="button" class="rec-btn rec-btn-sm" data-load="${id}">Abrir</button>
                    ${!state.soloLectura && !hayEnCurso
                        ? `<button type="button" class="rec-btn rec-btn-sm" data-dup="${id}" title="Duplicar este recorrido">
                            <i class="fa fa-copy"></i> Duplicar
                           </button>`
                        : ''}
                    ${!state.soloLectura && (estado === 'EnCurso' || estado === 'Borrador')
                        ? `<button type="button" class="rec-btn rec-btn-sm" data-fin="${id}">Finalizar</button>`
                        : ''}
                    ${state.esAdmin
                        ? `<button type="button" class="rec-btn rec-btn-sm rec-btn-danger" data-del="${id}" title="Eliminar recorrido">
                            <i class="fa fa-trash"></i> Eliminar
                           </button>`
                        : ''}
                </div>`;

            const marcarSeleccionado = () => {
                ul.querySelectorAll('.rec-hist-item.is-selected').forEach(el => el.classList.remove('is-selected'));
                li.classList.add('is-selected');
            };

            li.addEventListener('click', (e) => {
                if (e.target.closest('.row-actions')) return;
                marcarSeleccionado();
            });
            li.addEventListener('dblclick', (e) => {
                if (e.target.closest('.row-actions')) return;
                e.preventDefault();
                marcarSeleccionado();
                abrirRecorrido(id);
            });

            li.querySelector('[data-load]').onclick = (e) => {
                e.stopPropagation();
                marcarSeleccionado();
                abrirRecorrido(id);
            };
            const btnDup = li.querySelector('[data-dup]');
            if (btnDup) {
                btnDup.onclick = (e) => {
                    e.stopPropagation();
                    marcarSeleccionado();
                    duplicarRecorrido(id);
                };
            }
            const btnFin = li.querySelector('[data-fin]');
            if (btnFin) {
                btnFin.onclick = async (e) => {
                    e.stopPropagation();
                    marcarSeleccionado();
                    await abrirRecorrido(id);
                    await finalizarRecorrido(false);
                };
            }
            const btnDel = li.querySelector('[data-del]');
            if (btnDel) {
                btnDel.onclick = (e) => {
                    e.stopPropagation();
                    marcarSeleccionado();
                    abrirModalEliminar(id, r.nombre ?? r.Nombre, estado);
                };
            }
            ul.appendChild(li);
        });
    }

    async function duplicarRecorrido(id) {
        if (state.soloLectura) {
            toast('Solo lectura: no podés duplicar desde la vista de otro usuario');
            return;
        }
        const enCursoId = await fetchEnCursoId();
        if (enCursoId || state.estado === 'EnCurso') {
            toast('Ya tenés un recorrido en curso. Solo puede haber uno a la vez.');
            if (enCursoId) await abrirRecorrido(enCursoId);
            return;
        }
        const res = await fetch('/Recorridos/Obtener?id=' + encodeURIComponent(id));
        if (!res.ok) {
            toast('No se pudo cargar el recorrido para duplicar', 'error');
            return;
        }
        const r = await res.json();
        const plantilla = plantillaDesdeRecorrido(r);
        if (!plantilla) {
            toast('Ese recorrido no tiene paradas para duplicar');
            return;
        }
        aplicarPlantilla(plantilla, {
            mensaje: 'Recorrido duplicado · podés editarlo y guardarlo'
        });
        $$('.rec-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === 'editor'));
        $$('.rec-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-editor'));
    }

    let eliminarIdPendiente = null;

    function abrirModalEliminar(id, nombre, estado) {
        if (!state.esAdmin) return;
        eliminarIdPendiente = id;
        const title = $('#recEliminarTitle');
        const sub = $('#recEliminarSub');
        const warn = $('#recEliminarWarn');
        const enCurso = estado === 'EnCurso';
        if (title) title.textContent = 'Eliminar recorrido';
        if (sub) {
            sub.textContent = `¿Seguro que querés eliminar «${nombre || 'Recorrido'}»? Esta acción no se puede deshacer.`;
        }
        if (warn) {
            warn.hidden = !enCurso;
            if (enCurso) {
                warn.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Este recorrido está <strong>EN CURSO</strong>. Si lo borrás se pierde el progreso y el chip de recorrido activo.';
            }
        }
        const modal = $('#recModalEliminar');
        if (modal) modal.hidden = false;
    }

    function cerrarModalEliminar() {
        const modal = $('#recModalEliminar');
        if (modal) modal.hidden = true;
        eliminarIdPendiente = null;
    }

    async function confirmarEliminarRecorrido() {
        const id = eliminarIdPendiente;
        if (!id || !state.esAdmin) return;
        const res = await fetch('/Recorridos/Eliminar?id=' + encodeURIComponent(id), { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !(data.valor ?? data.Valor)) {
            toast(data.mensaje || data.Mensaje || 'No se pudo eliminar el recorrido', 'error');
            return;
        }
        cerrarModalEliminar();
        toast('Recorrido eliminado', 'success');
        if (Number(state.recorridoId) === Number(id)) {
            resetEditorVacio();
            usarGps();
        }
        await cargarHistorial();
        if (window.RecorridoBanner) window.RecorridoBanner.refresh();
    }

    async function abrirRecorrido(id) {
        const res = await fetch('/Recorridos/Obtener?id=' + id);
        if (!res.ok) return;
        const r = await res.json();
        state.recorridoId = r.id ?? r.Id;
        state.estado = r.estado ?? r.Estado;
        $('#txtRecId').value = state.recorridoId;
        $('#txtRecNombre').value = r.nombre ?? r.Nombre;
        state.distanciaMetros = r.distanciaMetros ?? r.DistanciaMetros;
        state.duracionSegundos = r.duracionSegundos ?? r.DuracionSegundos;

        const olat = r.origenLat ?? r.OrigenLat;
        const olng = r.origenLng ?? r.OrigenLng;
        if (olat != null && olng != null) {
            setOrigen(olat, olng, r.origenDireccion ?? r.OrigenDireccion);
        }

        state.paradas = (r.paradas || r.Paradas || []).map(p => ({
            id: p.id ?? p.Id,
            idCliente: p.idCliente ?? p.IdCliente,
            idProveedor: p.idProveedor ?? p.IdProveedor,
            tipoParada: p.tipoParada ?? p.TipoParada ?? 'Cliente',
            orden: p.orden ?? p.Orden,
            nombreCliente: p.nombreCliente ?? p.NombreCliente,
            direccion: p.direccion ?? p.Direccion,
            latitud: Number(p.latitud ?? p.Latitud),
            longitud: Number(p.longitud ?? p.Longitud),
            estadoParada: p.estadoParada ?? p.EstadoParada,
            notas: p.notas ?? p.Notas ?? null,
            fechaVisitada: p.fechaVisitada ?? p.FechaVisitada ?? null,
            fechaOmitida: p.fechaOmitida ?? p.FechaOmitida ?? null
        }));

        setTipoDestino(r.tipoDestino ?? r.TipoDestino ?? 'Clientes', { force: true, keepParadas: true });
        renderParadas();
        highlightRouteMarkers();
        updateStats();
        lockEditorSegunEstado();
        $$('.rec-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === 'editor'));
        $$('.rec-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-editor'));
        if (state.origen && state.paradas.length) dibujarRuta(false);
        if (esCerrado()) {
            toast('Recorrido histórico · se muestra tal como se realizó');
        }
        // Queda disponible como ruta predeterminada al crear uno nuevo
        capturarPlantilla();
    }

    async function fetchEnCursoId() {
        try {
            const res = await fetch('/Recorridos/Pendiente');
            const p = await res.json();
            if (!(p.tienePendiente || p.TienePendiente)) return null;
            const estado = p.estado ?? p.Estado ?? '';
            if (estado !== 'EnCurso') return null;
            return p.id ?? p.Id ?? null;
        } catch {
            return null;
        }
    }

    function capturarPlantilla() {
        if (!state.paradas.length) return;
        const origen = state.origen
            ? {
                lat: state.origen.lat,
                lng: state.origen.lng,
                direccion: state.origen.direccion || ''
            }
            : null;
        const plantilla = {
            nombre: ($('#txtRecNombre')?.value || '').trim(),
            tipoDestino: state.tipoDestino || 'Clientes',
            origen,
            paradas: state.paradas.map((p, i) => ({
                idCliente: p.idCliente ?? null,
                idProveedor: p.idProveedor ?? null,
                tipoParada: p.tipoParada || 'Cliente',
                orden: i + 1,
                nombreCliente: p.nombreCliente || '',
                direccion: p.direccion || '',
                latitud: Number(p.latitud),
                longitud: Number(p.longitud),
                estadoParada: 'Pendiente',
                notas: null,
                fechaVisitada: null,
                fechaOmitida: null
            }))
        };
        // Clonar para que editar el editor no mute la plantilla en memoria
        state.ultimaPlantilla = JSON.parse(JSON.stringify(plantilla));
        try {
            sessionStorage.setItem('recUltimaPlantilla', JSON.stringify(plantilla));
        } catch { /* ignore */ }
    }

    function leerPlantillaGuardada() {
        let plantilla = null;
        if (state.ultimaPlantilla?.paradas?.length) {
            plantilla = state.ultimaPlantilla;
        } else {
            try {
                const raw = sessionStorage.getItem('recUltimaPlantilla');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.paradas?.length) {
                        state.ultimaPlantilla = parsed;
                        plantilla = parsed;
                    }
                }
            } catch { /* ignore */ }
        }
        if (!plantilla?.paradas?.length) return null;
        // Devolver copia: al aplicar/editar no se altera la guardada
        return JSON.parse(JSON.stringify(plantilla));
    }

    function resetEditorVacio() {
        state.recorridoId = 0;
        state.estado = 'Borrador';
        state.paradas = [];
        state.distanciaMetros = null;
        state.duracionSegundos = null;
        state.lastOverviewPolyline = null;
        $('#txtRecId').value = '0';
        $('#txtRecNombre').value = '';
        limpiarRutaDibujada();
        setTipoDestino('Clientes', { force: true, keepParadas: true, skipCargarPuntos: false });
        renderParadas();
        highlightRouteMarkers();
        updateStats();
    }

    function aplicarPlantilla(plantilla, opts = {}) {
        if (!plantilla?.paradas?.length) {
            resetEditorVacio();
            usarGps();
            return;
        }
        state.recorridoId = 0;
        state.estado = 'Borrador';
        state.distanciaMetros = null;
        state.duracionSegundos = null;
        state.lastOverviewPolyline = null;
        $('#txtRecId').value = '0';
        $('#txtRecNombre').value = nombrePlantillaConFecha(plantilla.nombre);
        limpiarRutaDibujada();

        state.paradas = plantilla.paradas.map((p, i) => ({
            id: 0,
            idCliente: p.idCliente ?? null,
            idProveedor: p.idProveedor ?? null,
            tipoParada: p.tipoParada || 'Cliente',
            orden: i + 1,
            nombreCliente: p.nombreCliente || '',
            direccion: p.direccion || '',
            latitud: Number(p.latitud),
            longitud: Number(p.longitud),
            estadoParada: 'Pendiente',
            notas: null,
            fechaVisitada: null,
            fechaOmitida: null
        }));

        setTipoDestino(plantilla.tipoDestino || 'Clientes', {
            force: true,
            keepParadas: true,
            skipCargarPuntos: false
        });

        if (plantilla.origen?.lat != null && plantilla.origen?.lng != null) {
            setOrigen(
                Number(plantilla.origen.lat),
                Number(plantilla.origen.lng),
                plantilla.origen.direccion || null
            );
        } else {
            state.origen = null;
            usarGps();
        }

        renderParadas();
        highlightRouteMarkers();
        updateStats();
        lockEditorSegunEstado();
        if (state.origen && state.paradas.length) {
            dibujarRuta(false, true);
        }
        toast(opts.mensaje || 'Nuevo recorrido armado con la ruta guardada', 'success');
    }

    function abrirModalPlantilla(plantilla) {
        const modal = $('#recModalPlantilla');
        const sub = $('#recPlantillaSub');
        const n = plantilla.paradas.length;
        const nombre = (plantilla.nombre || '').trim() || 'sin nombre';
        if (sub) {
            sub.textContent = `Tenés una ruta predeterminada («${nombre}», ${n} parada${n === 1 ? '' : 's'}). ¿Querés usarla para el nuevo recorrido?`;
        }
        if (modal) modal.hidden = false;
    }

    function cerrarModalPlantilla() {
        const modal = $('#recModalPlantilla');
        if (modal) modal.hidden = true;
    }

    async function nuevoRecorrido() {
        if (state.soloLectura) {
            toast('Solo lectura: no podés crear recorridos desde la vista de otro usuario');
            return;
        }
        const enCursoId = await fetchEnCursoId();
        if (enCursoId || state.estado === 'EnCurso') {
            toast('Ya tenés un recorrido en curso. Solo puede haber uno a la vez.');
            if (enCursoId) await abrirRecorrido(enCursoId);
            const alertEl = $('#recPendingAlert');
            if (alertEl) alertEl.hidden = true;
            return;
        }

        // No pisar la ruta predeterminada con lo que hay en pantalla (p. ej. si borraste paradas).
        // Solo capturar si todavía no hay ninguna plantilla guardada.
        if (state.paradas.length && !leerPlantillaGuardada()) {
            capturarPlantilla();
        }

        const plantilla = leerPlantillaGuardada();

        // Siempre limpiar lo que se estaba viendo (ruta/polylines del anterior)
        resetEditorVacio();

        if (plantilla?.paradas?.length) {
            abrirModalPlantilla(plantilla);
            return;
        }

        usarGps();
        toast('Nuevo recorrido listo', 'info');
    }

    function wireUi() {
        $$('.rec-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                $$('.rec-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                $$('.rec-panel').forEach(p => p.classList.remove('active'));
                $('#panel-' + tab.dataset.panel)?.classList.add('active');
            });
        });

        $$('#recTipoDestino .rec-dest-btn').forEach(btn => {
            btn.addEventListener('click', () => setTipoDestino(btn.dataset.tipo));
        });

        $('#btnMiUbicacion')?.addEventListener('click', usarGps);
        $('#btnOptimizar')?.addEventListener('click', () => dibujarRuta(true));
        $('#btnGuardarRecorrido')?.addEventListener('click', () => guardarRecorrido(false));
        $('#btnIniciarRecorrido')?.addEventListener('click', iniciarRecorrido);
        $('#btnFinalizarRecorrido')?.addEventListener('click', finalizarRecorrido);
        $('#btnAbrirGoogleMaps')?.addEventListener('click', abrirEnGoogleMaps);
        $('#btnFabGoogleMaps')?.addEventListener('click', abrirEnGoogleMaps);
        $('#btnExportarMenu')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenuExport();
        });
        $('#btnExportExcel')?.addEventListener('click', exportarExcel);
        $('#btnExportPdf')?.addEventListener('click', exportarPdf);
        document.addEventListener('click', (e) => {
            const wrap = document.querySelector('.rec-export-wrap');
            if (wrap && !wrap.contains(e.target)) cerrarMenuExport();
        });
        $('#btnNuevoRecorrido')?.addEventListener('click', nuevoRecorrido);
        $('#btnToggleSidebar')?.addEventListener('click', () => {
            const app = $('#recApp');
            const side = $('.rec-sidebar');
            const btn = $('#btnToggleSidebar');
            if (!app || !side) return;
            const collapsed = side.classList.toggle('collapsed');
            app.classList.toggle('sidebar-collapsed', collapsed);
            if (btn) {
                btn.title = collapsed ? 'Mostrar panel' : 'Ocultar panel';
                btn.setAttribute('aria-label', btn.title);
                const icon = btn.querySelector('i');
                if (icon) icon.className = collapsed ? 'fa fa-columns' : 'fa fa-bars';
            }
            if (state.map && window.google?.maps?.event) {
                setTimeout(() => {
                    google.maps.event.trigger(state.map, 'resize');
                }, 50);
            }
        });
        $('#txtBuscarClienteMapa')?.addEventListener('input', (e) => {
            drawClientMarkers(e.target.value, { fit: false });
        });

        document.querySelectorAll('[data-close-omitir]').forEach(el => {
            el.addEventListener('click', cerrarModalOmitir);
        });
        document.querySelectorAll('[data-close-obs]').forEach(el => {
            el.addEventListener('click', cerrarModalObs);
        });
        document.querySelectorAll('[data-close-plantilla]').forEach(el => {
            el.addEventListener('click', () => {
                cerrarModalPlantilla();
                usarGps();
                toast('Nuevo recorrido vacío', 'info');
            });
        });
        $('#btnPlantillaUsar')?.addEventListener('click', () => {
            const plantilla = leerPlantillaGuardada();
            cerrarModalPlantilla();
            aplicarPlantilla(plantilla);
        });
        $('#btnPlantillaVacio')?.addEventListener('click', () => {
            cerrarModalPlantilla();
            usarGps();
            toast('Nuevo recorrido vacío', 'info');
        });
        $('#btnConfirmarOmitir')?.addEventListener('click', confirmarOmitirParada);
        $('#txtOmitirObs')?.addEventListener('input', () => {
            const err = $('#recOmitirError');
            const ta = $('#txtOmitirObs');
            if (err) err.hidden = true;
            if (ta) ta.classList.remove('is-invalid');
        });
        document.querySelectorAll('[data-close-eliminar]').forEach(el => {
            el.addEventListener('click', cerrarModalEliminar);
        });
        $('#btnConfirmarEliminar')?.addEventListener('click', confirmarEliminarRecorrido);
        document.querySelectorAll('[data-close-finalizar]').forEach(el => {
            el.addEventListener('click', cerrarModalFinalizar);
        });
        $('#btnConfirmarFinalizar')?.addEventListener('click', confirmarFinalizarRecorrido);
    }

    function onMapsReady() {
        const el = $('#recorridoMap');
        if (!el) return;

        state.map = new google.maps.Map(el, {
            center: { lat: -34.6037, lng: -58.3816 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling: 'greedy',
            styles: [
                { elementType: 'geometry', stylers: [{ color: '#1a2436' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#9db1d2' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3b55' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1726' }] },
                { featureType: 'poi', stylers: [{ visibility: 'off' }] }
            ]
        });

        state.directionsService = new google.maps.DirectionsService();
        state.directionsRenderer = new google.maps.DirectionsRenderer({
            map: state.map,
            suppressMarkers: true,
            suppressPolylines: true, // pintamos tramos verde/naranja a mano
            preserveViewport: false
        });
        state.geocoder = new google.maps.Geocoder();

        const origenInput = $('#txtOrigen');
        if (origenInput) {
            state.autocomplete = new google.maps.places.Autocomplete(origenInput, {
                fields: ['geometry', 'formatted_address'],
                componentRestrictions: { country: 'ar' }
            });
            state.autocomplete.addListener('place_changed', () => {
                const place = state.autocomplete.getPlace();
                if (!place.geometry) return;
                setOrigen(place.geometry.location.lat(), place.geometry.location.lng(), place.formatted_address);
            });
        }

        bootData();
    }

    async function bootData() {
        wireUi();
        renderParadas();
        await cargarPuntos();
        await cargarHistorial();
        if (!state.soloLectura) usarGps();
        lockEditorSegunEstado();

        const params = new URLSearchParams(window.location.search);
        const abrirId = Number(params.get('abrir') || 0);
        if (abrirId > 0) {
            await abrirRecorrido(abrirId);
            const alertEl = $('#recPendingAlert');
            if (alertEl) alertEl.hidden = true;
            try {
                const url = new URL(window.location.href);
                url.searchParams.delete('abrir');
                window.history.replaceState({}, '', url.pathname + url.search);
            } catch { /* ignore */ }
            toast(state.soloLectura ? 'Recorrido abierto (solo lectura)' : 'Recorrido abierto');
            return;
        }

        if (state.soloLectura) {
            const alertEl = $('#recPendingAlert');
            if (alertEl) alertEl.hidden = true;
            $$('.rec-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === 'historial'));
            $$('.rec-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-historial'));
            return;
        }

        await chequearPendienteAlEntrar();
    }

    async function chequearPendienteAlEntrar() {
        const alertEl = $('#recPendingAlert');
        if (!alertEl) return;

        try {
            const res = await fetch('/Recorridos/Pendiente');
            const p = await res.json();
            if (!(p.tienePendiente || p.TienePendiente)) {
                alertEl.hidden = true;
                return;
            }

            const id = p.id ?? p.Id;
            const nombre = p.nombre ?? p.Nombre ?? 'Recorrido';
            const estado = p.estado ?? p.Estado ?? '';
            const proxima = p.proximaParadaNombre ?? p.ProximaParadaNombre;
            const cant = p.cantidadParadas ?? p.CantidadParadas ?? 0;

            // Si hay uno en curso, abrirlo directo
            if (estado === 'EnCurso' && id) {
                await abrirRecorrido(id);
                alertEl.hidden = true;
                return;
            }

            $('#recPendingAlertTitle').textContent =
                estado === 'EnCurso'
                    ? 'Tenés un recorrido en curso'
                    : 'Tenés un recorrido pendiente';

            let sub = nombre;
            if (estado === 'EnCurso' && proxima) sub += ` · siguiente: ${proxima}`;
            else if (cant) sub += ` · ${cant} parada${cant === 1 ? '' : 's'}`;
            $('#recPendingAlertSub').textContent = sub;

            alertEl.hidden = false;
            alertEl.dataset.pendienteId = id || '';

            const btnAbrir = $('#btnAbrirPendiente');
            if (btnAbrir) {
                btnAbrir.onclick = async () => {
                    if (!id) return;
                    await abrirRecorrido(id);
                    alertEl.hidden = true;
                    toast(estado === 'EnCurso' ? 'Recorrido en curso abierto' : 'Recorrido pendiente abierto');
                };
            }

            const btnCerrar = $('#btnCerrarPendienteAlert');
            if (btnCerrar) {
                btnCerrar.onclick = () => { alertEl.hidden = true; };
            }
        } catch {
            alertEl.hidden = true;
        }
    }

    function bootWithoutMaps() {
        wireUi();
        renderParadas();
        cargarHistorial();
        chequearPendienteAlEntrar();
    }

    window.RecorridosApp = {
        onMapsReady,
        bootWithoutMaps,
        toast,
        async reloadIfOpen() {
            if (state.recorridoId && (state.estado === 'EnCurso' || state.estado === 'Finalizado')) {
                await abrirRecorrido(state.recorridoId);
            }
        }
    };
})();
