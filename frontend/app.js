const API_BASE = "http://localhost:8000";

const createForm = document.getElementById("createForm");
const nameInput = document.getElementById("name");
const descriptionInput = document.getElementById("description");
const languageSelect = document.getElementById("language");
const sourceCodeInput = document.getElementById("sourceCode");

const refreshBtn = document.getElementById("refreshBtn");
const clearBtn = document.getElementById("clearBtn");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const exampleSelect = document.getElementById("exampleSelect");

const formMessage = document.getElementById("formMessage");
const listMessage = document.getElementById("listMessage");
const servicesGrid = document.getElementById("servicesGrid");
const totalBadge = document.getElementById("totalBadge");
const apiStatus = document.getElementById("apiStatus");

const totalServices = document.getElementById("totalServices");
const runningServices = document.getElementById("runningServices");
const stoppedServices = document.getElementById("stoppedServices");
const createdServices = document.getElementById("createdServices");

const detailModal = document.getElementById("detailModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalBackdrop = document.getElementById("closeModalBackdrop");

const examples = {
  "python-hello": {
    name: "hola-python-demo",
    description: "Microservicio hola mundo en python",
    language: "python",
    sourceCode: `from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/", methods=["GET"])
def hola():
    nombre = request.args.get("nombre", "Mundo")
    return jsonify({"message": f"Hola {nombre}"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
`
  },
  "python-sum": {
    name: "suma-python-demo",
    description: "Microservicio para sumar dos valores en python",
    language: "python",
    sourceCode: `from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/sumar", methods=["GET"])
def sumar():
    a = request.args.get("a", default=0, type=int)
    b = request.args.get("b", default=0, type=int)
    return jsonify({"a": a, "b": b, "resultado": a + b})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
`
  },
  "node-hello": {
    name: "hola-node-demo",
    description: "Microservicio hola mundo en node",
    language: "node",
    sourceCode: `const express = require("express");
const app = express();

app.get("/", (req, res) => {
  const nombre = req.query.nombre || "Mundo";
  res.json({ message: \`Hola \${nombre}\` });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Microservicio corriendo en puerto 3000");
});
`
  },
  "node-sum": {
    name: "suma-node-demo",
    description: "Microservicio para sumar dos valores en node",
    language: "node",
    sourceCode: `const express = require("express");
const app = express();

app.get("/sumar", (req, res) => {
  const a = Number(req.query.a ?? 0);
  const b = Number(req.query.b ?? 0);
  res.json({ a, b, resultado: a + b });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Microservicio corriendo en puerto 3000");
});
`
  }
};

// ── Utilidades ──────────────────────────────────────────────────────────────

function showMessage(element, text, type = "success") {
  element.textContent = text;
  element.className = `message ${type}`;
  element.classList.remove("hidden");
}

function hideMessage(element) {
  element.className = "message hidden";
  element.textContent = "";
}

function setApiStatus(text, type) {
  apiStatus.textContent = text;
  apiStatus.className = `status-chip ${type}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateStats(items) {
  const total = items.length;
  const running = items.filter((item) => item.status === "running").length;
  const stopped = items.filter((item) => item.status === "stopped").length;
  const created = items.filter((item) => item.status === "created").length;

  totalServices.textContent = total;
  runningServices.textContent = running;
  stoppedServices.textContent = stopped;
  createdServices.textContent = created;
  totalBadge.textContent = `${total} servicio${total === 1 ? "" : "s"}`;
}

// ── Render ──────────────────────────────────────────────────────────────────

function renderServices(items) {
  updateStats(items);

  if (!items.length) {
    servicesGrid.innerHTML = `
      <div class="empty-state">
        <h4>No hay microservicios registrados</h4>
        <p>Crea tu primer microservicio desde el formulario de la izquierda.</p>
      </div>
    `;
    return;
  }

  servicesGrid.innerHTML = items.map((service) => {
    const safeName        = escapeHtml(service.name);
    const safeDescription = escapeHtml(service.description || "Sin descripción");
    const safeLanguage    = escapeHtml(service.language || "-");
    const safeStatus      = escapeHtml(service.status || "created");
    const safeUrl         = service.url ? escapeHtml(service.url) : null;

    // El playground solo tiene sentido cuando el servicio está corriendo y tiene URL
    const playgroundHtml = safeUrl && service.status === "running" ? `
      <div class="playground">
        <p class="playground-label">Probar endpoint</p>
        <div class="playground-row">
          <input
            class="playground-path"
            placeholder="Ruta  ej: /sumar"
            data-name="${safeName}"
            aria-label="Ruta del endpoint"
          />
          <select class="playground-method" data-name="${safeName}" aria-label="Método HTTP">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>
        <input
          class="playground-params"
          placeholder="Parámetros  ej: a=10&amp;b=20"
          data-name="${safeName}"
          aria-label="Parámetros de la petición"
        />
        <button
          class="btn btn-secondary playground-run"
          data-name="${safeName}"
          data-url="${safeUrl}"
        >Probar</button>
        <pre class="playground-response hidden" data-name="${safeName}" tabindex="0"></pre>
      </div>
    ` : "";

    return `
      <article class="service-card">
        <div class="service-card-header">
          <div>
            <h4 class="service-name">${safeName}</h4>
            <p class="service-description">${safeDescription}</p>
          </div>
          <span class="status ${safeStatus}">${safeStatus}</span>
        </div>

        <div class="service-meta">
          <span class="meta-pill">Lenguaje: ${safeLanguage}</span>
          ${service.host_port ? `<span class="meta-pill">Puerto: ${escapeHtml(String(service.host_port))}</span>` : ""}
        </div>

        <div class="service-url">
          ${safeUrl
            ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`
            : `<span>Sin URL disponible</span>`}
        </div>

        <div class="service-actions">
          <button class="btn btn-secondary" data-action="view" data-name="${safeName}">Ver detalle</button>
          ${service.status === "running"
            ? `<button class="btn btn-secondary" data-action="stop" data-name="${safeName}">Detener</button>`
            : ""}
          ${service.status === "stopped"
            ? `<button class="btn btn-primary" data-action="start" data-name="${safeName}">Iniciar</button>`
            : ""}
          <button class="btn btn-danger" data-action="delete" data-name="${safeName}">Eliminar</button>
        </div>

        ${playgroundHtml}
      </article>
    `;
  }).join("");
}

// ── Listener delegado del grid ───────────────────────────────────────────────

servicesGrid.addEventListener("click", (event) => {
  // Botones de acción estándar (view, stop, start, delete)
  const actionBtn = event.target.closest("button[data-action]");
  if (actionBtn) {
    const name   = actionBtn.dataset.name;
    const action = actionBtn.dataset.action;
    if (action === "view")   viewService(name);
    if (action === "stop")   stopService(name);
    if (action === "start")  startService(name);
    if (action === "delete") deleteService(name);
    return;
  }

  // Botón "Probar" del playground
  const runBtn = event.target.closest("button.playground-run");
  if (runBtn) {
    runPlayground(runBtn);
  }
});

// ── Playground ───────────────────────────────────────────────────────────────

async function runPlayground(btn) {
  const baseUrl = btn.dataset.url;
  const card    = btn.closest("article");

  const pathInput   = card.querySelector(".playground-path");
  const paramsInput = card.querySelector(".playground-params");
  const methodSel   = card.querySelector(".playground-method");
  const pre         = card.querySelector(".playground-response");

  const path   = pathInput.value.trim() || "/";
  const params = paramsInput.value.trim();
  const method = methodSel.value;

  // Construye la URL: GET lleva params en query string, POST en body JSON
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let url = `${baseUrl}${normalizedPath}`;
  if (method === "GET" && params) url += `?${params}`;

  // Muestra estado de carga
  pre.textContent = "Llamando...";
  pre.classList.remove("hidden", "playground-response--error");

  const options = { method };

  if (method === "POST" && params) {
    // Convierte "a=10&b=20" a { a: 10, b: 20 } para mandarlo como JSON
    const body = {};
    params.split("&").forEach((pair) => {
      const [rawKey, rawVal = ""] = pair.split("=");
      const key = decodeURIComponent(rawKey.trim());
      const val = decodeURIComponent(rawVal.trim());
      // Convierte a número si es posible, si no deja como string
      body[key] = val !== "" && !isNaN(val) ? Number(val) : val;
    });
    options.headers = { "Content-Type": "application/json" };
    options.body    = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    // Intenta parsear como JSON; si falla muestra texto plano
    let result;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      result = await response.json();
      pre.textContent = JSON.stringify(result, null, 2);
    } else {
      result = await response.text();
      pre.textContent = result;
    }

    if (!response.ok) {
      pre.classList.add("playground-response--error");
    }
  } catch {
    pre.textContent = `No se pudo conectar a:\n${url}\n\nVerifica que el servicio esté corriendo.`;
    pre.classList.add("playground-response--error");
  }
}

// ── API calls ────────────────────────────────────────────────────────────────

async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error("Backend no disponible");
    setApiStatus("Backend conectado", "success");
  } catch {
    setApiStatus("Backend no disponible", "error");
  }
}

async function loadServices() {
  hideMessage(listMessage);

  try {
    const response = await fetch(`${API_BASE}/api/microservices`);
    const data = await response.json();

    if (!response.ok) {
      showMessage(listMessage, data.detail || "No se pudo obtener la lista de microservicios.", "error");
      return;
    }

    renderServices(data.items || []);
  } catch {
    showMessage(listMessage, "Error de conexión con el backend.", "error");
  }
}

async function createService(event) {
  event.preventDefault();
  hideMessage(formMessage);

  const payload = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
    language: languageSelect.value,
    sourceCode: sourceCodeInput.value
  };

  if (!payload.name || !payload.description || !payload.sourceCode) {
    showMessage(formMessage, "Por favor completa todos los campos.", "error");
    return;
  }

  const submitBtn = createForm.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/api/microservices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(formMessage, data.detail || "No se pudo crear el microservicio.", "error");
      return;
    }

    createForm.reset();
    showMessage(formMessage, data.message || "Microservicio creado correctamente.", "success");
    await loadServices();
    await checkHealth();
  } catch {
    showMessage(formMessage, "Error de conexión con el backend.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

async function viewService(name) {
  try {
    const response = await fetch(`${API_BASE}/api/microservices/${encodeURIComponent(name)}`);
    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "No se pudo consultar el microservicio.");
      return;
    }

    modalTitle.textContent = data.name || name;
    modalBody.textContent  = JSON.stringify(data, null, 2);
    detailModal.classList.remove("hidden");
    closeModalBtn.focus();
  } catch {
    alert("Error de conexión con el backend.");
  }
}

async function stopService(name) {
  try {
    const response = await fetch(`${API_BASE}/api/microservices/${encodeURIComponent(name)}/stop`, {
      method: "POST"
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "No se pudo detener el microservicio.");
      return;
    }

    await loadServices();
  } catch {
    alert("Error de conexión con el backend.");
  }
}

async function startService(name) {
  try {
    const response = await fetch(`${API_BASE}/api/microservices/${encodeURIComponent(name)}/start`, {
      method: "POST"
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "No se pudo iniciar el microservicio.");
      return;
    }

    await loadServices();
  } catch {
    alert("Error de conexión con el backend.");
  }
}

async function deleteService(name) {
  const confirmed = confirm(`¿Seguro que deseas eliminar "${name}"?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/api/microservices/${encodeURIComponent(name)}`, {
      method: "DELETE"
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "No se pudo eliminar el microservicio.");
      return;
    }

    await loadServices();
  } catch {
    alert("Error de conexión con el backend.");
  }
}

// ── Formulario ───────────────────────────────────────────────────────────────

function clearForm() {
  createForm.reset();
  hideMessage(formMessage);
}

function loadSelectedExample() {
  const selected = exampleSelect.value;
  if (!selected || !examples[selected]) return;

  const example = examples[selected];
  nameInput.value        = example.name;
  descriptionInput.value = example.description;
  languageSelect.value   = example.language;
  sourceCodeInput.value  = example.sourceCode;
  hideMessage(formMessage);
}

// ── Modal ────────────────────────────────────────────────────────────────────

function closeModal() {
  detailModal.classList.add("hidden");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !detailModal.classList.contains("hidden")) {
    closeModal();
  }
});

// ── Event listeners ──────────────────────────────────────────────────────────

createForm.addEventListener("submit", createService);

refreshBtn.addEventListener("click", async () => {
  await checkHealth();
  await loadServices();
});

clearBtn.addEventListener("click", clearForm);
loadExampleBtn.addEventListener("click", loadSelectedExample);
closeModalBtn.addEventListener("click", closeModal);
closeModalBackdrop.addEventListener("click", closeModal);

// ── Init ─────────────────────────────────────────────────────────────────────

(async function init() {
  await checkHealth();
  await loadServices();
})();