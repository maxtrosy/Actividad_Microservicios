# Microservices Dynamic Platform

Plataforma web para crear, desplegar y administrar microservicios dinámicos usando Docker. Permite registrar código fuente desde una interfaz web, empaquetarlo automáticamente en un contenedor Docker y exponerlo como un endpoint HTTP funcional.

---

## Descripción del Proyecto

En este proyecto, un **microservicio** es una aplicación independiente que:

- Se ejecuta en su propio contenedor Docker.
- Expone al menos un endpoint HTTP.
- Recibe parámetros de entrada por query string o body.
- Retorna respuestas en formato JSON.
- Es creado dinámicamente desde la plataforma, es decir, no existe previamente.

La plataforma funciona como un **orquestador de microservicios**. Desde el dashboard web, el usuario registra el nombre, descripción, lenguaje y código fuente del servicio. Luego, el sistema:

- genera los archivos necesarios de ejecución
- construye la imagen Docker
- levanta el contenedor
- asigna un puerto disponible
- registra el servicio para poder administrarlo desde la interfaz

Además, para los microservicios Python basados en Flask, el orquestador agrega automáticamente la configuración de **CORS**, lo que permite que el dashboard pueda probar los endpoints directamente desde el navegador sin bloqueos por política de origen cruzado.

---

## Características principales

- Creación dinámica de microservicios en **Python** o **Node.js**
- Construcción automática de imagen Docker
- Despliegue automático en contenedor
- Asignación dinámica de puertos entre `8100` y `8999`
- Registro persistente de servicios en `services.json`
- Dashboard web para:
  - crear
  - listar
  - ver detalle
  - iniciar
  - detener
  - eliminar
  - probar endpoints
- Inyección automática de **CORS** en microservicios Python Flask
- Playground de pruebas HTTP integrado en el frontend

---

## Diagrama de Arquitectura

```text
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (navegador)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND  (puerto 3000)                        │
│         index.html · app.js · styles.css                    │
│  Dashboard web: crear, listar, iniciar, detener, eliminar   │
│  y probar endpoints HTTP                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (HTTP :8000)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              ORCHESTRATOR  (puerto 8000)                    │
│                  FastAPI · main.py                          │
│                                                             │
│  POST   /api/microservices              → crear y desplegar │
│  GET    /api/microservices              → listar todos      │
│  GET    /api/microservices/{name}       → detalle de uno    │
│  POST   /api/microservices/{name}/start → iniciar           │
│  POST   /api/microservices/{name}/stop  → detener           │
│  DELETE /api/microservices/{name}       → eliminar          │
│  GET    /health                         → estado API        │
│                                                             │
│  Estado persistente: /app/data/services.json                │
│  Generación dinámica: /generated_services                   │
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

---

## Flujo de creación de un microservicio

```text
Usuario pega código  →  POST /api/microservices
        │
        ├── Genera archivos en /generated_services/{nombre}/
        │       app.py (o app.js)
        │       Dockerfile
        │       requirements.txt (o package.json)
        │
        ├── Si es Python Flask:
        │       agrega flask-cors a requirements.txt
        │       inyecta configuración CORS automáticamente
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
| Frontend | HTML5, CSS3, JavaScript Vanilla |
| Backend / Orchestrator | Python 3.11, FastAPI, Docker SDK |
| Contenedores | Docker, Docker Compose |
| Microservicios Python | Python 3.11-slim, Flask 3.0, Flask-CORS |
| Microservicios Node | Node 20-alpine, Express 4 |
| Persistencia | JSON en volumen Docker |

---

## Instalación y Ejecución

### Requisitos previos

- Docker Desktop o Docker Engine con Docker Compose
- Git

### Clonar y levantar la plataforma

```bash
git clone https://github.com/tu-usuario/microservices-platform.git
cd microservices-platform
docker compose up -d --build
```

La plataforma estará disponible en:

- **Dashboard web:** `http://localhost:3000`
- **API del orchestrator:** `http://localhost:8000`
- **Documentación interactiva:** `http://localhost:8000/docs`

Para detener la plataforma:

```bash
docker compose down
```

---

## Importante después de actualizar el orchestrator

Si actualizaste `main.py` para que los microservicios Python incluyan CORS automáticamente, ten en cuenta esto:

- Los **microservicios nuevos** sí tomarán el cambio.
- Los **microservicios ya creados anteriormente** no se corrigen solos.
- Debes **eliminarlos y volverlos a crear** desde el dashboard para que sean regenerados con la nueva configuración.

---

## Cómo funciona el Playground de endpoints

Cada microservicio en estado `running` muestra una sección llamada **Probar endpoint**. Desde ahí puedes:

- escribir la ruta, por ejemplo `/sumar`
- escoger el método HTTP
- agregar parámetros, por ejemplo `a=10&b=20`
- ejecutar la petición y ver la respuesta del servicio

### Ejemplo

Si el servicio está en:

```text
http://localhost:8100
```

y escribes:

```text
Ruta: /sumar
Método: GET
Parámetros: a=10&b=20
```

la plataforma llamará a:

```text
http://localhost:8100/sumar?a=10&b=20
```

Si todo está bien, mostrará la respuesta del microservicio en formato JSON.

---

## Ejemplos Funcionales

Estos ejemplos están listos para copiarse y pegarse directamente en el dashboard.

> Nota: en microservicios Python Flask, no necesitas escribir CORS manualmente en el ejemplo. El orchestrator lo agrega automáticamente al momento de crear el servicio.

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

**Prueba de uso**:

```text
GET http://localhost:{puerto}/?nombre=Estudiante
```

**Respuesta esperada**:

```json
{
  "message": "Hola Estudiante"
}
```

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

**Prueba de uso**:

```text
GET http://localhost:{puerto}/sumar?a=10&b=20
```

**Respuesta esperada**:

```json
{
  "a": 10,
  "b": 20,
  "resultado": 30,
  "mensaje": "La suma de 10 y 20 es: 30"
}
```

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

**Prueba de uso**:

```text
GET http://localhost:{puerto}/?nombre=Estudiante
```

**Respuesta esperada**:

```json
{
  "message": "Hola Estudiante"
}
```

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

**Prueba de uso**:

```text
GET http://localhost:{puerto}/sumar?a=10&b=20
```

**Respuesta esperada**:

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

```text
microservices-platform/
├── docker-compose.yml
├── README.md
│
├── orchestrator/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── generated_services/
│   └── {nombre-servicio}/
│       ├── app.py o app.js
│       ├── Dockerfile
│       └── requirements.txt o package.json
│
└── orchestrator/data/
    └── services.json
```

---

## Endpoints principales del Orchestrator

### Listar microservicios

```http
GET /api/microservices
```

### Consultar un microservicio

```http
GET /api/microservices/{name}
```

### Crear un microservicio

```http
POST /api/microservices
Content-Type: application/json
```

Ejemplo de body:

```json
{
  "name": "suma-python-demo",
  "description": "Microservicio para sumar dos valores en python",
  "language": "python",
  "sourceCode": "from flask import Flask, request, jsonify\n\napp = Flask(__name__)\n\n@app.route('/sumar', methods=['GET'])\ndef sumar():\n    a = request.args.get('a', default=0, type=int)\n    b = request.args.get('b', default=0, type=int)\n    return jsonify({'a': a, 'b': b, 'resultado': a + b})\n\nif __name__ == '__main__':\n    app.run(host='0.0.0.0', port=5000)"
}
```

### Detener un microservicio

```http
POST /api/microservices/{name}/stop
```

### Iniciar un microservicio

```http
POST /api/microservices/{name}/start
```

### Eliminar un microservicio

```http
DELETE /api/microservices/{name}
```

---

## Consideraciones técnicas

- Los puertos se asignan dinámicamente entre `8100` y `8999`.
- Los microservicios Python usan puerto interno `5000`.
- Los microservicios Node usan puerto interno `3000`.
- Cada servicio generado se construye como una imagen independiente.
- Cada contenedor se publica en `localhost` usando el puerto dinámico asignado.
- El frontend consulta al orchestrator para la administración y prueba directa de endpoints.
- El orchestrator añade automáticamente soporte CORS a microservicios Python Flask recién creados.

---

## Posibles mejoras futuras

- Soporte para más lenguajes
- Edición de microservicios ya creados
- Logs en tiempo real desde la interfaz
- Validación estática del código antes de construir la imagen
- Plantillas avanzadas de microservicios
- Autenticación y control de acceso
- Exportación e importación de servicios



