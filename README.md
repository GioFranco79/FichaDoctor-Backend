# FichaDoctor - Backend API

## Descripción

FichaDoctor es una plataforma de gestión médica digital que permite a doctores, pacientes y secretarias gestionar citas médicas, fichas clínicas, recetas, solicitudes de exámenes y mensajería interna.

El backend expone una API RESTful construida como funciones serverless desplegadas en **Vercel**, con integración a **Supabase** como base de datos PostgreSQL y sistema de autenticación.

## Tecnologías

- **Lenguaje:** JavaScript (Node.js)
- **Runtime:** Vercel Serverless Functions
- **Base de datos:** PostgreSQL (Supabase)
- **Autenticación:** Supabase Auth (JWT)
- **Almacenamiento:** Supabase Storage (documentos PDF)
- **Validación:** Joi
- **Generación PDF:** PDFKit

## Funcionalidades principales

- **Autenticación y registro** de usuarios (Doctor, Paciente, Secretaria)
- **Gestión de agenda** del doctor (configuración de horarios, slots disponibles, días libres)
- **Agendamiento de citas** por pacientes o secretarias
- **Fichas médicas** con registro de síntomas e indicaciones
- **Generación de documentos PDF** (recetas médicas y solicitudes de exámenes)
- **Mensajería interna** entre doctores y pacientes
- **Sistema de roles** con permisos diferenciados (RBAC)
- **Búsqueda de doctores** por región, comuna y especialidad

## Árbol de directorios

```
Backend/
├── api/                          # Endpoints serverless (rutas de la API)
│   ├── admin/                    # Administración y gestión de secretarias
│   │   ├── my-doctor.js          # GET - Doctor asignado a la secretaria
│   │   ├── my-secretaries.js     # GET - Secretarias del doctor
│   │   └── secretaries/[id].js   # DELETE - Desvincular secretaria
│   ├── appointments/             # Gestión de citas médicas
│   │   ├── index.js              # GET/POST - Listar y crear citas
│   │   ├── [id].js              # GET/PUT - Obtener y modificar cita
│   │   └── [id]/
│   │       ├── cancel.js         # PATCH - Cancelar cita
│   │       └── status.js         # PATCH - Cambiar estado de cita
│   ├── auth/                     # Autenticación
│   │   ├── login.js              # POST - Inicio de sesión
│   │   ├── register.js           # POST - Registro de usuario
│   │   ├── register-secretary.js # POST - Registro de secretaria
│   │   ├── refresh.js            # POST - Renovar token
│   │   ├── forgot-password.js    # POST - Recuperar contraseña
│   │   └── reset-password.js     # POST - Restablecer contraseña
│   ├── doctors/                  # Endpoints de doctores
│   │   ├── index.js              # GET - Listar doctores con filtros
│   │   ├── my-patients.js        # GET - Pacientes del doctor
│   │   └── search-patient.js     # GET - Buscar paciente por RUT
│   ├── documents/                # Documentos PDF
│   │   ├── index.js              # GET - Listar documentos del paciente
│   │   ├── generate.js           # POST - Generar receta/examen en PDF
│   │   └── [id]/view.js          # GET - Obtener URL firmada del PDF
│   ├── medical-records/          # Fichas médicas
│   │   ├── create.js             # POST - Crear ficha médica
│   │   ├── index.js              # GET - Fichas del paciente (propias)
│   │   ├── [id].js              # PUT - Actualizar ficha
│   │   └── patient/[paciente_id].js # GET - Historial por paciente
│   ├── messages/                 # Mensajería interna
│   │   ├── index.js              # POST - Enviar mensaje
│   │   ├── inbox.js              # GET - Bandeja de entrada
│   │   ├── sent.js               # GET - Mensajes enviados
│   │   └── [id]/read.js          # PATCH - Marcar como leído
│   ├── patients/                 # Gestión de pacientes
│   │   ├── index.js              # GET/POST - Listar y crear pacientes
│   │   ├── [id].js              # GET/PUT - Paciente específico
│   │   ├── my-doctors.js         # GET - Doctores del paciente
│   │   └── me/clinical-data.js   # DELETE - Eliminar datos clínicos
│   └── schedule/                 # Agenda y disponibilidad
│       ├── index.js              # POST - Crear/actualizar configuración
│       ├── [id].js              # PUT - Actualizar configuración
│       ├── day-off.js            # POST - Registrar día libre
│       ├── weekly-view.js        # GET - Vista semanal de agenda
│       ├── available-slots.js    # GET/POST/DELETE - Gestión de slots
│       └── doctor/[doctor_id]/
│           ├── availability.js   # GET - Disponibilidad del doctor
│           └── config.js         # GET - Configuración de agenda
├── lib/                          # Lógica de negocio y utilidades
│   ├── supabaseClient.js         # Cliente Supabase (anon key)
│   ├── supabaseAdmin.js          # Cliente Supabase (service role)
│   ├── errors.js                 # Clases de error personalizadas
│   ├── middleware/               # Middlewares HOF
│   │   ├── cors.js               # Validación CORS
│   │   ├── rateLimit.js          # Rate limiting
│   │   ├── withAuth.js           # Autenticación JWT
│   │   ├── withRole.js           # Autorización por rol
│   │   ├── errorHandler.js       # Manejo global de errores
│   │   └── validate.js           # Validación de schemas Joi
│   ├── services/                 # Servicios de negocio
│   │   ├── authService.js        # Autenticación y registro
│   │   ├── appointmentService.js # Citas médicas
│   │   ├── scheduleService.js    # Agenda y disponibilidad
│   │   ├── medicalRecordService.js # Fichas médicas
│   │   ├── messageService.js     # Mensajería
│   │   ├── notificationService.js # Notificaciones
│   │   ├── auditService.js       # Auditoría de accesos
│   │   ├── adminService.js       # Administración
│   │   ├── patientService.js     # Pacientes
│   │   ├── prescriptionService.js # Recetas
│   │   └── pdfService.js         # Generación de PDF
│   ├── validators/               # Schemas de validación Joi
│   │   ├── authSchemas.js
│   │   ├── appointmentSchemas.js
│   │   ├── scheduleSchemas.js
│   │   ├── medicalRecordSchemas.js
│   │   ├── prescriptionSchemas.js
│   │   ├── messageSchemas.js
│   │   └── patientSchemas.js
│   └── utils/                    # Utilidades
│       ├── responseHelper.js     # Formato estándar de respuestas
│       ├── logger.js             # Registro de actividad
│       ├── pagination.js         # Paginación
│       ├── rutValidator.js       # Validación de RUT chileno
│       └── slotCalculator.js     # Cálculo de slots disponibles
├── package.json                  # Dependencias y scripts
├── vercel.json                   # Configuración de Vercel
├── jest.config.js                # Configuración de tests
├── .env.example                  # Variables de entorno requeridas
├── .gitignore                    # Archivos excluidos de Git
└── README.md                     # Este archivo
```

## Variables de entorno

Configurar en el dashboard de Vercel:

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (admin) de Supabase |
| `ALLOWED_ORIGINS` | URLs permitidas por CORS (separadas por coma) |

## Despliegue

1. Subir este repositorio a GitHub
2. Importar en Vercel como nuevo proyecto
3. Vercel detecta automáticamente las funciones serverless en `api/`
4. Configurar las variables de entorno en el dashboard de Vercel
5. Desplegar

## Roles del sistema

| Rol | Permisos |
|-----|----------|
| **Doctor** | Gestionar agenda, atender pacientes, crear fichas, emitir recetas/exámenes, mensajes |
| **Paciente** | Buscar doctores, agendar citas, ver fichas propias, mensajes |
| **Secretaria** | Gestionar agenda del doctor, agendar citas por RUT, ver citas |

## Autor

Proyecto desarrollado como plataforma de gestión médica digital.
