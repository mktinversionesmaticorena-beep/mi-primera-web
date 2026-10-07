"use strict";

const form = document.getElementById("points-form");
const dniInput = document.getElementById("dni");
const feedback = document.getElementById("query-feedback");
const submitButton = form.querySelector('button[type="submit"]');
const endpoint = "https://ftkpjvwsumotjszmjzgb.supabase.co/functions/v1/consultar-puntos";
const connectionError = "No pudimos realizar la consulta en este momento. Inténtalo nuevamente.";
let consulting = false;
const verificationStatus = document.getElementById("verification-status");
let turnstileToken = "";
let widgetId = null;

function updateSubmitButton() {
    submitButton.disabled = consulting || !turnstileToken;
}

function setVerificationStatus(message, isError = false) {
    verificationStatus.textContent = message;
    verificationStatus.classList.toggle("is-error", isError);
}

function invalidateVerification(message, isError = false) {
    turnstileToken = "";
    updateSubmitButton();
    setVerificationStatus(message, isError);
}

function resetVerification(message = "Completa la nueva verificación para consultar.") {
    invalidateVerification(message);
    try {
        if (widgetId === null || !window.turnstile) throw new Error("Verificación no disponible");
        window.turnstile.reset(widgetId);
    } catch {
        invalidateVerification("No pudimos iniciar la verificación. Recarga la página para intentarlo nuevamente.", true);
    }
}

updateSubmitButton();
let turnstileInitializationStarted = false;

window.onTurnstileLoad = function () {
    if (turnstileInitializationStarted) return;
    turnstileInitializationStarted = true;
    try {
        widgetId = window.turnstile.render("#turnstile-widget", {
            sitekey: "0x4AAAAAAFPWOjZxt5Ima4HW",
            size: "compact",
            theme: "light",
            language: "es",
            "response-field": false,
            callback: (token) => {
                if (consulting) return;
                turnstileToken = token;
                updateSubmitButton();
                setVerificationStatus("Verificación completada. Ya puedes consultar.");
            },
            "expired-callback": () => resetVerification("La verificación expiró. Completa una nueva verificación."),
            "timeout-callback": () => resetVerification("La verificación agotó el tiempo. Inténtalo nuevamente."),
            "error-callback": () => {
                invalidateVerification("La verificación falló. Espera el reintento o recarga la página.", true);
            }
        });
    } catch {
        invalidateVerification("No pudimos iniciar la verificación. Recarga la página para intentarlo nuevamente.", true);
    }
};

function handleTurnstileLoadError() {
    invalidateVerification("No se pudo cargar la verificación. Recarga la página para intentarlo nuevamente.", true);
}

function showMessage(text, className = "error-message") {
    const message = document.createElement("p");
    message.className = className;
    message.textContent = text;
    feedback.replaceChildren(message);
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (consulting) return;

    const documento = dniInput.value;
    if (!/^[0-9]{8,11}$/.test(documento)) {
        showMessage("Ingresa un documento de entre 8 y 11 dígitos, solo números.");
        return;
    }

    if (!turnstileToken) {
        setVerificationStatus("Completa la verificación de seguridad antes de consultar.", true);
        return;
    }

    const requestToken = turnstileToken;
    consulting = true;
    invalidateVerification("Consulta en curso. La verificación se renovará al finalizar.");
    submitButton.textContent = "Consultando...";
    dniInput.disabled = true;
    form.setAttribute("aria-busy", "true");
    showMessage("Consultando...", "initial-message");

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documento, turnstileToken: requestToken })
        });
        if (response.status === 429) {
            showMessage("Has realizado varias consultas en poco tiempo. Por seguridad, espera unos minutos antes de volver a intentarlo.");
            return;
        }
        const result = await response.json();
        if (!result || typeof result !== "object") throw new Error("Respuesta inesperada");

        if (result.encontrado === false) {
            if (typeof result.mensaje === "string" && result.mensaje.trim()) {
                showMessage(result.mensaje);
                return;
            }
            throw new Error("Respuesta inesperada");
        }
        const validPoints = typeof result.puntos === "number"
            && Number.isFinite(result.puntos) && result.puntos >= 0;
        const success = response.ok && result.ok === true
            && result.encontrado === true
            && typeof result.cliente === "string" && validPoints;
        if (!success) throw new Error("Error en la consulta");

        const card = document.createElement("div");
        card.className = "result-card";
        const label = document.createElement("p");
        label.className = "result-label";
        label.textContent = "TUS PUNTOS NORTE+";
        const name = document.createElement("p");
        name.className = "result-name";
        name.textContent = result.cliente;
        const points = document.createElement("strong");
        points.className = "result-points";
        points.textContent = String(result.puntos);
        const caption = document.createElement("p");
        caption.className = "result-caption";
        caption.textContent = "Puntos Norte+";
        card.append(label, name, points, caption);
        feedback.replaceChildren(card);
    } catch {
        showMessage(connectionError);
    } finally {
        consulting = false;
        resetVerification();
        submitButton.textContent = "Consultar";
        dniInput.disabled = false;
        form.removeAttribute("aria-busy");
    }
});

dniInput.addEventListener("input", () => {
    dniInput.value = dniInput.value.replace(/[^0-9]/g, "").slice(0, 11);
    if (!consulting) showMessage("El resultado de tu consulta aparecerá aquí.", "initial-message");
});
