// =====================================================================
// CONFIGURACIÓN DE LA API PARA CONSULTAR DNI Y RUC
// El token es como una contraseña que nos da permiso para usar el servicio
// =====================================================================
const API_TOKEN = 'sk_13668.HaO80R1Q4FvuyPNI8Wz1j5BrPFIPC6eo';

// =====================================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// Aquí guardamos todos los datos de la app mientras está abierta:
// nombre del negocio, configuración, platos, pedidos, ventas y clientes
// =====================================================================
let state = {
  name: 'Pollería Nicol',        // Nombre del negocio (editable)
  config: { direccion: '', telefono: '' }, // Datos del negocio
  platos: [],    // Lista de platos de la carta
  pedidos: [],   // Lista de pedidos activos
  ventas: [],    // Historial de ventas
  clientes: []   // Lista de clientes registrados
};

// Guarda el estado en localStorage del navegador para que no se pierda al cerrar
function save() {
  localStorage.setItem('polleria_nicol', JSON.stringify(state));
  // JSON.stringify convierte el objeto a texto para poder guardarlo
}

// Carga los datos guardados al abrir la app
function load() {
  const d = localStorage.getItem('polleria_nicol'); // Busca datos guardados
  if (d) state = JSON.parse(d); // JSON.parse convierte el texto de vuelta a objeto
}
load(); // Ejecuta la carga al iniciar la app

// =====================================================================
// NAVEGACIÓN ENTRE PESTAÑAS
// Muestra la sección seleccionada y oculta las demás
// =====================================================================
function showTab(t) {
  // Quita la clase "active" de todas las secciones (las oculta)
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Quita la clase "active" de todos los botones del menú
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

  // Muestra solo la sección que se seleccionó
  document.getElementById('tab-' + t).classList.add('active');

  // Resalta el botón del menú que fue clickeado
  event.target.classList.add('active');

  // Renderiza (dibuja) el contenido de la pestaña correspondiente
  if (t === 'dashboard') renderDashboard();
  if (t === 'productos') renderPlatos();
  if (t === 'ventas') renderVentas();
  if (t === 'reportes') renderReportes();
  if (t === 'pedidos') renderPedidos();
  if (t === 'clientes') renderClientes();
}

// =====================================================================
// EDICIÓN DEL NOMBRE DEL NEGOCIO
// =====================================================================

// Abre el modal (ventana emergente) para editar el nombre
function openEditName() {
  // Pone el nombre actual en el campo de texto del modal
  document.getElementById('modal-name-input').value = state.name;
  // Muestra el modal añadiendo la clase "open"
  document.getElementById('modal-name').classList.add('open');
}

// Guarda el nuevo nombre cuando el usuario confirma
function saveEditName() {
  // Si el campo no está vacío, actualiza el nombre; si está vacío, mantiene el anterior
  state.name = document.getElementById('modal-name-input').value || state.name;
  // Actualiza el nombre visible en el encabezado
  document.getElementById('bizName').textContent = state.name;
  // Cambia el título de la pestaña del navegador
  document.title = state.name;
  save(); // Guarda los cambios
  closeModal('modal-name'); // Cierra el modal
}

// Cierra cualquier modal según su ID
function closeModal(id) {
  document.getElementById(id).classList.remove('open'); // Quita la clase que lo hace visible
}

// =====================================================================
// CONSULTA DE DNI / RUC EN TIEMPO REAL
// =====================================================================

// Detecta si lo que se escribe es DNI (8 dígitos) o RUC (11 dígitos)
function onDocInput(prefix) {
  // Solo permite números, elimina cualquier letra o símbolo
  const val = document.getElementById(prefix + '-doc').value.replace(/\D/g, '');
  document.getElementById(prefix + '-doc').value = val;

  const badge = document.getElementById(prefix + '-doc-badge'); // Etiqueta DNI o RUC

  if (val.length === 8) {
    badge.textContent = 'DNI';           // Muestra "DNI"
    badge.className = 'dni-badge dni-ok'; // Color verde
    badge.style.display = 'inline';       // Hace visible la etiqueta
  } else if (val.length === 11) {
    badge.textContent = 'RUC';            // Muestra "RUC"
    badge.className = 'dni-badge badge-blue'; // Color azul
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none'; // Oculta la etiqueta si no tiene 8 ni 11 dígitos
  }
}

// Consulta los datos del DNI o RUC a la API de RENIEC/SUNAT
async function consultarDoc(prefix) {
  const val = document.getElementById(prefix + '-doc').value.trim();
  const info = document.getElementById(prefix + '-doc-info'); // Área donde mostrar el resultado

  // Valida que tenga exactamente 8 o 11 dígitos
  if (val.length !== 8 && val.length !== 11) {
    info.innerHTML = '<span style="color:#e53935">Ingresa un DNI (8 dígitos) o RUC (11 dígitos)</span>';
    return; // Detiene la función si no es válido
  }

  const tipo = val.length === 8 ? 'dni' : 'ruc'; // Determina si es DNI o RUC
  info.innerHTML = '<span class="spinner"></span> Consultando...'; // Muestra animación de carga

  try {
    // Hace la petición a la API con el número ingresado
    const res = await fetch(`https://api.apis.net.pe/v2/${tipo}?numero=${val}`, {
      headers: {
        Authorization: 'Bearer ' + API_TOKEN, // Envía el token de autorización
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error('No encontrado'); // Si la respuesta falla, lanza un error

    const data = await res.json(); // Convierte la respuesta a objeto JavaScript

    // Intenta obtener el nombre desde diferentes campos que puede devolver la API
    const nombre = data.nombre || data.razonSocial || data.nombreCompleto || '';
    if (!nombre) throw new Error('Sin datos');

    // Rellena automáticamente el campo nombre con el dato obtenido
    document.getElementById(prefix + '-nombre').value = nombre;
    info.innerHTML = `✅ <strong>${tipo.toUpperCase()}</strong> válido — <span style="color:#333">${nombre}</span>`;

  } catch (e) {
    // Si algo falla, muestra mensaje de error
    info.innerHTML = '<span style="color:#e53935">❌ No se encontró información. Verifica el número.</span>';
  }
}

// =====================================================================
// GESTIÓN DE CLIENTES
// =====================================================================

// Agrega un nuevo cliente a la lista
function addCliente() {
  const n = document.getElementById('cl-nombre').value.trim(); // Obtiene el nombre
  if (!n) { alert('Ingresa el nombre del cliente'); return; } // Valida que no esté vacío

  const doc = document.getElementById('cl-doc').value.trim(); // Número de documento
  // Determina el tipo de documento según la cantidad de dígitos
  const tipo = doc.length === 8 ? 'DNI' : doc.length === 11 ? 'RUC' : '—';

  // Agrega el nuevo cliente al arreglo de clientes
  state.clientes.push({
    id: Date.now(), // Usa la fecha actual como ID único
    nombre: n,
    doc,
    tipoDoc: tipo,
    telefono: document.getElementById('cl-telefono').value,
    email: document.getElementById('cl-email').value,
    pedidos: 0 // Contador de pedidos, empieza en 0
  });

  save(); // Guarda los cambios
  renderClientes(); // Actualiza la tabla en pantalla

  // Limpia los campos del formulario después de agregar
  ['cl-doc', 'cl-nombre', 'cl-telefono', 'cl-email'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cl-doc-info').textContent = '';
  document.getElementById('cl-doc-badge').style.display = 'none';
}

// Dibuja la tabla de clientes en pantalla
function renderClientes() {
  const q = document.getElementById('cl-buscar')?.value?.toLowerCase() || ''; // Texto de búsqueda
  const tb = document.getElementById('tbl-clientes'); // Referencia al cuerpo de la tabla

  // Filtra clientes cuyo nombre o documento coincida con la búsqueda
  const list = state.clientes.filter(c =>
    c.nombre.toLowerCase().includes(q) || (c.doc || '').includes(q)
  );

  // Si no hay resultados, muestra mensaje vacío
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="6" class="empty">Sin clientes aún</td></tr>';
    return;
  }

  // Construye las filas de la tabla con los datos de cada cliente
  tb.innerHTML = list.map(c => `<tr>
    <td><strong>${c.nombre}</strong></td>
    <td>${c.doc || '—'}</td>
    <td><span class="badge ${c.tipoDoc === 'RUC' ? 'badge-blue' : 'badge-orange'}">${c.tipoDoc || '—'}</span></td>
    <td>${c.telefono || '—'}</td>
    <td>${c.pedidos || 0}</td>
    <td>
      <button class="btn btn-sm" style="background:#fff3e0;color:#e65c00" onclick="openEditCl(${c.id})">✏️</button>
      <button class="btn btn-danger btn-sm" onclick="deleteCl(${c.id})">🗑️</button>
    </td>
  </tr>`).join(''); // .join('') une todas las filas en un solo texto HTML
}

// Abre el modal para editar un cliente existente
function openEditCl(id) {
  const c = state.clientes.find(x => x.id === id); // Busca el cliente por ID
  if (!c) return;
  // Rellena el modal con los datos actuales del cliente
  document.getElementById('ecl-id').value = id;
  document.getElementById('ecl-doc').value = c.doc || '';
  document.getElementById('ecl-nombre').value = c.nombre;
  document.getElementById('ecl-tel').value = c.telefono || '';
  document.getElementById('ecl-email').value = c.email || '';
  document.getElementById('modal-edit-cl').classList.add('open'); // Muestra el modal
}

// Guarda los cambios al editar un cliente
function saveEditCl() {
  const id = parseInt(document.getElementById('ecl-id').value); // Convierte ID a número entero
  const c = state.clientes.find(x => x.id === id);
  if (!c) return;
  const doc = document.getElementById('ecl-doc').value.trim();
  c.doc = doc;
  c.tipoDoc = doc.length === 8 ? 'DNI' : doc.length === 11 ? 'RUC' : '—';
  c.nombre = document.getElementById('ecl-nombre').value || c.nombre;
  c.telefono = document.getElementById('ecl-tel').value;
  c.email = document.getElementById('ecl-email').value;
  save(); renderClientes(); closeModal('modal-edit-cl');
}

// Elimina un cliente por su ID
function deleteCl(id) {
  if (confirm('¿Eliminar cliente?')) {
    // filter crea un nuevo arreglo sin el cliente eliminado
    state.clientes = state.clientes.filter(c => c.id !== id);
    save(); renderClientes();
  }
}

// Elimina todos los clientes de la lista
function clearClientes() {
  if (confirm('¿Eliminar todos los clientes?')) {
    state.clientes = []; // Vacía el arreglo
    save(); renderClientes();
  }
}

// =====================================================================
// GESTIÓN DE PLATOS (CARTA)
// =====================================================================

// Agrega un nuevo plato a la carta
function addPlato() {
  const n = document.getElementById('p-nombre').value.trim();
  const p = parseFloat(document.getElementById('p-precio').value); // Convierte a número decimal
  if (!n || isNaN(p)) { alert('Completa nombre y precio'); return; } // isNaN verifica si no es número

  state.platos.push({
    id: Date.now(),
    nombre: n,
    cat: document.getElementById('p-cat').value, // Categoría seleccionada
    precio: p,
    desc: document.getElementById('p-desc').value // Descripción opcional
  });

  save(); renderPlatos();
  // Limpia los campos del formulario
  document.getElementById('p-nombre').value = '';
  document.getElementById('p-precio').value = '';
  document.getElementById('p-desc').value = '';
}

// Dibuja la tabla de platos en pantalla
function renderPlatos() {
  const tb = document.getElementById('tbl-platos');
  if (!state.platos.length) {
    tb.innerHTML = '<tr><td colspan="4" class="empty">Sin platos aún</td></tr>';
    return;
  }
  tb.innerHTML = state.platos.map(p => `<tr>
    <td><strong>${p.nombre}</strong>${p.desc ? '<br><small style="color:#999">' + p.desc + '</small>' : ''}</td>
    <td><span class="badge badge-orange">${p.cat}</span></td>
    <td><strong>S/ ${p.precio.toFixed(2)}</strong></td>
    <td>
      <button class="btn btn-sm" style="background:#fff3e0;color:#e65c00" onclick="openEditPlato(${p.id})">✏️</button>
      <button class="btn btn-danger btn-sm" onclick="deletePlato(${p.id})">🗑️</button>
    </td>
  </tr>`).join('');
}

// Abre el modal para editar un plato
function openEditPlato(id) {
  const p = state.platos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('ep-id').value = id;
  document.getElementById('ep-nombre').value = p.nombre;
  document.getElementById('ep-cat').value = p.cat;
  document.getElementById('ep-precio').value = p.precio;
  document.getElementById('ep-desc').value = p.desc || '';
  document.getElementById('modal-edit-plato').classList.add('open');
}

// Guarda los cambios al editar un plato
function saveEditPlato() {
  const id = parseInt(document.getElementById('ep-id').value);
  const p = state.platos.find(x => x.id === id);
  if (!p) return;
  p.nombre = document.getElementById('ep-nombre').value || p.nombre;
  p.cat = document.getElementById('ep-cat').value;
  p.precio = parseFloat(document.getElementById('ep-precio').value) || p.precio;
  p.desc = document.getElementById('ep-desc').value;
  save(); renderPlatos(); closeModal('modal-edit-plato');
}

// Elimina un plato por su ID
function deletePlato(id) {
  if (confirm('¿Eliminar este plato?')) {
    state.platos = state.platos.filter(p => p.id !== id);
    save(); renderPlatos();
  }
}

// Elimina todos los platos de la carta
function clearPlatos() {
  if (confirm('¿Eliminar toda la carta?')) {
    state.platos = [];
    save(); renderPlatos();
  }
}

// =====================================================================
// GESTIÓN DE PEDIDOS
// =====================================================================

let pedItems = []; // Arreglo temporal que guarda los ítems del pedido actual

// Agrega un ítem (plato) al pedido actual
function addPedidoItem() {
  if (!state.platos.length) { alert('Agrega platos primero'); return; }
  // Agrega el primer plato de la carta como ítem por defecto
  pedItems.push({ platoId: state.platos[0].id, cant: 1 });
  renderPedItems(); // Actualiza la vista de ítems
}

// Dibuja los ítems del pedido actual en pantalla
function renderPedItems() {
  const w = document.getElementById('ped-items-wrap');
  if (!pedItems.length) { w.innerHTML = ''; return; }
  w.innerHTML = pedItems.map((it, i) => `<div class="form-row" style="align-items:center">
    <select onchange="pedItems[${i}].platoId=parseInt(this.value)" style="flex:2">
      ${state.platos.map(p => `<option value="${p.id}" ${p.id === it.platoId ? 'selected' : ''}>${p.nombre} - S/ ${p.precio.toFixed(2)}</option>`).join('')}
    </select>
    <input type="number" min="1" value="${it.cant}" style="flex:.5;min-width:55px" onchange="pedItems[${i}].cant=parseInt(this.value)||1"/>
    <button class="btn btn-danger btn-sm" onclick="pedItems.splice(${i},1);renderPedItems()">✕</button>
  </div>`).join('');
  // splice elimina el ítem de la posición indicada
}

// Crea un nuevo pedido con los ítems seleccionados
function crearPedido() {
  const cliente = document.getElementById('ped-cliente').value.trim() || 'Cliente';
  if (!pedItems.length) { alert('Agrega al menos un ítem'); return; }

  // Construye la lista de ítems con nombre, cantidad y precio
  const items = pedItems.map(it => {
    const p = state.platos.find(x => x.id === it.platoId);
    return { nombre: p.nombre, cant: it.cant, precio: p.precio };
  });

  // Calcula el total sumando precio × cantidad de cada ítem
  const total = items.reduce((s, i) => s + i.precio * i.cant, 0);

  // Crea el objeto pedido con todos sus datos
  const ped = {
    id: Date.now(),
    cliente,
    tipo: document.getElementById('ped-tipo').value, // Mesa, delivery o para llevar
    mesa: document.getElementById('ped-mesa').value,
    items,
    total,
    estado: 'Pendiente', // Estado inicial del pedido
    fecha: new Date().toLocaleString() // Fecha y hora actual
  };

  state.pedidos.push(ped);   // Agrega a pedidos activos
  state.ventas.push({ ...ped }); // También lo registra en ventas (copia del objeto)

  // Si el cliente está registrado, suma 1 a su contador de pedidos
  const cl = state.clientes.find(c => c.nombre.toLowerCase() === cliente.toLowerCase());
  if (cl) cl.pedidos = (cl.pedidos || 0) + 1;

  save(); pedItems = []; // Limpia los ítems temporales
  document.getElementById('ped-cliente').value = '';
  document.getElementById('ped-mesa').value = '';
  renderPedItems(); renderPedidos(); renderDashboard();
}

// Dibuja la lista de pedidos activos
function renderPedidos() {
  // Solo muestra pedidos que no han sido entregados
  const activos = state.pedidos.filter(p => p.estado !== 'Entregado');
  const el = document.getElementById('lista-pedidos');
  if (!activos.length) { el.innerHTML = '<div class="empty">Sin pedidos activos</div>'; return; }
  el.innerHTML = activos.map(p => `<div class="card" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
      <div><strong>${p.cliente}</strong> — <span class="badge badge-orange">${p.tipo}</span> ${p.mesa ? '<small>(' + p.mesa + ')</small>' : ''}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <select onchange="cambiarEstado(${p.id},this.value)" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:.8rem">
          ${['Pendiente', 'En preparación', 'Listo', 'Entregado'].map(e => `<option ${p.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
        <button class="btn btn-danger btn-sm" onclick="deletePedido(${p.id})">🗑️</button>
      </div>
    </div>
    <div style="margin-top:8px;font-size:.82rem">${p.items.map(i => `<span style="margin-right:10px">• ${i.nombre} x${i.cant} = S/ ${(i.precio * i.cant).toFixed(2)}</span>`).join('')}</div>
    <div style="margin-top:6px;font-weight:700;color:var(--primary)">Total: S/ ${p.total.toFixed(2)}</div>
  </div>`).join('');
}

// Cambia el estado de un pedido (Pendiente → En preparación → Listo → Entregado)
function cambiarEstado(id, est) {
  const p = state.pedidos.find(x => x.id === id);
  if (p) { p.estado = est; save(); renderPedidos(); renderDashboard(); }
}

// Elimina un pedido por su ID
function deletePedido(id) {
  if (confirm('¿Eliminar pedido?')) {
    state.pedidos = state.pedidos.filter(p => p.id !== id);
    save(); renderPedidos(); renderDashboard();
  }
}

// =====================================================================
// HISTORIAL DE VENTAS
// =====================================================================

// Dibuja la tabla del historial de ventas
function renderVentas() {
  const q = document.getElementById('v-buscar')?.value?.toLowerCase() || '';
  const tb = document.getElementById('tbl-ventas');
  const list = state.ventas.filter(v => v.cliente.toLowerCase().includes(q));
  if (!list.length) { tb.innerHTML = '<tr><td colspan="7" class="empty">Sin ventas aún</td></tr>'; return; }
  tb.innerHTML = list.map((v, i) => `<tr>
    <td>${i + 1}</td>
    <td>${v.cliente}</td>
    <td>${v.tipo}</td>
    <td><strong>S/ ${v.total.toFixed(2)}</strong></td>
    <td><span class="badge ${v.estado === 'Entregado' ? 'badge-green' : v.estado === 'Pendiente' ? 'badge-orange' : 'badge-red'}">${v.estado}</span></td>
    <td style="font-size:.78rem">${v.fecha}</td>
    <td><button class="btn btn-danger btn-sm" onclick="deleteVenta(${v.id})">🗑️</button></td>
  </tr>`).join('');
}

// Elimina una venta del historial
function deleteVenta(id) {
  if (confirm('¿Eliminar venta?')) {
    state.ventas = state.ventas.filter(v => v.id !== id);
    save(); renderVentas();
  }
}

// Borra todo el historial de ventas
function clearVentas() {
  if (confirm('¿Eliminar historial?')) {
    state.ventas = [];
    save(); renderVentas();
  }
}

// =====================================================================
// REPORTES Y ESTADÍSTICAS
// =====================================================================
function renderReportes() {
  // Calcula el total de ingresos sumando todas las ventas
  const total = state.ventas.reduce((s, v) => s + v.total, 0);

  // Actualiza las tarjetas de estadísticas
  document.getElementById('r-total').textContent = 'S/ ' + total.toFixed(2);
  document.getElementById('r-count').textContent = state.ventas.length;
  // Ticket promedio = total de ingresos ÷ número de ventas
  document.getElementById('r-promedio').textContent = state.ventas.length
    ? 'S/ ' + (total / state.ventas.length).toFixed(2) : 'S/ 0';

  // Genera los últimos 7 días para el gráfico
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i); // Resta i días a la fecha actual
    days.push(d);
  }

  // Calcula el total de ventas por cada día
  const dayTotals = days.map(d => {
    const ds = d.toLocaleDateString(); // Fecha en formato legible
    return {
      lbl: d.toLocaleDateString('es', { weekday: 'short' }), // Etiqueta: Lun, Mar...
      val: state.ventas
        .filter(v => new Date(v.fecha).toLocaleDateString() === ds)
        .reduce((s, v) => s + v.total, 0)
    };
  });

  // Encuentra el valor máximo para escalar las barras del gráfico proporcionalmente
  const max = Math.max(...dayTotals.map(d => d.val), 1);

  // Dibuja las barras del gráfico
  document.getElementById('chart-dias').innerHTML = dayTotals.map(d => `<div class="chart-bar-col">
    <div class="chart-val">${d.val > 0 ? 'S/' + d.val.toFixed(0) : ''}</div>
    <div class="chart-bar" style="height:${(d.val / max) * 90}px"></div>
    <div class="chart-lbl">${d.lbl}</div>
  </div>`).join('');

  // Cuenta cuántas veces se vendió cada plato
  const cnt = {};
  state.ventas.forEach(v => v.items.forEach(i => {
    cnt[i.nombre] = (cnt[i.nombre] || 0) + i.cant; // Suma las cantidades
  }));

  // Ordena de mayor a menor y toma solo los 5 primeros
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Dibuja el ranking de platos más vendidos con barras de progreso
  document.getElementById('top-platos').innerHTML = top.length
    ? top.map(([n, c], i) => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-weight:700;color:var(--primary);min-width:20px">${i + 1}.</span>
        <div style="flex:1">
          <div style="font-size:.85rem;font-weight:600">${n}</div>
          <div style="background:#fef3e2;border-radius:4px;height:8px;margin-top:4px">
            <div style="background:var(--primary);height:8px;border-radius:4px;width:${(c / top[0][1]) * 100}%"></div>
          </div>
        </div>
        <span style="font-weight:700;font-size:.9rem">${c} uds</span>
      </div>`).join('')
    : '<div class="empty">Sin datos aún</div>';
}

// =====================================================================
// DASHBOARD PRINCIPAL
// Muestra un resumen rápido del estado del negocio
// =====================================================================
function renderDashboard() {
  const hoy = new Date().toLocaleDateString(); // Fecha de hoy

  // Filtra solo las ventas de hoy
  const vh = state.ventas.filter(v => new Date(v.fecha).toLocaleDateString() === hoy);

  // Actualiza las tarjetas del dashboard
  document.getElementById('st-ventas').textContent = vh.length; // Número de ventas hoy
  document.getElementById('st-ingresos').textContent = 'S/ ' + vh.reduce((s, v) => s + v.total, 0).toFixed(2);
  document.getElementById('st-pedidos').textContent = state.pedidos.filter(p => p.estado !== 'Entregado').length;
  document.getElementById('st-platos').textContent = state.platos.length;

  // Muestra los últimos 3 pedidos registrados
  const rec = state.pedidos.slice(-3).reverse(); // slice(-3) toma los últimos 3, reverse() los invierte
  document.getElementById('dash-pedidos').innerHTML = rec.length
    ? rec.map(p => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:.85rem">
        <span><strong>${p.cliente}</strong> — ${p.tipo}</span>
        <span class="badge ${p.estado === 'Entregado' ? 'badge-green' : p.estado === 'Pendiente' ? 'badge-orange' : 'badge-red'}">${p.estado}</span>
        <strong>S/ ${p.total.toFixed(2)}</strong>
      </div>`).join('')
    : '<div class="empty">Sin pedidos aún</div>';
}

// =====================================================================
// CONFIGURACIÓN DEL NEGOCIO
// =====================================================================

// Guarda solo el nombre del negocio
function saveConfig() {
  const n = document.getElementById('cfg-nombre').value.trim();
  if (n) {
    state.name = n;
    document.getElementById('bizName').textContent = n; // Actualiza el encabezado
    document.title = n; // Actualiza el título de la pestaña
  }
  save();
  alert('Nombre guardado ✓');
}

// Guarda todos los datos de configuración
function saveConfigFull() {
  saveConfig(); // Primero guarda el nombre
  state.config.direccion = document.getElementById('cfg-direccion').value;
  state.config.telefono = document.getElementById('cfg-telefono').value;
  save();
  alert('Configuración guardada ✓');
}

// =====================================================================
// INICIO DE LA APLICACIÓN
// Estas líneas se ejecutan automáticamente al abrir la app
// =====================================================================
renderDashboard(); // Muestra el dashboard al cargar
document.getElementById('cfg-nombre').value = state.name; // Rellena el campo de config
document.getElementById('bizName').textContent = state.name; // Muestra el nombre en el header
