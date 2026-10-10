import React, { useState } from 'react'
import { useNavigate, Link, Navigate, useSearchParams } from 'react-router-dom'
import "../auth.forrm.scss"
import { useAuth } from '../hooks/useAuth'

const Register = () => {

    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [searchParams] = useSearchParams()
    const role = searchParams.get("role")

    const { loading, handleRegister } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSubmitting(true)
        try {
            const response = await handleRegister({ username, email, password, role })
            if (!response?.user) {
                throw new Error("Registration did not complete. Please try again.")
            }
            navigate(role === "recruiter" ? "/recruiter" : "/jobs")
        } catch (requestError) {
            setError(requestError.response?.data?.message
                || (requestError.code === "ERR_NETWORK" ? "Cannot reach the server. Check that the backend is running and retry." : "")
                || requestError.message
                || "Could not create your account.")
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
                        <span className="auth-badge">{role === "recruiter" ? "For hiring teams" : "For job seekers"}</span>
                        <h1 className="auth-visual__heading">{role === "recruiter" ? "Build your team with a clearer view of every candidate." : "Create your career edge before the first interview call."}</h1>
                        <p className="auth-visual__text">
                            {role === "recruiter"
                                ? "Publish jobs, compare resumes with role requirements, and manage candidate progress in your hiring pipeline."
                                : "Sign up to generate interview plans, align your experience to each role, and keep a clear professional story ready for every opportunity."}
                        </p>
                        <div className="auth-feature-list">
                            <div className="auth-feature">
                                <span className="auth-feature__icon">★</span>
                                <span>{role === "recruiter" ? "Structured applicant tracking" : "Job-specific positioning guidance"}</span>
                            </div>
                            <div className="auth-feature">
                                <span className="auth-feature__icon">★</span>
                                <span>{role === "recruiter" ? "ATS resume skill matching" : "Resume-ready deliverables"}</span>
                            </div>
                            <div className="auth-feature">
                                <span className="auth-feature__icon">★</span>
                                <span>{role === "recruiter" ? "Candidate status pipeline" : "Track your preparation progress"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="auth-card">
                    <div className="form-container">
                        <div className="form-header">
                            <h1 className="form-title">Create account</h1>
                            <p className="form-subtitle">Create your {role === "recruiter" ? "recruiter" : "job seeker"} workspace.</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    onChange={(e) => setUsername(e.target.value)}
                                    type="text"
                                    id="username"
                                    name='username'
                                    placeholder='Enter username'
                                    value={username}
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    id="email"
                                    name='email'
                                    placeholder='Enter email address'
                                    value={email}
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
                                />
                            </div>

                            {error && <p className="auth-error" role="alert">{error}</p>}
                            <button className='button primary-button' type="submit" disabled={submitting}>
                                {submitting ? "Creating account..." : "Create account"}
                            </button>
                        </form>

                        <p className="auth-meta">Already have an account? <Link to={`/login?role=${role}`}>Login</Link></p>
                        <p className="auth-meta"><Link to="/choose-workspace">Change workspace</Link></p>
                    </div>
                </div>
            </div>
        </main>
    )
}

export default Register