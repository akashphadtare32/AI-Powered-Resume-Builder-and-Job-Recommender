import { useContext } from "react"
import { AuthContext } from "../auth.context"
import { changeAccountRole, login, register } from "../services/auth.api"

export const useAuth = () => {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }

    const { setUser, loading, setLoading, user } = context

    const handleLogin = async (credentials) => {
        setLoading(true)
        try {
            const response = await login(credentials)
            if (response?.user) setUser(response.user)
            return response
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (details) => {
        setLoading(true)
        try {
            const response = await register(details)
            if (response?.user) setUser(response.user)
            return response
        } finally {
            setLoading(false)
        }
    }

    const handleChangeAccountRole = async (details) => {
        setLoading(true)
        try {
            const response = await changeAccountRole(details)
            if (response?.user) setUser(response.user)
            return response
        } finally {
            setLoading(false)
        }
    }

    return { user, loading, handleLogin, handleRegister, handleChangeAccountRole }
}