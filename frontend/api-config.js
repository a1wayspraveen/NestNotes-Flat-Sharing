
// ========================================
// NESTNOTES API CONFIGURATION
// ========================================

window.NESTNOTES_API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000/api"
        : "https://nestnotes-flat-sharing.onrender.com/api";
