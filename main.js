import { renderDayList, renderDayTrainer } from "./views_train.js";
import { renderDashboard } from "./views_dashboard.js";
import { renderBody } from "./views_body.js";
import { renderHistory } from "./views_history.js";
import { renderSettings } from "./views_settings.js";
import { getSettings, adoptPlanIfNeeded } from "./store.js";
import { PLAN } from "./data.js";
import { unlockAudioOnFirstInteraction } from "./timer.js";

adoptPlanIfNeeded(PLAN);
unlockAudioOnFirstInteraction();

const app = document.getElementById("app");
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));

function navigate(path) {
  window.location.hash = `#/${path}`;
}

function setActiveNav(section) {
  navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.route === section));
}

function route() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [section, param] = hash.split("/");

  window.scrollTo(0, 0);

  switch (section) {
    case "":
    case "dashboard":
      setActiveNav("dashboard");
      renderDashboard(app, navigate);
      break;
    case "train":
      setActiveNav("train");
      if (param) renderDayTrainer(app, param, navigate);
      else renderDayList(app, navigate);
      break;
    case "body":
      setActiveNav("body");
      renderBody(app, () => route());
      break;
    case "history":
      setActiveNav("history");
      renderHistory(app);
      break;
    case "settings":
      setActiveNav("settings");
      renderSettings(app, navigate);
      break;
    default:
      setActiveNav("dashboard");
      renderDashboard(app, navigate);
  }
}

navButtons.forEach((btn) => btn.addEventListener("click", () => navigate(btn.dataset.route)));
window.addEventListener("hashchange", route);

if (getSettings().tvMode) document.body.classList.add("tv-mode");

route();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW-Registrierung fehlgeschlagen", e));
  });
}
