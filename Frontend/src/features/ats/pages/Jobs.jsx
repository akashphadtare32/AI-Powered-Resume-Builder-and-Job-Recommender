import { useCallback, useEffect, useState } from "react"
import WorkspaceNav from "../../auth/components/WorkspaceNav"
import { getApiErrorMessage, getJobs, getMyApplications, analyzeResumeFit, matchResumeToJob, createAtsResume, applyToJob } from "../services/ats.api"
import "../style/ats.scss"

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
})

const Jobs = () => {
    const [jobs, setJobs] = useState([])
    const [applications, setApplications] = useState([])
    const [selectedFiles, setSelectedFiles] = useState({})
    const [analyses, setAnalyses] = useState({})
    const [matchResumeFile, setMatchResumeFile] = useState(null)
    const [matchJobId, setMatchJobId] = useState("")
    const [workspaceMatch, setWorkspaceMatch] = useState(null)
    const [workspaceTask, setWorkspaceTask] = useState("")
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState("")
    const [analyzing, setAnalyzing] = useState("")
    const [matching, setMatching] = useState("")
    const [error, setError] = useState("")
    const [notice, setNotice] = useState("")

    const refresh = useCallback(async () => {
        setLoading(true)
        setError("")
        try {
            const [jobResults, applicationResults] = await Promise.all([getJobs(), getMyApplications()])
            setJobs(jobResults)
            setApplications(applicationResults)
            setMatchJobId((current) => current || jobResults[0]?._id || "")
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not load jobs."))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { refresh() }, [refresh])

    const selectedMatchJob = jobs.find((job) => job._id === matchJobId)

    const handleMatchResumeFile = (file) => {
        if (!file) return
        if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
            setError("Choose a PDF, DOCX, or TXT resume.")
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setError("Resume uploads must be 10 MB or smaller.")
            return
        }
        setMatchResumeFile(file)
        setWorkspaceMatch(null)
        setError("")
    }

    const handleWorkspaceMatch = async () => {
        if (!matchResumeFile || !selectedMatchJob) {
            setError("Upload your resume and select a recruiter-posted role first.")
            return
        }
        setWorkspaceTask("match")
        setError("")
        setNotice("")
        try {
            const matchMetrics = await matchResumeToJob(selectedMatchJob._id, matchResumeFile)
            setWorkspaceMatch({ jobId: selectedMatchJob._id, matchMetrics, coaching: null })
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not match your resume to this role."))
        } finally {
            setWorkspaceTask("")
        }
    }

    const handleWorkspaceCoach = async () => {
        if (!matchResumeFile || !selectedMatchJob) {
            setError("Upload your resume and select a recruiter-posted role first.")
            return
        }
        setWorkspaceTask("coach")
        setError("")
        setNotice("")
        try {
            const result = await analyzeResumeFit(selectedMatchJob._id, matchResumeFile)
            setWorkspaceMatch({
                jobId: selectedMatchJob._id,
                matchMetrics: result.matchMetrics,
                coaching: result.analysis
            })
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not generate AI role guidance."))
        } finally {
            setWorkspaceTask("")
        }
    }

    const handleCreateTemplate = async () => {
        if (!matchResumeFile || !selectedMatchJob) {
            setError("Upload your resume and select a recruiter-posted role first.")
            return
        }
        setWorkspaceTask("template")
        setError("")
        setNotice("")
        try {
            const pdf = await createAtsResume(selectedMatchJob._id, matchResumeFile)
            const pdfUrl = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = pdfUrl
            link.download = `ats-resume-${selectedMatchJob.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "role"}.pdf`
            link.click()
            window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000)
            setNotice("Your ATS-friendly resume PDF is ready. It preserves your source content and highlights only job keywords already present in your resume.")
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not create your tailored resume template."))
        } finally {
            setWorkspaceTask("")
        }
    }

    const handleMatch = async (jobId) => {
        const resume = selectedFiles[jobId]
        if (!resume) {
            setError("Choose a resume file before calculating your match.")
            return
        }
        setMatching(jobId)
        setError("")
        setNotice("")
        try {
            const matchMetrics = await matchResumeToJob(jobId, resume)
            setAnalyses((current) => ({
                ...current,
                [jobId]: { ...current[jobId], matchMetrics }
            }))
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not match your resume to this role."))
        } finally {
            setMatching("")
        }
    }

    const handleAnalyze = async (jobId) => {
        const resume = selectedFiles[jobId]
        if (!resume) {
            setError("Choose a resume file before asking AI to analyze your fit.")
            return
        }
        setAnalyzing(jobId)
        setError("")
        setNotice("")
        try {
            const result = await analyzeResumeFit(jobId, resume)
            setAnalyses((current) => ({
                ...current,
                [jobId]: { ...current[jobId], matchMetrics: result.matchMetrics, coaching: result.analysis }
            }))
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not analyze your resume for this role."))
        } finally {
            setAnalyzing("")
        }
    }

    const handleApply = async (jobId) => {
        const resume = selectedFiles[jobId]
        if (!resume) {
            setError("Choose a resume file before applying.")
            return
        }
        setApplying(jobId)
        setError("")
        setNotice("")
        try {
            await applyToJob(jobId, resume)
            setSelectedFiles((current) => ({ ...current, [jobId]: null }))
            setNotice("Application submitted. Your resume-fit score and status are now in My applications.")
            await refresh()
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not submit your application."))
        } finally {
            setApplying("")
        }
    }

    return (
        <main className="ats-page">
            <WorkspaceNav />
            <section className="ats-hero">
                <span className="ats-eyebrow">Your resume-matching workspace</span>
                <h1>Make your next move <span>match.</span></h1>
                <p>Choose a role, upload your resume, and compare TF-IDF cosine similarity, required keywords, and skill gaps before you apply.</p>
                <div className="ats-hero__stats">
                    <div><strong>{jobs.length}</strong><span>Open roles</span></div>
                    <div><strong>{applications.length}</strong><span>Applications</span></div>
                    <div><strong>{applications.filter((item) => item.status === "shortlisted").length}</strong><span>Shortlisted</span></div>
                </div>
            </section>

            {error && <div className="ats-alert ats-alert--error" role="alert">{error}</div>}
            {notice && <div className="ats-alert ats-alert--success" role="status">{notice}</div>}

            <section className="ats-section resume-match-workspace" aria-labelledby="match-workspace-title">
                <div className="ats-section__heading">
                    <div><span className="ats-eyebrow">Candidate workspace</span><h2 id="match-workspace-title">Match your resume to a role</h2></div>
                    <span className="ats-count">Two-step match</span>
                </div>
                <div className="match-workspace__panels">
                    <section className="match-workspace__panel">
                        <span className="match-workspace__step">01 · Your profile</span>
                        <h3>Upload your resume</h3>
                        <p>Choose a PDF, DOCX, or TXT file. We extract its text for matching; it is not added to a public profile.</p>
                        <label
                            className="match-resume-dropzone"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault()
                                const file = event.dataTransfer.files?.[0]
                                handleMatchResumeFile(file)
                            }}
                        >
                            <input
                                type="file"
                                accept=".pdf,.docx,.txt"
                                onChange={(event) => {
                                    handleMatchResumeFile(event.target.files?.[0])
                                }}
                            />
                            <strong>{matchResumeFile?.name || "Drop your resume here or click to browse"}</strong>
                            <span>{matchResumeFile ? `${(matchResumeFile.size / 1024).toFixed(0)} KB · Choose another file to replace` : "Maximum 10 MB · PDF, DOCX, TXT"}</span>
                        </label>
                    </section>

                    <section className="match-workspace__panel">
                        <span className="match-workspace__step">02 · Target role</span>
                        <h3>Select a recruiter-posted job</h3>
                        <p>The job description and required skills come from the role published by the hiring team.</p>
                        <label className="job-select-label">Choose a role
                            <select
                                value={matchJobId}
                                onChange={(event) => {
                                    setMatchJobId(event.target.value)
                                    setWorkspaceMatch(null)
                                }}
                                disabled={!jobs.length}
                            >
                                {jobs.length
                                    ? jobs.map((job) => <option key={job._id} value={job._id}>{job.title} · {job.company}</option>)
                                    : <option value="">No roles available yet</option>}
                            </select>
                        </label>
                        {selectedMatchJob ? (
                            <div className="match-role-preview">
                                <div><strong>{selectedMatchJob.title}</strong><span>{selectedMatchJob.company} · {selectedMatchJob.location}</span></div>
                                <p>{selectedMatchJob.description}</p>
                                <div className="skill-list" aria-label="Role-required skills">
                                    {selectedMatchJob.requiredSkills.map((skill) => <span key={skill}>{skill}</span>)}
                                </div>
                            </div>
                        ) : <div className="ats-empty"><strong>No recruiter roles yet</strong><span>Job descriptions will appear here when a recruiter publishes a role.</span></div>}
                    </section>
                </div>

                <div className="match-workspace__actions">
                    <button type="button" onClick={handleWorkspaceMatch} disabled={!!workspaceTask || !matchResumeFile || !selectedMatchJob}>
                        {workspaceTask === "match" ? "Matching..." : "Calculate resume fit"}
                    </button>
                    <button type="button" onClick={handleWorkspaceCoach} disabled={!!workspaceTask || !matchResumeFile || !selectedMatchJob}>
                        {workspaceTask === "coach" ? "Generating AI plan..." : "Get GenAI skill-gap plan"}
                    </button>
                    <button type="button" onClick={handleCreateTemplate} disabled={!!workspaceTask || !matchResumeFile || !selectedMatchJob}>
                        {workspaceTask === "template" ? "Creating PDF..." : "Download ATS-friendly resume"}
                    </button>
                </div>

                {workspaceMatch && (
                    <div className="match-workspace__result" role="status">
                        <div className="ats-section__heading">
                            <div><span className="ats-eyebrow">Explainable match</span><h3>{jobs.find((job) => job._id === workspaceMatch.jobId)?.title}</h3></div>
                            <strong>{workspaceMatch.matchMetrics.fitScore}%<small> combined fit</small></strong>
                        </div>
                        <div className="job-fit-metrics">
                            <div><span>Combined fit</span><strong>{workspaceMatch.matchMetrics.fitScore}%</strong></div>
                            <div><span>TF-IDF cosine similarity</span><strong>{workspaceMatch.matchMetrics.cosineScore}%</strong></div>
                            <div><span>Required-skill keywords</span><strong>{workspaceMatch.matchMetrics.keywordScore}%</strong></div>
                        </div>
                        <p className="job-fit-analysis__formula">Combined fit = 60% TF-IDF cosine similarity + 40% required-skill keyword coverage.</p>
                        <div className="candidate-skills">
                            <div><span className="candidate-skills__label">Matched requirements</span><div className="skill-list">
                                {workspaceMatch.matchMetrics.matchedSkills.length
                                    ? workspaceMatch.matchMetrics.matchedSkills.map((skill) => <span className="skill-tag--matched" key={skill}>{skill}</span>)
                                    : <small>No listed skills matched yet.</small>}
                            </div></div>
                            <div><span className="candidate-skills__label">Gaps to address</span><div className="skill-list">
                                {workspaceMatch.matchMetrics.missingSkills.length
                                    ? workspaceMatch.matchMetrics.missingSkills.map((skill) => <span className="skill-tag--missing" key={skill}>{skill}</span>)
                                    : <small>All listed skills appear in the resume.</small>}
                            </div></div>
                        </div>
                        {workspaceMatch.matchMetrics.keywords && (
                            <div className="candidate-keywords">
                                <div>
                                    <span className="candidate-skills__label">Job keywords found in resume</span>
                                    <div className="skill-list">
                                        {workspaceMatch.matchMetrics.keywords.matched.length
                                            ? workspaceMatch.matchMetrics.keywords.matched.map((keyword) => <span className="skill-tag--matched" key={keyword}>{keyword}</span>)
                                            : <small>No extracted job keywords matched exactly.</small>}
                                    </div>
                                </div>
                                <div>
                                    <span className="candidate-skills__label">Job keywords not found</span>
                                    <div className="skill-list">
                                        {workspaceMatch.matchMetrics.keywords.missing.length
                                            ? workspaceMatch.matchMetrics.keywords.missing.map((keyword) => <span className="skill-tag--missing" key={keyword}>{keyword}</span>)
                                            : <small>All extracted role keywords appear in the resume.</small>}
                                    </div>
                                </div>
                                <div>
                                    <span className="candidate-skills__label">Keywords extracted from resume</span>
                                    <div className="skill-list">
                                        {workspaceMatch.matchMetrics.keywords.resume.map((keyword) => <span key={keyword}>{keyword}</span>)}
                                    </div>
                                </div>
                            </div>
                        )}
                        {workspaceMatch.coaching && (
                            <div className="match-workspace__coaching">
                                <h4>GenAI role guidance · {workspaceMatch.coaching.matchScore}% AI fit</h4>
                                <p>{workspaceMatch.coaching.summary}</p>
                                {workspaceMatch.coaching.strengths.length > 0 && (
                                    <div className="match-coaching-detail">
                                        <h5>Evidence-backed strengths</h5>
                                        <ul>{workspaceMatch.coaching.strengths.map((strength) => (
                                            <li key={`${strength.skill}-${strength.evidence}`}><strong>{strength.skill}</strong><span>{strength.evidence}</span></li>
                                        ))}</ul>
                                    </div>
                                )}
                                {workspaceMatch.coaching.skillGaps.length > 0 && (
                                    <div className="match-coaching-detail">
                                        <h5>GenAI-identified skill gaps</h5>
                                        <ul>{workspaceMatch.coaching.skillGaps.map((gap) => (
                                            <li key={gap.skill}>
                                                <strong>{gap.skill} · {gap.importance} priority</strong>
                                                <span>{gap.reason} Suggested action: {gap.suggestedAction}</span>
                                            </li>
                                        ))}</ul>
                                    </div>
                                )}
                                {workspaceMatch.coaching.improvementPlan.length > 0 && (
                                    <ol>{workspaceMatch.coaching.improvementPlan.map((step) => (
                                        <li key={`${step.step}-${step.action}`}><strong>{step.action}</strong><span>{step.expectedOutcome}</span></li>
                                    ))}</ol>
                                )}
                            </div>
                        )}
                        <p className="ats-disclaimer">This score is decision support based on resume text and listed role requirements, not a hiring decision.</p>
                    </div>
                )}
            </section>

            <div className="ats-columns">
                <section className="ats-section">
                    <div className="ats-section__heading">
                        <div><span className="ats-eyebrow">Curated for you</span><h2>Open positions</h2></div>
                        <span className="ats-count">{jobs.length} roles</span>
                    </div>
                    {loading ? <p className="ats-empty">Loading opportunities...</p> : jobs.length === 0 ? (
                        <div className="ats-empty"><strong>No open roles yet</strong><span>Check back soon for new opportunities.</span></div>
                    ) : (
                        <div className="job-list">
                            {jobs.map((job) => (
                                <article className="job-card" key={job._id}>
                                    <div className="job-card__top">
                                        <div className="company-avatar">{job.company.slice(0, 1).toUpperCase()}</div>
                                        <div className="job-card__title"><h3>{job.title}</h3><p>{job.company} <span>·</span> {job.location}</p></div>
                                        <span className="job-date">{formatDate(job.createdAt)}</span>
                                    </div>
                                    <p className="job-card__description">{job.description}</p>
                                    <div className="skill-list" aria-label="Required skills">
                                        {job.requiredSkills.map((skill) => <span key={skill}>{skill}</span>)}
                                    </div>
                                    {job.applicationStatus ? (
                                        <div className="job-applied"><span>Application submitted</span><strong className={`status-pill status-pill--${job.applicationStatus}`}>{job.applicationStatus}</strong></div>
                                    ) : (
                                        <div className="job-card__apply">
                                            <label className="resume-input">
                                                <input
                                                    type="file"
                                                    accept=".pdf,.docx,.txt"
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0] || null
                                                        setSelectedFiles((current) => ({ ...current, [job._id]: file }))
                                                        setAnalyses((current) => {
                                                            const next = { ...current }
                                                            delete next[job._id]
                                                            return next
                                                        })
                                                    }}
                                                />
                                                <span>{selectedFiles[job._id]?.name || "Choose resume (PDF, DOCX, TXT)"}</span>
                                            </label>
                                            <button
                                                className="job-card__analyze"
                                                type="button"
                                                onClick={() => handleMatch(job._id)}
                                                disabled={matching === job._id || analyzing === job._id || applying === job._id}
                                            >
                                                {matching === job._id ? "Matching..." : "Calculate fit"}
                                            </button>
                                            <button
                                                className="job-card__coach"
                                                type="button"
                                                onClick={() => handleAnalyze(job._id)}
                                                disabled={matching === job._id || analyzing === job._id || applying === job._id}
                                            >
                                                {analyzing === job._id ? "Preparing..." : "Get AI plan"}
                                            </button>
                                            <button type="button" onClick={() => handleApply(job._id)} disabled={applying === job._id || analyzing === job._id || matching === job._id}>
                                                {applying === job._id ? "Submitting..." : "Apply"}
                                            </button>
                                        </div>
                                    )}
                                    {(analyses[job._id]?.matchMetrics || analyses[job._id]?.coaching) && (
                                        <section className="job-fit-analysis" aria-label={`Resume match analysis for ${job.title}`}>
                                            <div className="job-fit-analysis__heading">
                                                <div>
                                                    <span className="ats-eyebrow">{analyses[job._id].coaching ? "Gemini career coach" : "Resume match engine"}</span>
                                                    <h4>{analyses[job._id].coaching ? "Role-fit analysis" : "Resume-to-role match"}</h4>
                                                </div>
                                                <strong>{analyses[job._id].matchMetrics?.fitScore ?? analyses[job._id].coaching?.matchScore}<small>/100</small></strong>
                                            </div>
                                            {analyses[job._id].matchMetrics && (
                                                <>
                                                    <div className="job-fit-metrics" aria-label="Resume matching metrics">
                                                        <div><span>Combined fit</span><strong>{analyses[job._id].matchMetrics.fitScore}%</strong></div>
                                                        <div><span>Cosine similarity</span><strong>{analyses[job._id].matchMetrics.cosineScore}%</strong></div>
                                                        <div><span>Required keywords</span><strong>{analyses[job._id].matchMetrics.keywordScore}%</strong></div>
                                                    </div>
                                                    <p className="job-fit-analysis__formula">Combined fit = 60% TF-IDF cosine similarity + 40% required-skill keyword coverage.</p>
                                                    <p className="job-fit-analysis__disclaimer">This score is explainable text matching for job-search guidance, not a hiring decision.</p>
                                                </>
                                            )}
                                            {analyses[job._id].coaching && (
                                                <>
                                                    <p className="job-fit-analysis__summary">{analyses[job._id].coaching.summary}</p>
                                                    <div className="job-fit-analysis__columns">
                                                <div>
                                                    <h5>Relevant evidence</h5>
                                                    {analyses[job._id].coaching.strengths.length ? (
                                                        <ul>
                                                            {analyses[job._id].coaching.strengths.map((item) => (
                                                                <li key={`${item.skill}-${item.evidence}`}><strong>{item.skill}:</strong> {item.evidence}</li>
                                                            ))}
                                                        </ul>
                                                    ) : <p>No direct strengths were identified in the supplied resume.</p>}
                                                </div>
                                                <div>
                                                    <h5>Skill gaps to explore</h5>
                                                    {analyses[job._id].coaching.skillGaps.length ? (
                                                        <ul>
                                                            {analyses[job._id].coaching.skillGaps.map((item) => (
                                                                <li key={`${item.skill}-${item.reason}`}>
                                                                    <strong>{item.skill} <span className={`fit-priority fit-priority--${item.importance}`}>{item.importance}</span></strong>
                                                                    <span>{item.reason}</span>
                                                                    <em>{item.suggestedAction}</em>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <p>No major skill gaps were identified from the supplied information.</p>}
                                                </div>
                                            </div>
                                            {analyses[job._id].coaching.improvementPlan.length > 0 && (
                                                <div className="job-fit-analysis__plan">
                                                    <h5>Recommended next steps</h5>
                                                    <ol>
                                                        {analyses[job._id].coaching.improvementPlan.map((item) => (
                                                            <li key={`${item.step}-${item.action}`}><strong>{item.action}</strong><span>{item.expectedOutcome}</span></li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            )}
                                            <p className="job-fit-analysis__disclaimer">AI-generated guidance based only on the resume and role details provided. It is not a hiring decision.</p>
                                                </>
                                            )}
                                        </section>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <aside className="ats-section application-tracker">
                    <div className="ats-section__heading">
                        <div><span className="ats-eyebrow">ATS tracker</span><h2>My applications</h2></div>
                        <span className="tracker-count">{applications.length}</span>
                    </div>
                    <p className="ats-section__intro">Track each step from application to decision.</p>
                    {applications.length === 0 ? (
                        <div className="ats-empty"><strong>Your pipeline starts here</strong><span>Apply to a role and its progress will appear here.</span></div>
                    ) : (
                        <div className="application-list">
                            {applications.map((application) => (
                                <article className="application-card" key={application._id}>
                                    <div className="application-card__heading">
                                        <div><h3>{application.job?.title || "Position"}</h3><p>{application.job?.company || ""}</p></div>
                                        <strong className={`status-pill status-pill--${application.status}`}>{application.status}</strong>
                                    </div>
                                    <div className="application-score">
                                        <div><span>{application.cosineScore != null ? "Combined resume fit" : "Previous ATS skill match"}</span><strong>{application.atsScore}%</strong></div>
                                        <div className="score-track"><i style={{ width: `${application.atsScore}%` }} /></div>
                                    </div>
                                    <div className="batch-metrics">
                                        <span>Cosine similarity <strong>{application.cosineScore ?? "—"}{application.cosineScore != null ? "%" : ""}</strong></span>
                                        <span>Required keywords <strong>{application.keywordScore ?? "—"}{application.keywordScore != null ? "%" : ""}</strong></span>
                                    </div>
                                    <div className="candidate-skills">
                                        <div><span className="candidate-skills__label">Matched skills</span><div className="skill-list">
                                            {application.matchedSkills.length
                                                ? application.matchedSkills.map((skill) => <span className="skill-tag--matched" key={skill}>{skill}</span>)
                                                : <small>No listed skills matched</small>}
                                        </div></div>
                                        <div><span className="candidate-skills__label">Skill gaps</span><div className="skill-list">
                                            {application.missingSkills.length
                                                ? application.missingSkills.map((skill) => <span className="skill-tag--missing" key={skill}>{skill}</span>)
                                                : <small>All listed skills matched</small>}
                                        </div></div>
                                    </div>
                                    <small className="application-date">Applied {formatDate(application.createdAt)}</small>
                                </article>
                            ))}
                        </div>
                    )}
                    <p className="ats-disclaimer">New resume-fit scores combine TF-IDF cosine similarity with required-skill keyword coverage. Older applications retain their original ATS skill score. Scores support review and are not hiring decisions.</p>
                </aside>
            </div>
        </main>
    )
}

export default Jobs
