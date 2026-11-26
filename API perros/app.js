const API = "https://dog.ceo/api";

let imagenes = [];       //direcciones de imagen visibles
let razas = [];          //nombres de razas para el selector
let razaElegida = "";    //  cuando no se especifica carga todas ""
let cargando = false;
let error = null;        // mensaje de error o null

let ultimaAccion = null;   //para el boton "Reintentar"
let controlador = null;    //AbortController de la peticion en curso
let idPeticion = 0;      //identifica la peticion mas reciente

const selector = document.getElementById("selector-raza");
const galeria = document.getElementById("galeria");
const contador = document.getElementById("contador");
const mensajeCarga = document.getElementById("mensaje-carga");
const mensajeError = document.getElementById("mensaje-error");
const textoError = document.getElementById("texto-error");
const botonReintentar = document.getElementById("boton-reintentar");
const botonMas = document.getElementById("boton-mas");

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerRaza(url) {
  const coincidencia = url.match(/breeds\/([^/]+)\//);
  if (!coincidencia) return "desconocida";
  return coincidencia[1].replace(/-/g, " ");
}

// Pide una URL y devuelve el campo "message" si todo salió bien
function pedir(url, signal) {
  return fetch(url, { signal: signal })
    .then(function (respuesta) {
      if (!respuesta.ok) {
        throw new Error("La API respondio con el código " + respuesta.status);
      }
      return respuesta.json();
    })
    .then(function (datos) {
      if (datos.status !== "success") {
        throw new Error(datos.message || "La API devolvio un error");
      }
      return datos.message;
    });
}

// Construye la dirección segun la raza elegida
function urlImagenes(cantidad) {
  if (razaElegida === "") {
    return API + "/breeds/image/random/" + cantidad;
  }
  return API + "/breed/" + razaElegida + "/images/random/" + cantidad;
}

// dibujar en pantalla
function crearTarjeta(url) {
  const nombre = obtenerRaza(url);

  const figura = document.createElement("figure");
  figura.className = "tarjeta";

  const img = document.createElement("img");
  img.src = url;
  img.alt = "Perro de raza " + nombre;
  img.loading = "lazy"; // carga diferida

  const pie = document.createElement("figcaption");
  pie.textContent = nombre;

  figura.appendChild(img);
  figura.appendChild(pie);
  return figura;
}

function dibujarGaleria() {
  galeria.innerHTML = "";
  imagenes.forEach(function (url) {
    galeria.appendChild(crearTarjeta(url));
  });
}

function dibujarContador() {
  const nombreRaza = razaElegida === "" ? "Todas" : capitalizar(razaElegida);
  contador.textContent = imagenes.length + " imágenes · raza: " + nombreRaza;
}

function dibujarEstado() {
  mensajeCarga.hidden = !cargando;

  if (error) {
    textoError.textContent = error;
    mensajeError.hidden = false;
  } else {
    mensajeError.hidden = true;
  }

  botonMas.disabled = cargando;
  selector.disabled = false; // se puede cambiar de raza aun cargando
}

function dibujarSelector() {
  selector.innerHTML = "";

  const opcionTodas = document.createElement("option");
  opcionTodas.value = "";
  opcionTodas.textContent = "Todas las razas";
  selector.appendChild(opcionTodas);

  razas.forEach(function (raza) {
    const opcion = document.createElement("option");
    opcion.value = raza;
    opcion.textContent = capitalizar(raza);
    selector.appendChild(opcion);
  });

  selector.value = razaElegida;
}

// Peticiones
// Carga 50 imagenes (reemplaza lo que habia)
function cargarGaleria() {
  ultimaAccion = cargarGaleria;

  // Cancela la peticion anterior para evitar respuestas desordenadas
  if (controlador) controlador.abort();
  controlador = new AbortController();
  const miId = ++idPeticion;

  cargando = true;
  error = null;
  dibujarEstado();

  pedir(urlImagenes(50), controlador.signal)
    .then(function (lista) {
      if (miId !== idPeticion) return; // llega tarde, se ignora
      imagenes = Array.isArray(lista) ? lista : [lista];
      dibujarGaleria();
      dibujarContador();
    })
    .catch(function (err) {
      if (err.name === "AbortError") return; // fue cancelada a proposito
      if (miId !== idPeticion) return;
      error = "No se pudieron cargar las imágenes. " + err.message;
    })
    .finally(function () {
      if (miId !== idPeticion) return;
      cargando = false;
      dibujarEstado();
    });
}

// Agrega 5 imagenes al final, sin repetir y sin borrar las anteriores
function traerMas() {
  ultimaAccion = traerMas;

  if (controlador) controlador.abort();
  controlador = new AbortController();
  const miId = ++idPeticion;

  cargando = true;
  error = null;
  dibujarEstado();

  pedir(urlImagenes(5), controlador.signal)
    .then(function (lista) {
      if (miId !== idPeticion) return;
      const nuevas = (Array.isArray(lista) ? lista : [lista]).filter(function (url) {
        return !imagenes.includes(url); // descarta repetidas
      });
      imagenes = imagenes.concat(nuevas);
      dibujarGaleria();
      dibujarContador();
    })
    .catch(function (err) {
      if (err.name === "AbortError") return;
      if (miId !== idPeticion) return;
      // Las fotos anteriores se conservan
      error = "No se pudieron traer mas imagenes " + err.message;
    })
    .finally(function () {
      if (miId !== idPeticion) return;
      cargando = false;
      dibujarEstado();
    });
}

// Carga la lista de razas para el selector
function cargarRazas() {
  pedir(API + "/breeds/list/all")
    .then(function (objeto) {
      razas = Object.keys(objeto).sort();
      dibujarSelector();
    })
    .catch(function (err) {
      console.error("No se pudo cargar la lista de razas:", err);
    });
}

// Eventos
selector.addEventListener("change", function () {
  razaElegida = selector.value;
  cargarGaleria();
});

botonMas.addEventListener("click", traerMas);

botonReintentar.addEventListener("click", function () {
  if (ultimaAccion) ultimaAccion();
});



//INICIO
dibujarContador();
cargarRazas();
cargarGaleria();
