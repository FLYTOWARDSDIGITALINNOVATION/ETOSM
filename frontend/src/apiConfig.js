const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                     ? "http://127.0.0.1:5001"       // local dev
                     : "http://31.97.237.122:5007";   // VPS production

console.log("Connecting to API at:", API_BASE_URL);
export default API_BASE_URL;
