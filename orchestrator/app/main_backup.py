from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import re
import socket
import docker

app = FastAPI(title="Microservices Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "/app/data/services.json"
GENERATED_SERVICES_DIR = "/generated_services"
PORT_RANGE_START = 8100
PORT_RANGE_END = 8999


class MicroserviceCreate(BaseModel):
    name: str
    description: str
    language: str
    sourceCode: str


def ensure_data_file():
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)


def read_services():
    ensure_data_file()
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_services(services):
    ensure_data_file()
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(services, f, indent=2, ensure_ascii=False)


def normalize_name(name: str) -> str:
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9\-]", "-", name)
    name = re.sub(r"-+", "-", name)
    return name.strip("-")


def validate_language(language: str) -> str:
    lang = language.strip().lower()
    if lang not in ["python", "node"]:
        raise HTTPException(
            status_code=400,
            detail="Lenguaje no soportado. Usa 'python' o 'node'."
        )
    return lang


def get_service_filename(language: str) -> str:
    return "app.py" if language == "python" else "app.js"


def get_python_dockerfile() -> str:
    return """FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]
"""


def get_node_dockerfile() -> str:
    return """FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY app.js .

EXPOSE 3000

CMD ["node", "app.js"]
"""


def get_python_requirements() -> str:
    return "flask==3.0.3\n"


def get_node_package_json(service_name: str) -> str:
    data = {
        "name": service_name,
        "version": "1.0.0",
        "main": "app.js",
        "dependencies": {
            "express": "^4.18.2"
        }
    }
    return json.dumps(data, indent=2, ensure_ascii=False)


def generate_runtime_files(service_dir: str, language: str, service_name: str):
    dockerfile_path = os.path.join(service_dir, "Dockerfile")

    if language == "python":
        requirements_path = os.path.join(service_dir, "requirements.txt")

        with open(dockerfile_path, "w", encoding="utf-8") as f:
            f.write(get_python_dockerfile())

        with open(requirements_path, "w", encoding="utf-8") as f:
            f.write(get_python_requirements())

    elif language == "node":
        package_json_path = os.path.join(service_dir, "package.json")

        with open(dockerfile_path, "w", encoding="utf-8") as f:
            f.write(get_node_dockerfile())

        with open(package_json_path, "w", encoding="utf-8") as f:
            f.write(get_node_package_json(service_name))


def is_port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.2)
        return s.connect_ex(("host.docker.internal", port)) != 0


def get_next_available_port() -> int:
    services = read_services()
    used_ports = {service.get("host_port") for service in services if service.get("host_port")}

    for port in range(PORT_RANGE_START, PORT_RANGE_END + 1):
        if port not in used_ports and is_port_free(port):
            return port

    raise HTTPException(status_code=500, detail="No hay puertos disponibles.")


def get_docker_client():
    try:
        return docker.DockerClient(base_url="unix://var/run/docker.sock")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo conectar a Docker: {str(e)}")


def build_image(service_name: str, service_dir: str):
    client = get_docker_client()
    image_tag = f"ms-{service_name}:latest"

    try:
        client.images.build(path=service_dir, tag=image_tag, rm=True)
        return image_tag
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error construyendo imagen: {str(e)}")


def run_container(service_name: str, image_tag: str, internal_port: int, host_port: int):
    client = get_docker_client()
    container_name = f"ms-{service_name}"

    try:
        existing = None
        try:
            existing = client.containers.get(container_name)
        except docker.errors.NotFound:
            existing = None

        if existing:
            existing.remove(force=True)

        container = client.containers.run(
            image_tag,
            name=container_name,
            detach=True,
            ports={f"{internal_port}/tcp": host_port}
        )
        return container_name, container.id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error levantando contenedor: {str(e)}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "orchestrator"
    }


@app.get("/api/microservices")
def list_microservices():
    services = read_services()
    return {
        "total": len(services),
        "items": services
    }


@app.post("/api/microservices")
def create_microservice(payload: MicroserviceCreate):
    services = read_services()

    name = normalize_name(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio.")

    language = validate_language(payload.language)

    exists = any(service["name"] == name for service in services)
    if exists:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un microservicio con ese nombre."
        )

    os.makedirs(GENERATED_SERVICES_DIR, exist_ok=True)

    service_dir = os.path.join(GENERATED_SERVICES_DIR, name)
    if os.path.exists(service_dir):
        raise HTTPException(
            status_code=400,
            detail="La carpeta del microservicio ya existe."
        )

    os.makedirs(service_dir, exist_ok=True)

    filename = get_service_filename(language)
    source_file_path = os.path.join(service_dir, filename)

    with open(source_file_path, "w", encoding="utf-8") as f:
        f.write(payload.sourceCode)

    generate_runtime_files(service_dir, language, name)

    internal_port = 5000 if language == "python" else 3000
    host_port = get_next_available_port()
    image_tag = build_image(name, service_dir)
    container_name, container_id = run_container(name, image_tag, internal_port, host_port)

    new_service = {
        "name": name,
        "description": payload.description.strip(),
        "language": language,
        "status": "running",
        "source_file": filename,
        "service_dir": f"/generated_services/{name}",
        "dockerfile": "Dockerfile",
        "runtime_file": "requirements.txt" if language == "python" else "package.json",
        "internal_port": internal_port,
        "host_port": host_port,
        "image_tag": image_tag,
        "container_name": container_name,
        "container_id": container_id,
        "url": f"http://localhost:{host_port}"
    }

    services.append(new_service)
    write_services(services)

    return {
        "message": "Microservicio creado, containerizado y ejecutándose.",
        "item": new_service
    }