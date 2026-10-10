import React, { useState } from 'react'
import { useNavigate, Link, Navigate, useSearchParams } from 'react-router-dom'
import "../auth.forrm.scss"
import { useAuth } from '../hooks/useAuth'

const Login = () => {

    const { loading, handleLogin, handleChangeAccountRole } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [canConvertAccount, setCanConvertAccount] = useState(false)
    const [confirmConversion, setConfirmConversion] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const role = searchParams.get("role")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setCanConvertAccount(false)
        setConfirmConversion(false)
        setSubmitting(true)
        try {
            const response = await handleLogin({ email, password, role })
            if (!response?.user) {
                throw new Error("Sign in did not complete. Please check your details and try again.")
            }
            navigate(role === "recruiter" ? "/recruiter" : "/jobs")
        } catch (requestError) {
            setCanConvertAccount(role === "recruiter" && requestError.response?.data?.userRole === "user")
            setError(requestError.response?.data?.message
                || (requestError.code === "ERR_NETWORK" ? "Cannot reach the server. Check that the backend is running and retry." : "")
                || requestError.message
                || "Could not sign in.")
        } finally {
            setSubmitting(false)
        }
    }

    const handleConvertAccount = async () => {
        setError("")
        setSubmitting(true)
        try {
            const response = await handleChangeAccountRole({ email, password, role: "recruiter" })
            if (!response?.user) {
                throw new Error("Account conversion did not complete. Please try again.")
            }
            navigate("/recruiter")
        } catch (requestError) {
            setError(requestError.response?.data?.message
                || (requestError.code === "ERR_NETWORK" ? "Cannot reach the server. Check that the backend is running and retry." : "")
                || requestError.message
                || "Could not change this account to recruiter.")
        } finally {
            setSubmitting(false)
        }
    }

    if (!["user", "recruiter"].includes(role)) {
        return <Navigate to="/choose-workspace" replace />
    }

    if (loading) {
        return (<main className="auth-page"><div className="form-container"><h1 className="form-title">Loading...</h1></div></main>)
    }

    return (
        <main className="auth-page">
            <div className="auth-shell">
                <div className="auth-visual">
                    <div>
                        <span className="auth-badge">{role === "recruiter" ? "Recruiter workspace" : "Job seeker workspace"}</span>
                        <h1 className="auth-visual__heading">{role === "recruiter" ? "Bring clarity to your hiring pipeline." : "Turn your profile into interview-ready momentum."}</h1>
                        <p className="auth-visual__text">
                            {role === "recruiter"
                                ? "Review resume skill matches, compare candidate fit, and keep each application moving."
                                : "Build a winning resume, tailor your story to each role, and prepare for interviews with AI-powered direction."}
                        </p>
                        <div className="auth-feature-list">
                            <div className="auth-feature">
                                <span className="auth-feature__icon">✓</span>
                                <span>{role === "recruiter" ? "Role-specific applicant lists" : "Personalized interview strategy"}</span>
                            </div>
                            <div className="auth-feature">
                                <span className="auth-feature__icon">✓</span>
                                <span>{role === "recruiter" ? "ATS skill match insights" : "Resume-to-job alignment insights"}</span>
                            </div>
                            <div className="auth-feature">
                                <span className="auth-feature__icon">✓</span>
                                <span>{role === "recruiter" ? "Candidate status tracking" : "Actionable preparation roadmap"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="auth-card">
                    <div className="form-container">
                        <div className="form-header">
                            <h1 className="form-title">Welcome back</h1>
                            <p className="form-subtitle">Sign in to your {role === "recruiter" ? "recruiter" : "job seeker"} workspace.</p>
                        </div>

                        <div className="workspace-switch" role="group" aria-label="Choose sign-in workspace">
                            <button
                                className={role === "user" ? "workspace-switch__option workspace-switch__option--active" : "workspace-switch__option"}
                                type="button"
                                aria-pressed={role === "user"}
                                onClick={() => setSearchParams({ role: "user" })}
                            >
                                Job seeker
                            </button>
                            <button
                                className={role === "recruiter" ? "workspace-switch__option workspace-switch__option--active" : "workspace-switch__option"}
                                type="button"
                                aria-pressed={role === "recruiter"}
                                onClick={() => setSearchParams({ role: "recruiter" })}
                            >
                                Recruiter
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    id="email"
                                    name='email'
                                    placeholder='Enter email address'
                                    value={email}
                                    autoComplete="username"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    onChange={(e) => setPassword(e.target.value)}
                                    type="password"
                                    id="password"
                                    name='password'
                                    placeholder='Enter password'
                                    value={password}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                            {error && <p className="auth-error" role="alert">{error}</p>}
                            {canConvertAccount && !confirmConversion && (
                                <button
                                    className="workspace-convert-link"
                                    type="button"
                                    onClick={() => setConfirmConversion(true)}
                                >
                                    Change this account to recruiter
                                </button>
                            )}
                            {confirmConversion && (
                                <div className="workspace-convert-confirm" role="group" aria-label="Confirm recruiter account conversion">
                                    <p>Changing this account to recruiter removes access to the job-seeker workspace. Existing applications remain saved, but you will no longer manage them from this account.</p>
                                    <button
                                        className="button primary-button"
                                        type="button"
                                        onClick={handleConvertAccount}
                                        disabled={submitting}
                                    >
                                        {submitting ? "Changing account..." : "Confirm and open recruiter ATS"}
                                    </button>
                                    <button
                                        className="workspace-convert-link"
                                        type="button"
                                        onClick={() => setConfirmConversion(false)}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                            <button className='button primary-button' type="submit" disabled={submitting}>
                                {submitting ? "Signing in..." : "Sign in"}
                            </button>
                        </form>

                        <p className="auth-meta">Don't have an account? <Link to={`/register?role=${role}`}>Register</Link></p>
                        <p className="auth-meta"><Link to="/choose-workspace">Create an account or explore both workspaces</Link></p>
                    </div>
                </div>
            </div>
        </main>
    )
}

export default Login