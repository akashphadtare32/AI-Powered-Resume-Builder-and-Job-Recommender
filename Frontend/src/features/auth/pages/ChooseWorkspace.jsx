import { Link } from "react-router-dom"
import "../auth.forrm.scss"
import "../workspace-choice.scss"

const workspaces = [
    {
        role: "user",
        label: "For job seekers",
        title: "Your next role starts here.",
        description: "Discover opportunities, check resume skill alignment, and keep your applications moving.",
        features: ["Explore open roles", "See matched skills and gaps", "Track every application"],
        action: "Create a job seeker account"
    },
    {
        role: "recruiter",
        label: "For hiring teams",
        title: "Find the right people.",
        description: "Publish a role, review resume-to-skill matches, and organize candidates in one pipeline.",
        features: ["Post roles with clear skill criteria", "Review resume matches and gaps", "Move candidates through hiring stages"],
        action: "Create a recruiter account"
    }
]

export default function ChooseWorkspace() {
    return (
        <main className="workspace-choice">
            <header className="workspace-choice__header">
                <Link className="workspace-brand" to="/choose-workspace">
                    <span className="workspace-brand__mark">A</span>
                    <span>Align<span className="workspace-brand__accent">AI</span></span>
                </Link>
                <p>Already registered? Sign in from your workspace card.</p>
            </header>

            <section className="workspace-choice__intro">
                <span className="auth-badge">One platform · Two workspaces</span>
                <h1>Choose the workspace<br />that works for <span>you.</span></h1>
                <p>Whether you’re building your career or your team, start with the tools made for your side of the hiring journey.</p>
            </section>

            <section className="workspace-choice__grid" aria-label="Choose account type">
                {workspaces.map((workspace, index) => (
                    <article className={`workspace-choice__card ${index === 1 ? "workspace-choice__card--recruiter" : ""}`} key={workspace.role}>
                        <span className="workspace-choice__number">0{index + 1}</span>
                        <span className="workspace-choice__label">{workspace.label}</span>
                        <h2>{workspace.title}</h2>
                        <p>{workspace.description}</p>
                        <ul>
                            {workspace.features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}
                        </ul>
                        <div className="workspace-choice__actions">
                            <Link className="workspace-choice__primary" to={`/register?role=${workspace.role}`}>{workspace.action}<span aria-hidden="true">→</span></Link>
                            <Link className="workspace-choice__secondary" to={`/login?role=${workspace.role}`}>Already registered? Sign in</Link>
                        </div>
                    </article>
                ))}
            </section>
            <footer className="workspace-choice__footer">AI-powered career tools for candidates and hiring teams.</footer>
        </main>
    )
}
