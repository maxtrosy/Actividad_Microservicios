# Microservices Dynamic Platform

Plataforma web para crear, desplegar y administrar microservicios dinámicos usando Docker. Permite registrar código fuente desde una interfaz web, empaquetarlo automáticamente en un contenedor Docker y exponerlo como un endpoint HTTP funcional.

---

## Descripción del Proyecto

En este proyecto, un **microservicio** es una aplicación independiente que:

- Se ejecuta en su propio contenedor Docker.
- Expone al menos un endpoint HTTP.
- Recibe parámetros de entrada (query o body).
- Retorna respuestas en formato JSON.
- Es creado dinámicamente desde la plataforma (no existe previamente).

La plataforma actúa como un **orquestador**: recibe el código fuente desde el dashboard web, genera los archivos necesarios (Dockerfile, dependencias), construye la imagen y levanta el contenedor automáticamente.

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (navegador)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND  (puerto 80)                          │
│         index.html · app.js · styles.css                    │
│  Dashboard web: crear, listar, iniciar, detener, eliminar   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (HTTP :8000)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              ORQUESTADOR  (puerto 8000)                     │
│                  FastAPI · main.py                          │
│                                                             │
│  POST   /api/microservices        → crear y desplegar       │
│  GET    /api/microservices        → listar todos            │
│  GET    /api/microservices/{name} → detalle de uno          │
│  POST   /api/microservices/{name}/start  → iniciar          │
│  POST   /api/microservices/{name}/stop   → detener          │
│  DELETE /api/microservices/{name} → eliminar                │
│                                                             │
│  Estado persistente: /app/data/services.json               │
└──────────────────────────┬──────────────────────────────────┘
                           │ docker.sock
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   DOCKER ENGINE                             │
│         Construye imágenes · Gestiona contenedores          │
└──────┬─────────────────┬──────────────────────┬────────────┘
       │                 │                      │
       ▼                 ▼                      ▼
┌────────────┐   ┌──────────────┐      ┌──────────────┐
│  Python    │   │    Node      │      │  ... más     │
│  (Flask)   │   │  (Express)   │      │  servicios   │
│ puerto dyn │   │ puerto dyn   │      │ puertos dyn  │
│ 8100-8999  │   │ 8100-8999    │      │ 8100-8999    │
└────────────┘   └──────────────┘      └──────────────┘
```

### Flujo de creación de un microservicio

```
Usuario pega código  →  POST /api/microservices
        │
        ├── Genera archivos en /generated_services/{nombre}/
        │       app.py (o app.js)
        │       Dockerfile
        │       requirements.txt (o package.json)
        │
        ├── docker build  →  imagen ms-{nombre}:latest
        │
        ├── docker run    →  contenedor ms-{nombre} en puerto libre
        │
        └── Registra en services.json  →  responde con URL de acceso
```

---

## Tecnologías Utilizadas

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend / Orquestador | Python 3.11, FastAPI, Docker SDK |
| Contenedores | Docker, Docker Compose |
| Microservicios Python | Python 3.11-slim, Flask 3.0 |
| Microservicios Node | Node 20-alpine, Express 4 |
| Persistencia | JSON en volumen Docker |

---

## Instalación y Ejecución

### Requisitos previos

- Docker Desktop (o Docker Engine + Docker Compose) instalado y en ejecución.
- Git.

### Levantar la plataforma

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/microservices-platform.git
cd microservices-platform

# 2. Levantar con un solo comando
docker-compose up
```

La plataforma estará disponible en:

- **Dashboard web:** http://localhost:80
- **API del orquestador:** http://localhost:8000
- **Documentación interactiva de la API:** http://localhost:8000/docs

Para detener:

```bash
docker-compose down
```

---

## Ejemplos Funcionales

Estos ejemplos están listos para copiarse y pegarse directamente en el dashboard.

---

### Python — Hola Mundo

**Nombre:** `hola-python`  
**Lenguaje:** Python  
**Descripción:** Microservicio que saluda por nombre.

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/", methods=["GET"])
def hola():
    nombre = request.args.get("nombre", "Mundo")
    return jsonify({"message": f"Hola {nombre}"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

**Prueba de uso** (una vez desplegado, reemplaza `{puerto}` por el asignado):

```
GET http://localhost:{puerto}/?nombre=Estudiante
```

**Respuesta esperada:**

```json
{
  "message": "Hola Estudiante"
}
```

---

### Python — Suma de dos valores

**Nombre:** `suma-python`  
**Lenguaje:** Python  
**Descripción:** Microservicio que suma dos números recibidos por query string.

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/sumar", methods=["GET"])
def sumar():
    a = request.args.get("a", default=0, type=int)
    b = request.args.get("b", default=0, type=int)
    resultado = a + b
    return jsonify({
        "a": a,
        "b": b,
        "resultado": resultado,
        "mensaje": f"La suma de {a} y {b} es: {resultado}"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

**Prueba de uso:**

```
GET http://localhost:{puerto}/sumar?a=10&b=20
```

**Respuesta esperada:**

```json
{
  "a": 10,
  "b": 20,
  "resultado": 30,
  "mensaje": "La suma de 10 y 20 es: 30"
}
```

---

### Node.js — Hola Mundo

**Nombre:** `hola-node`  
**Lenguaje:** Node  
**Descripción:** Microservicio que saluda por nombre usando Express.

```javascript
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  const nombre = req.query.nombre || "Mundo";
  res.json({ message: `Hola ${nombre}` });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Microservicio corriendo en puerto 3000");
});
```

**Prueba de uso:**

```
GET http://localhost:{puerto}/?nombre=Estudiante
```

**Respuesta esperada:**

```json
{
  "message": "Hola Estudiante"
}
```

---

### Node.js — Suma de dos valores

**Nombre:** `suma-node`  
**Lenguaje:** Node  
**Descripción:** Microservicio que suma dos números usando Express.

```javascript
const express = require("express");
const app = express();

app.get("/sumar", (req, res) => {
  const a = Number(req.query.a ?? 0);
  const b = Number(req.query.b ?? 0);
  const resultado = a + b;
  res.json({
    a,
    b,
    resultado,
    mensaje: `La suma de ${a} y ${b} es: ${resultado}`
  });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Microservicio corriendo en puerto 3000");
});
```

**Prueba de uso:**

```
GET http://localhost:{puerto}/sumar?a=10&b=20
```

**Respuesta esperada:**

```json
{
  "a": 10,
  "b": 20,
  "resultado": 30,
  "mensaje": "La suma de 10 y 20 es: 30"
}
```

---

## Estructura del Proyecto

```
microservices-platform/
├── docker-compose.yml          # Orquestación principal
├── README.md                   # Este archivo
│
├── backend/                    # Orquestador FastAPI
│   ├── Dockerfile
│   ├── main.py                 # API REST y lógica de gestión
│   └── requirements.txt
│
├── frontend/                   # Dashboard web
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── data/                       # Volumen persistente
│   └── services.json           # Estado de los microservicios
│
└── generated_services/         # Volumen donde se crean los servicios
    └── {nombre-servicio}/
        ├── app.py (o app.js)
        ├── Dockerfile
        └── requirements.txt (o package.json)
```

.
