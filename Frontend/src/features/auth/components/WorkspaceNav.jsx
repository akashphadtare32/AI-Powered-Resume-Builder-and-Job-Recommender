import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "../hooks/useAuth"
import { logout } from "../services/auth.api"

export default function WorkspaceNav() {
    const { user, setUser } = useAuth()
    const navigate = useNavigate()
    const [error, setError] = useState("")
    const homePath = user?.role === "recruiter" ? "/recruiter" : "/jobs"

    const handleLogout = async () => {
        setError("")
        try {
            await logout()
            setUser(null)
            navigate("/login")
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Could not sign out. Please try again.")
        }
    }

    return (
        <header className="workspace-nav">
            <Link className="workspace-brand" to={homePath}>
                <span className="workspace-brand__mark">A</span>
                <span>Align<span className="workspace-brand__accent">AI</span></span>
            </Link>
            <nav className="workspace-nav__links" aria-label="Workspace navigation">
                {user?.role === "recruiter" ? (
                    <Link to="/recruiter">Recruiter workspace</Link>
                ) : (
                    <>
                        <Link to="/jobs">Resume matching</Link>
                        <Link to="/">Interview prep &amp; resume builder</Link>
                    </>
                )}
            </nav>
            <div className="workspace-nav__account">
                <span>{user?.username || "Workspace"} <small>{user?.role === "recruiter" ? "Recruiter" : "Job seeker"}</small></span>
                <button type="button" onClick={handleLogout}>Sign out</button>
            </div>
            {error && <span className="workspace-nav__error" role="alert">{error}</span>}
        </header>
    )
}
