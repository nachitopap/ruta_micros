import { createIcons, Building2, Bus, Check, ChevronDown, CircleAlert, LogOut, Menu, Pencil, Plus, Route, Search, Trash2, Users, X } from 'lucide';
import { hasSupabaseConfig, supabase } from './supabase.js';
import './style.css';

const app = document.querySelector('#app');
const navItems = [
  { id: 'empresas', label: 'Empresas', icon: Building2 },
  { id: 'trabajadores', label: 'Trabajadores', icon: Users },
  { id: 'micros', label: 'Micros', icon: Bus },
  { id: 'asignaciones', label: 'Asignaciones', icon: Route },
];
const tableByPage = {
  empresas: 'empresas',
  trabajadores: 'trabajadores',
  micros: 'micros',
  asignaciones: 'asignaciones_micro',
};
const state = {
  user: null,
  page: 'empresas',
  companies: [],
  workers: [],
  buses: [],
  assignments: [],
  routes: [],
  search: '',
  companyFilter: '',
  modal: null,
  busy: false,
  authMode: 'login',
  flash: '',
  error: '',
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function iconMarkup(icon, className = '') {
  const names = new Map([
    [Building2, 'building-2'], [Bus, 'bus'], [Check, 'check'], [ChevronDown, 'chevron-down'],
    [CircleAlert, 'circle-alert'], [LogOut, 'log-out'], [Menu, 'menu'], [Pencil, 'pencil'],
    [Plus, 'plus'], [Route, 'route'], [Search, 'search'], [Trash2, 'trash-2'], [Users, 'users'], [X, 'x'],
  ]);
  const name = names.get(icon);
  return name ? `<i class="${className}" data-lucide="${name}" aria-hidden="true"></i>` : '';
}

function renderIcons() {
  createIcons({ icons: { Building2, Bus, Check, ChevronDown, CircleAlert, LogOut, Menu, Pencil, Plus, Route, Search, Trash2, Users, X } });
}

function noticeMarkup() {
  if (state.error) return `<div class="notice notice-error" role="alert">${iconMarkup(CircleAlert)}<span>${escapeHtml(state.error)}</span><button class="icon-button" data-action="dismiss-notice" aria-label="Cerrar aviso">${iconMarkup(X)}</button></div>`;
  if (state.flash) return `<div class="notice notice-success" role="status">${iconMarkup(Check)}<span>${escapeHtml(state.flash)}</span><button class="icon-button" data-action="dismiss-notice" aria-label="Cerrar aviso">${iconMarkup(X)}</button></div>`;
  return '';
}

function renderLogin() {
  const isRegister = state.authMode === 'register';
  app.innerHTML = `
    <main class="auth-layout">
      <section class="auth-intro">
        <a class="brand brand-light" href="#" aria-label="Ruta Micros">
          <span class="brand-mark">${iconMarkup(Bus)}</span><span>ruta<span class="brand-accent">.</span>micros</span>
        </a>
        <div class="auth-copy">
          <p class="eyebrow">OPERACIÓN DE TRANSPORTE</p>
          <h1>Una flota<br />bien conectada.</h1>
          <p>Empresas, equipos, micros y rutas en un solo lugar.</p>
        </div>
        <div class="auth-stamp"><span>RM</span><span>Gestión de flota<br />en ruta</span></div>
      </section>
      <section class="auth-panel">
        <div class="auth-form-wrap">
          <p class="eyebrow">PORTAL DE ADMINISTRACIÓN</p>
          <h2>${isRegister ? 'Crear acceso' : 'Bienvenido de vuelta'}</h2>
          <p class="auth-subtitle">${isRegister ? 'Registra una cuenta en el mismo proyecto Supabase.' : 'Ingresa con la cuenta que ya usas en Ubicación Ruta.'}</p>
          ${state.error ? `<div class="form-error" role="alert">${escapeHtml(state.error)}</div>` : ''}
          <form id="auth-form" class="stack-form">
            <label>Correo electrónico<input name="email" type="email" autocomplete="email" placeholder="nombre@empresa.cl" required /></label>
            <label>Contraseña<input name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" minlength="6" placeholder="Mínimo 6 caracteres" required /></label>
            <button class="button button-primary button-wide" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Procesando…' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}<span>${iconMarkup(isRegister ? Plus : ChevronDown)}</span></button>
          </form>
          <button class="text-button auth-toggle" data-action="toggle-auth">${isRegister ? 'Ya tienes cuenta? Inicia sesión' : '¿Primera vez? Crear cuenta'}</button>
          <p class="auth-footnote">La clave se verifica con autenticación de Supabase. La app nunca recibe permisos administrativos.</p>
        </div>
      </section>
    </main>`;
  renderIcons();
}

function pageTitle() {
  return navItems.find(item => item.id === state.page)?.label ?? 'Empresas';
}

function activeAssignmentFor(busId) {
  return state.assignments.find(assignment => assignment.micro_id === busId && !assignment.hasta);
}

function companyOptions(selected = '') {
  return state.companies.map(company => `<option value="${escapeHtml(company.id)}" ${company.id === selected ? 'selected' : ''}>${escapeHtml(company.nombre)}</option>`).join('');
}

function workerOptions(companyId, selected = '') {
  return state.workers.filter(worker => !companyId || worker.empresa_id === companyId)
    .map(worker => `<option value="${escapeHtml(worker.id)}" ${worker.id === selected ? 'selected' : ''}>${escapeHtml(worker.nombre)}</option>`).join('');
}

function busOptions(companyId, selected = '') {
  return state.buses.filter(bus => !companyId || bus.empresa_id === companyId)
    .map(bus => `<option value="${escapeHtml(bus.id)}" ${bus.id === selected ? 'selected' : ''}>${escapeHtml(bus.numero_interno)} · ${escapeHtml(bus.patente)}</option>`).join('');
}

function routeOptions(selected = '') {
  return state.routes.map(route => `<option value="${escapeHtml(route.id)}" ${route.id === selected ? 'selected' : ''}>${escapeHtml(route.nombre)}</option>`).join('');
}

function rowActions(entity, id) {
  return `<div class="row-actions"><button class="icon-button" data-action="edit" data-entity="${entity}" data-id="${escapeHtml(id)}" aria-label="Editar" title="Editar">${iconMarkup(Pencil)}</button><button class="icon-button icon-danger" data-action="delete" data-entity="${entity}" data-id="${escapeHtml(id)}" aria-label="Eliminar" title="Eliminar">${iconMarkup(Trash2)}</button></div>`;
}

function companyRows() {
  return state.companies.map(company => {
    const workerCount = state.workers.filter(worker => worker.empresa_id === company.id).length;
    const busCount = state.buses.filter(bus => bus.empresa_id === company.id).length;
    return `<tr><td><span class="primary-cell">${escapeHtml(company.nombre)}</span><span class="secondary-cell">Agregada ${formatDate(company.creado_en)}</span></td><td>${escapeHtml(company.rut || '—')}</td><td>${escapeHtml(company.telefono || '—')}</td><td><span class="count-cell">${workerCount} trabajadores</span></td><td><span class="count-cell">${busCount} micros</span></td><td><div class="row-actions"><button class="text-action" data-action="show-workers" data-id="${escapeHtml(company.id)}">Ver equipo</button>${rowActions('empresas', company.id)}</div></td></tr>`;
  }).join('');
}

function workerRows() {
  return state.workers.filter(worker => !state.companyFilter || worker.empresa_id === state.companyFilter).map(worker => `<tr><td><span class="primary-cell">${escapeHtml(worker.nombre)}</span><span class="secondary-cell">${escapeHtml(worker.documento || 'Sin documento')}</span></td><td>${escapeHtml(worker.empresas?.nombre || companyName(worker.empresa_id))}</td><td>${escapeHtml(worker.telefono || '—')}</td><td>${escapeHtml(worker.correo || '—')}</td><td>${rowActions('trabajadores', worker.id)}</td></tr>`).join('');
}

function busRows() {
  return state.buses.map(bus => {
    const assignment = activeAssignmentFor(bus.id);
    return `<tr><td><span class="primary-cell">${escapeHtml(bus.numero_interno)}</span><span class="secondary-cell">${escapeHtml(bus.patente)}</span></td><td>${escapeHtml(bus.empresas?.nombre || companyName(bus.empresa_id))}</td><td>${escapeHtml(bus.marca_modelo || '—')}</td><td>${bus.capacidad ? `${escapeHtml(bus.capacidad)} asientos` : '—'}</td><td>${assignment ? `<span class="primary-cell">${escapeHtml(assignment.rutas?.nombre || routeName(assignment.ruta_id))}</span><span class="secondary-cell">${escapeHtml(assignment.trabajadores?.nombre || workerName(assignment.trabajador_id))}</span>` : '<span class="status-pill status-neutral">Sin asignar</span>'}</td><td>${rowActions('micros', bus.id)}</td></tr>`;
  }).join('');
}

function assignmentRows() {
  return state.assignments.map(assignment => `<tr><td><span class="primary-cell">${escapeHtml(assignment.micros?.numero_interno || busName(assignment.micro_id))}</span><span class="secondary-cell">${escapeHtml(assignment.micros?.patente || '')}</span></td><td>${escapeHtml(assignment.trabajadores?.nombre || workerName(assignment.trabajador_id))}</td><td>${escapeHtml(assignment.rutas?.nombre || routeName(assignment.ruta_id))}</td><td>${formatDate(assignment.desde)}</td><td>${assignment.hasta ? formatDate(assignment.hasta) : '<span class="status-pill status-active">Vigente</span>'}</td><td>${rowActions('asignaciones_micro', assignment.id)}</td></tr>`).join('');
}

function companyName(id) { return state.companies.find(item => item.id === id)?.nombre || '—'; }
function workerName(id) { return state.workers.find(item => item.id === id)?.nombre || '—'; }
function busName(id) { const bus = state.buses.find(item => item.id === id); return bus ? bus.numero_interno : '—'; }
function routeName(id) { return state.routes.find(item => item.id === id)?.nombre || '—'; }

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date);
}

function pageConfig() {
  const configs = {
    empresas: { title: 'Empresas de micros', intro: 'Administra las empresas y revisa su flota.', cta: 'Nueva empresa', columns: ['Empresa', 'RUT', 'Teléfono', 'Equipo', 'Flota', ''], rows: companyRows(), count: state.companies.length },
    trabajadores: { title: 'Trabajadores', intro: 'Personas asociadas a cada empresa de transporte.', cta: 'Nuevo trabajador', columns: ['Trabajador', 'Empresa', 'Teléfono', 'Correo', ''], rows: workerRows(), count: state.workers.filter(worker => !state.companyFilter || worker.empresa_id === state.companyFilter).length },
    micros: { title: 'Micros', intro: 'Vehículos registrados y su asignación vigente.', cta: 'Nueva micro', columns: ['Micro', 'Empresa', 'Marca / modelo', 'Capacidad', 'Ruta y trabajador', ''], rows: busRows(), count: state.buses.length },
    asignaciones: { title: 'Asignaciones', intro: 'Relaciona una micro, un trabajador y una ruta.', cta: 'Nueva asignación', columns: ['Micro', 'Trabajador', 'Ruta', 'Desde', 'Hasta', ''], rows: assignmentRows(), count: state.assignments.length },
  };
  return configs[state.page];
}

function renderTable(config) {
  const emptyMessage = state.page === 'asignaciones' && !state.routes.length
    ? 'Primero crea rutas con tu cuenta de Ubicación Ruta.'
    : 'Todavía no hay registros. Agrega el primero para comenzar.';
  return `<div class="table-wrap"><table><thead><tr>${config.columns.map(column => `<th>${column}</th>`).join('')}</tr></thead><tbody>${config.rows || `<tr><td colspan="${config.columns.length}" class="empty-cell"><span class="empty-mark">${iconMarkup(state.page === 'micros' ? Bus : state.page === 'trabajadores' ? Users : state.page === 'asignaciones' ? Route : Building2)}</span><strong>${escapeHtml(emptyMessage)}</strong><span>Los datos se guardan en tu proyecto Supabase.</span></td></tr>`}</tbody></table></div>`;
}

function renderContent() {
  const config = pageConfig();
  const filter = state.page === 'trabajadores'
    ? `<label class="filter-select"><span class="sr-only">Filtrar por empresa</span><select id="company-filter"><option value="">Todas las empresas</option>${companyOptions(state.companyFilter)}</select>${iconMarkup(ChevronDown)}</label>`
    : '';
  return `
    <section class="page-heading">
      <div><p class="eyebrow">GESTIÓN DE FLOTA <span>/</span> ${escapeHtml(config.title.toUpperCase())}</p><h1>${escapeHtml(config.title)}</h1><p class="page-intro">${escapeHtml(config.intro)}</p></div>
      <button class="button button-primary" data-action="new" data-entity="${tableByPage[state.page]}">${iconMarkup(Plus)}<span>${escapeHtml(config.cta)}</span></button>
    </section>
    ${noticeMarkup()}
    <section class="metric-strip" aria-label="Resumen">
      <div class="metric"><span class="metric-icon metric-green">${iconMarkup(Building2)}</span><span><small>EMPRESAS</small><strong>${state.companies.length}</strong></span></div>
      <div class="metric"><span class="metric-icon metric-coral">${iconMarkup(Users)}</span><span><small>TRABAJADORES</small><strong>${state.workers.length}</strong></span></div>
      <div class="metric"><span class="metric-icon metric-yellow">${iconMarkup(Bus)}</span><span><small>MICROS</small><strong>${state.buses.length}</strong></span></div>
      <div class="metric"><span class="metric-icon metric-ink">${iconMarkup(Route)}</span><span><small>ASIGNACIONES VIGENTES</small><strong>${state.assignments.filter(item => !item.hasta).length}</strong></span></div>
    </section>
    <section class="data-section">
      <div class="table-toolbar"><div><h2>${escapeHtml(config.title)}</h2><span>${config.count} registros</span></div><div class="table-tools">${filter}<label class="search-field">${iconMarkup(Search)}<input id="search-input" type="search" placeholder="Buscar" value="${escapeHtml(state.search)}" aria-label="Buscar en la tabla" /></label></div></div>
      ${renderTable(config)}
    </section>`;
}

function renderShell() {
  const active = pageTitle();
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="#" aria-label="Ruta Micros"><span class="brand-mark">${iconMarkup(Bus)}</span><span>ruta<span class="brand-accent">.</span>micros</span></a>
        <p class="nav-label">ADMINISTRACIÓN</p>
        <nav class="main-nav" aria-label="Secciones">${navItems.map(item => `<button class="nav-item ${state.page === item.id ? 'nav-active' : ''}" data-action="navigate" data-page="${item.id}">${iconMarkup(item.icon)}<span>${item.label}</span>${state.page === item.id ? '<span class="nav-indicator"></span>' : ''}</button>`).join('')}</nav>
        <div class="sidebar-bottom"><span class="sidebar-orbit">${iconMarkup(Route)}</span><span><strong>Rutas conectadas</strong><small>${state.routes.length} disponibles</small></span></div>
      </aside>
      <div class="workspace">
        <header class="topbar"><button class="icon-button mobile-menu" data-action="toggle-menu" aria-label="Abrir navegación">${iconMarkup(Menu)}</button><div class="breadcrumb">Flota <span>/</span> <strong>${escapeHtml(active)}</strong></div><div class="user-area"><span class="user-avatar">${escapeHtml((state.user.email || 'U').slice(0, 1).toUpperCase())}</span><span class="user-email">${escapeHtml(state.user.email)}</span><button class="icon-button" data-action="logout" aria-label="Cerrar sesión" title="Cerrar sesión">${iconMarkup(LogOut)}</button></div></header>
        <main class="main-content">${renderContent()}</main>
        <footer class="app-footer"><span>Ruta Micros</span><span>Datos protegidos por Supabase RLS</span></footer>
      </div>
      ${state.modal ? renderModal() : ''}
    </div>`;
  renderIcons();
}

function renderApp() {
  if (!hasSupabaseConfig) {
    app.innerHTML = `<main class="config-error"><span class="error-icon">${iconMarkup(CircleAlert)}</span><h1>Falta configurar Supabase</h1><p>Copia <code>.env.example</code> a <code>.env.local</code>, agrega la URL y la clave publicable de tu proyecto, y reinicia Vite.</p></main>`;
    renderIcons();
    return;
  }
  if (!state.user) renderLogin();
  else renderShell();
}

function renderModal() {
  const { entity, id } = state.modal;
  const tableName = entity;
  const existing = id ? recordFor(entity, id) : {};
  const titles = { empresas: 'empresa', trabajadores: 'trabajador', micros: 'micro', asignaciones_micro: 'asignación' };
  const title = `${id ? 'Editar' : 'Nueva'} ${titles[entity]}`;
  const field = (label, name, value = '', options = {}) => `<label class="form-field ${options.wide ? 'field-wide' : ''}">${label}<input name="${name}" value="${escapeHtml(value)}" ${options.type ? `type="${options.type}"` : ''} ${options.required ? 'required' : ''} ${options.min !== undefined ? `min="${options.min}"` : ''} ${options.max !== undefined ? `max="${options.max}"` : ''} placeholder="${options.placeholder || ''}" /></label>`;
  const select = (label, name, optionsMarkup, value, required = true) => `<label class="form-field">${label}<span class="select-wrap"><select name="${name}" ${required ? 'required' : ''}><option value="">Seleccionar…</option>${optionsMarkup}</select>${iconMarkup(ChevronDown)}</span></label>`;
  let fields = '';

  if (entity === 'empresas') {
    fields = `${field('Nombre de la empresa', 'nombre', existing.nombre, { required: true, wide: true, placeholder: 'Ej. Transportes del Valle' })}${field('RUT', 'rut', existing.rut, { placeholder: '12.345.678-9' })}${field('Teléfono', 'telefono', existing.telefono, { type: 'tel', placeholder: '+56 9 1234 5678' })}`;
  } else if (entity === 'trabajadores') {
    fields = `${select('Empresa', 'empresa_id', companyOptions(existing.empresa_id), existing.empresa_id)}${field('Nombre completo', 'nombre', existing.nombre, { required: true })}${field('RUT / documento', 'documento', existing.documento)}${field('Teléfono', 'telefono', existing.telefono, { type: 'tel' })}${field('Correo', 'correo', existing.correo, { type: 'email' })}`;
  } else if (entity === 'micros') {
    fields = `${select('Empresa', 'empresa_id', companyOptions(existing.empresa_id), existing.empresa_id)}${field('Número interno', 'numero_interno', existing.numero_interno, { required: true, placeholder: 'M-12' })}${field('Patente', 'patente', existing.patente, { required: true, placeholder: 'ABCD-12' })}${field('Marca / modelo', 'marca_modelo', existing.marca_modelo, { placeholder: 'Mercedes-Benz OF 1721' })}${field('Capacidad de pasajeros', 'capacidad', existing.capacidad, { type: 'number', min: 1, max: 200 })}`;
  } else {
    const companyId = existing.empresa_id || '';
    const hasRoutes = state.routes.length > 0;
    fields = `${select('Empresa', 'empresa_id', companyOptions(companyId), companyId)}<label class="form-field">Micro<span class="select-wrap"><select name="micro_id" required><option value="">Seleccionar…</option>${busOptions(companyId, existing.micro_id)}</select>${iconMarkup(ChevronDown)}</span></label><label class="form-field">Trabajador<span class="select-wrap"><select name="trabajador_id" required><option value="">Seleccionar…</option>${workerOptions(companyId, existing.trabajador_id)}</select>${iconMarkup(ChevronDown)}</span></label>${select('Ruta existente', 'ruta_id', routeOptions(existing.ruta_id), existing.ruta_id)}${field('Desde', 'desde', existing.desde || new Date().toISOString().slice(0, 10), { type: 'date', required: true })}${field('Hasta (opcional)', 'hasta', existing.hasta, { type: 'date' })}${!hasRoutes ? '<p class="field-hint field-wide">No hay rutas disponibles. Crea una con la misma cuenta en Ubicación Ruta.</p>' : ''}`;
  }

  const disabled = state.busy || (entity === 'asignaciones_micro' && !state.routes.length);
  return `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><div><p class="eyebrow">DATOS DE FLOTA</p><h2 id="modal-title">${escapeHtml(title)}</h2></div><button class="icon-button" data-action="close-modal" aria-label="Cerrar">${iconMarkup(X)}</button></header><form id="record-form" data-entity="${tableName}" data-id="${escapeHtml(id || '')}"><div class="form-grid">${fields}</div><div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary" ${disabled ? 'disabled' : ''}>${state.busy ? 'Guardando…' : 'Guardar'}</button></div></form></section></div>`;
}

function recordFor(entity, id) {
  const sources = { empresas: state.companies, trabajadores: state.workers, micros: state.buses, asignaciones_micro: state.assignments };
  return sources[entity]?.find(record => record.id === id) || {};
}

function showError(error) {
  const code = error?.code || '';
  if (code === '42P01' || code === 'PGRST205') return 'Faltan las tablas nuevas. Ejecuta supabase/schema.sql en el SQL Editor de este proyecto Supabase.';
  if (code === '23505') return 'Ya existe un registro con ese dato único. Revisa la patente o el número interno.';
  if (code === '23503') return 'No se puede eliminar: este registro todavía está relacionado con otros datos.';
  if (code === '23514') return 'Revisa las fechas: la fecha Hasta no puede ser anterior a Desde.';
  if (code === '42501') return 'Supabase denegó la operación. Verifica las políticas RLS de las tablas nuevas.';
  if (code === '23502') return 'Completa todos los campos obligatorios.';
  return error?.message || 'No se pudo completar la operación. Intenta nuevamente.';
}

async function loadData() {
  state.busy = true;
  state.error = '';
  renderApp();
  const userId = state.user.id;
  const results = await Promise.all([
    supabase.from('empresas').select('*').order('nombre'),
    supabase.from('trabajadores').select('*, empresas(nombre)').order('nombre'),
    supabase.from('micros').select('*, empresas(nombre)').order('numero_interno'),
    supabase.from('asignaciones_micro').select('*, micros(numero_interno,patente), trabajadores(nombre), rutas(nombre)').order('desde', { ascending: false }),
    supabase.from('rutas').select('id,nombre').eq('usuario_id', userId).order('nombre'),
  ]);
  const failed = results.find(result => result.error);
  if (failed) {
    state.error = showError(failed.error);
  } else {
    [state.companies, state.workers, state.buses, state.assignments, state.routes] = results.map(result => result.data || []);
  }
  state.busy = false;
  renderApp();
}

async function submitAuth(form) {
  const values = new FormData(form);
  const email = String(values.get('email')).trim();
  const password = String(values.get('password'));
  state.busy = true;
  state.error = '';
  renderApp();
  const result = state.authMode === 'register'
    ? await supabase.auth.signUp({ email, password })
    : await supabase.auth.signInWithPassword({ email, password });
  state.busy = false;
  if (result.error) {
    state.error = result.error.message;
  } else if (state.authMode === 'register' && !result.data.session) {
    state.error = 'Cuenta creada. Confirma el correo y luego inicia sesión.';
    state.authMode = 'login';
  } else {
    state.user = result.data.user;
    await loadData();
    return;
  }
  renderApp();
}

function formPayload(entity, form) {
  const values = new FormData(form);
  const value = name => String(values.get(name) || '').trim();
  if (entity === 'empresas') return { nombre: value('nombre'), rut: value('rut') || null, telefono: value('telefono') || null };
  if (entity === 'trabajadores') return { empresa_id: value('empresa_id'), nombre: value('nombre'), documento: value('documento') || null, telefono: value('telefono') || null, correo: value('correo') || null };
  if (entity === 'micros') return { empresa_id: value('empresa_id'), numero_interno: value('numero_interno'), patente: value('patente').toUpperCase(), marca_modelo: value('marca_modelo') || null, capacidad: value('capacidad') ? Number(value('capacidad')) : null };
  return { empresa_id: value('empresa_id'), micro_id: value('micro_id'), trabajador_id: value('trabajador_id'), ruta_id: value('ruta_id'), desde: value('desde'), hasta: value('hasta') || null };
}

async function saveRecord(form) {
  const entity = form.dataset.entity;
  const id = form.dataset.id;
  const payload = formPayload(entity, form);
  if (entity === 'asignaciones_micro' && payload.hasta && payload.hasta < payload.desde) {
    state.error = 'La fecha Hasta no puede ser anterior a Desde.';
    renderApp();
    return;
  }
  state.busy = true;
  state.error = '';
  renderApp();
  let request = supabase.from(entity);
  request = id ? request.update(payload).eq('id', id) : request.insert(payload);
  const { error } = await request;
  if (error) {
    state.busy = false;
    state.error = showError(error);
    renderApp();
    return;
  }
  state.modal = null;
  state.busy = false;
  state.flash = 'Cambios guardados.';
  await loadData();
}

async function deleteRecord(entity, id) {
  const record = recordFor(entity, id);
  const label = record.nombre || record.numero_interno || record.id;
  if (!window.confirm(`¿Eliminar este registro (${label})? No se puede deshacer.`)) return;
  state.busy = true;
  renderApp();
  const { error } = await supabase.from(entity).delete().eq('id', id);
  state.busy = false;
  if (error) {
    state.error = showError(error);
    renderApp();
    return;
  }
  state.flash = 'Registro eliminado.';
  await loadData();
}

function updateAssignmentOptions(companyId) {
  const workerSelect = document.querySelector('[name="trabajador_id"]');
  const busSelect = document.querySelector('[name="micro_id"]');
  if (workerSelect) workerSelect.innerHTML = `<option value="">Seleccionar…</option>${workerOptions(companyId)}`;
  if (busSelect) busSelect.innerHTML = `<option value="">Seleccionar…</option>${busOptions(companyId)}`;
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, entity, id, page } = button.dataset;
  if (action === 'dismiss-notice') { state.error = ''; state.flash = ''; renderApp(); }
  if (action === 'toggle-auth') { state.authMode = state.authMode === 'login' ? 'register' : 'login'; state.error = ''; renderApp(); }
  if (action === 'navigate') { state.page = page; state.search = ''; state.companyFilter = ''; state.error = ''; renderApp(); }
  if (action === 'new') { state.modal = { entity, id: '' }; state.error = ''; renderApp(); }
  if (action === 'edit') { state.modal = { entity, id }; state.error = ''; renderApp(); }
  if (action === 'delete') await deleteRecord(entity, id);
  if (action === 'close-modal') { state.modal = null; state.error = ''; renderApp(); }
  if (action === 'backdrop-close' && event.target === button) { state.modal = null; renderApp(); }
  if (action === 'show-workers') { state.page = 'trabajadores'; state.companyFilter = id; state.search = ''; renderApp(); }
  if (action === 'logout') { await supabase.auth.signOut(); state.user = null; state.companies = []; state.workers = []; state.buses = []; state.assignments = []; state.routes = []; renderApp(); }
  if (action === 'toggle-menu') document.querySelector('#sidebar')?.classList.toggle('sidebar-open');
});

document.addEventListener('submit', async event => {
  if (event.target.id === 'auth-form') {
    event.preventDefault();
    await submitAuth(event.target);
  }
  if (event.target.id === 'record-form') {
    event.preventDefault();
    await saveRecord(event.target);
  }
});

document.addEventListener('input', event => {
  if (event.target.id === 'search-input') {
    state.search = event.target.value.toLocaleLowerCase('es');
    const rows = [...document.querySelectorAll('tbody tr')];
    rows.forEach(row => { row.hidden = !row.textContent.toLocaleLowerCase('es').includes(state.search); });
  }
});

document.addEventListener('change', event => {
  if (event.target.id === 'company-filter') {
    state.companyFilter = event.target.value;
    renderApp();
  }
  if (event.target.name === 'empresa_id' && state.modal?.entity === 'asignaciones_micro') updateAssignmentOptions(event.target.value);
});

supabase?.auth.onAuthStateChange((_event, session) => {
  if (session?.user && session.user.id !== state.user?.id) {
    state.user = session.user;
    void loadData();
  } else if (!session) {
    state.user = null;
    renderApp();
  }
});

async function initialize() {
  if (!hasSupabaseConfig) { renderApp(); return; }
  const { data, error } = await supabase.auth.getSession();
  if (error) state.error = error.message;
  state.user = data?.session?.user || null;
  if (state.user) await loadData();
  else renderApp();
}

initialize();