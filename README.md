# Ruta Micros

CRUD web para administrar empresas de transporte, sus trabajadores y micros, y las asignaciones entre micro, trabajador y ruta.

## Desarrollo

Requiere Node.js 20.19+ o 22.12+.

```sh
npm install
npm run dev
```

La configuración local de Supabase está en `.env.local` y no se publica. Para otro entorno, copia `.env.example` como `.env.local` y configura la URL y la clave publicable del mismo proyecto de `ubicacion-ruta`. Nunca uses una clave `service_role` o `sb_secret_` en una aplicación web.

## Supabase

La aplicación reutiliza autenticación y la tabla `rutas` del proyecto existente. Inicia sesión con la cuenta de `ubicacion-ruta` para ver sus rutas. Las rutas son solo de lectura en esta app.

Para habilitar el CRUD, ejecuta `supabase/schema.sql` una vez desde **Supabase > SQL Editor**. El script agrega `empresas`, `trabajadores`, `micros` y `asignaciones_micro`, con claves foráneas y RLS por usuario. No modifica ni migra las tablas actuales. Las empresas no se pueden eliminar mientras tengan trabajadores o micros; los vehículos y trabajadores tampoco mientras tengan asignaciones. Una asignación vigente se cierra indicando una fecha **Hasta**.

Las empresas y todos sus registros quedan aislados por usuario, siguiendo las políticas del proyecto actual. El usuario debe iniciar sesión con la misma cuenta que posee las rutas que quiera asignar.

## Verificación

```sh
npm run build
```