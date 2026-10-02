"use strict";

const form = document.getElementById("points-form");
const dniInput = document.getElementById("dni");
const feedback = document.getElementById("query-feedback");

// Único registro ficticio. No se consulta ni se almacena información personal.
const demoClient = Object.freeze({ dni: "12345678", name: "CLIENTE DE PRUEBA", points: 1250 });

form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.replaceChildren();

    if (dniInput.value.trim() !== demoClient.dni) {
        const message = document.createElement("p");
        message.className = "error-message";
        message.textContent = "Cliente no encontrado en el modo demostración.";
        feedback.append(message);
        return;
    }

    const card = document.createElement("div");
    card.className = "result-card";
    const label = document.createElement("p");
    label.className = "result-label";
    label.textContent = "RESULTADO DE DEMOSTRACIÓN";
    const name = document.createElement("p");
    name.className = "result-name";
    name.textContent = demoClient.name;
    const points = document.createElement("strong");
    points.className = "result-points";
    points.textContent = String(demoClient.points);
    const caption = document.createElement("p");
    caption.className = "result-caption";
    caption.textContent = "Puntos de prueba · Sin conexión a la base de datos real";
    card.append(label, name, points, caption);
    feedback.append(card);
});

dniInput.addEventListener("input", () => {
    const message = document.createElement("p");
    message.className = "initial-message";
    message.textContent = "El resultado de demostración aparecerá aquí.";
    feedback.replaceChildren(message);
});
