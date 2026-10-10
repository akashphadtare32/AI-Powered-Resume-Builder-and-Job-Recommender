import api from "../../../services/api"

export async function register({ username, email, password, role }) {
    const response = await api.post('/api/auth/register', { username, email, password, role })
    return response.data
}

export async function login({ email, password, role }) {
    const response = await api.post("/api/auth/login", { email, password, role })
    return response.data
}

export async function changeAccountRole({ email, password, role }) {
    const response = await api.post("/api/auth/change-role", { email, password, role })
    return response.data
}

export async function logout() {
    const response = await api.get("/api/auth/logout")
    return response.data
}

export async function getMe() {
    const response = await api.get("/api/auth/get-me")
    return response.data
}