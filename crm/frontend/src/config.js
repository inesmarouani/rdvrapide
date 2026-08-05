// URL de base de l'API backend.
// - Derrière nginx (Docker) : laisser "/api", nginx fait le reverse-proxy vers le backend.
// - En dev sans nginx (ouverture directe du frontend) : remplacer par ex. par
//   "http://localhost:8000/api" et s'assurer que ORIGIN est dans CORS_ORIGINS du backend.
window.API_BASE_URL = "/api";
