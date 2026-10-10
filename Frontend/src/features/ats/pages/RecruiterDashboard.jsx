import { useCallback, useEffect, useState } from "react"
import WorkspaceNav from "../../auth/components/WorkspaceNav"
import {
    createJob,
    getApiErrorMessage,
    getJobApplications,
    getJobs,
    rankZipResumes,
    updateApplicationStatus
} from "../services/ats.api"
import "../style/ats.scss"

const statuses = ["applied", "reviewing", "shortlisted", "rejected"]

const RecruiterDashboard = () => {
    const [jobs, setJobs] = useState([])
    const [activeJobId, setActiveJobId] = useState("")
    const [applications, setApplications] = useState([])
    const [zipFile, setZipFile] = useState(null)
    const [batchResult, setBatchResult] = useState(null)
    const [batchSearch, setBatchSearch] = useState("")
    const [minimumFit, setMinimumFit] = useState("0")
    const [form, setForm] = useState({ title: "", company: "", location: "", description: "", requiredSkills: "" })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [ranking, setRanking] = useState(false)
    const [error, setError] = useState("")
    const [notice, setNotice] = useState("")

    const refreshJobs = useCallback(async () => {
        setLoading(true)
        setError("")
        try {
            const results = await getJobs()
            setJobs(results)
            if (!activeJobId && results.length) setActiveJobId(results[0]._id)
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not load your jobs."))
        } finally {
            setLoading(false)
        }
    }, [activeJobId])

    const refreshApplications = useCallback(async () => {
        if (!activeJobId) {
            setApplications([])
            return
        }
        try {
            setApplications(await getJobApplications(activeJobId))
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not load applicants."))
        }
    }, [activeJobId])

    useEffect(() => { refreshJobs() }, [])
    useEffect(() => { refreshApplications() }, [refreshApplications])

    const handleCreateJob = async (event) => {
        event.preventDefault()
        setSaving(true)
        setError("")
        setNotice("")
        try {
            const job = await createJob({
                ...form,
                requiredSkills: form.requiredSkills.split(",").map((skill) => skill.trim()).filter(Boolean)
            })
            setForm({ title: "", company: "", location: "", description: "", requiredSkills: "" })
            const results = await getJobs()
            setJobs(results)
            setActiveJobId(job._id)
            setBatchResult(null)
            setZipFile(null)
            setNotice("Job published. It is now visible to job seekers.")
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not publish the job."))
        } finally {
            setSaving(false)
        }
    }

    const changeStatus = async (applicationId, status) => {
        setError("")
        try {
            await updateApplicationStatus(applicationId, status)
            await refreshApplications()
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not update this candidate’s status."))
        }
    }

    const handleRankZip = async (event) => {
        event.preventDefault()
        if (!activeJobId) {
            setError("Publish or select a role before ranking resumes.")
            return
        }
        if (!zipFile) {
            setError("Choose a ZIP file containing candidate resumes.")
            return
        }

        setRanking(true)
        setError("")
        setNotice("")
        try {
            const result = await rankZipResumes(activeJobId, zipFile)
            setBatchResult(result)
            setBatchSearch("")
            setMinimumFit("0")
            setNotice(`Ranked ${result.candidates.length} resumes for ${result.job.title}.`)
        } catch (requestError) {
            setBatchResult(null)
            setError(getApiErrorMessage(requestError, "Could not rank the resumes in this ZIP."))
        } finally {
            setRanking(false)
        }
    }

    const downloadBatchCsv = () => {
        if (!batchResult?.candidates.length) return
        const escapeCsv = (value) => {
            const text = String(value ?? "")
            const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
            return `"${safeText.replace(/"/g, '""')}"`
        }
        const rows = [
            ["Resume file", "Combined fit", "Cosine similarity", "Required-skill match", "Matched skills", "Skill gaps", "Matched job keywords", "Missing job keywords"],
            ...batchResult.candidates.map((candidate) => [
                candidate.fileName,
                candidate.fitScore,
                candidate.cosineScore,
                candidate.keywordScore,
                candidate.matchedSkills.join("; "),
                candidate.missingSkills.join("; "),
                candidate.keywords.matched.join("; "),
                candidate.keywords.missing.join("; ")
            ])
        ]
        const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")
        const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }))
        const link = document.createElement("a")
        link.href = url
        link.download = `resume-shortlist-${batchResult.job.id}.csv`
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    const filteredCandidates = (batchResult?.candidates || []).filter((candidate) => (
        candidate.fitScore >= Number(minimumFit)
        && candidate.fileName.toLowerCase().includes(batchSearch.trim().toLowerCase())
    ))
    const totalApplicants = jobs.reduce((total, job) => total + (job.applicantCount || 0), 0)
    const activeJob = jobs.find((job) => job._id === activeJobId)
    const topFitCount = batchResult?.candidates.filter((candidate) => candidate.fitScore >= 70).length || 0
    const averageFit = batchResult?.candidates.length
        ? Math.round(batchResult.candidates.reduce((total, candidate) => total + candidate.fitScore, 0) / batchResult.candidates.length)
        : 0

    return (
        <main className="ats-page recruiter-page">
            <WorkspaceNav />
            <section className="ats-hero recruiter-hero">
                <span className="ats-eyebrow">Talent, thoughtfully matched</span>
                <h1>Build your <span>team.</span></h1>
                <p>Publish a role, review ATS skill matches, and move candidates through a clear hiring pipeline.</p>
                <div className="ats-hero__stats">
                    <div><strong>{jobs.length}</strong><span>Open roles</span></div>
                    <div><strong>{totalApplicants}</strong><span>Total applicants</span></div>
                    <div><strong>{applications.filter((item) => item.status === "shortlisted").length}</strong><span>Shortlisted</span></div>
                </div>
            </section>

            {error && <div className="ats-alert ats-alert--error" role="alert">{error}</div>}
            {notice && <div className="ats-alert ats-alert--success" role="status">{notice}</div>}

            <div className="recruiter-grid">
                <section className="ats-section create-job">
                    <div className="ats-section__heading"><div><span className="ats-eyebrow">Start hiring</span><h2>Post a role</h2></div></div>
                    <form className="job-form" onSubmit={handleCreateJob}>
                        <label>Job title<input required maxLength="120" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Senior Product Designer" /></label>
                        <div className="job-form__row">
                            <label>Company<input required maxLength="120" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name" /></label>
                            <label>Location<input required maxLength="120" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="City or remote" /></label>
                        </div>
                        <label>Role description<textarea required maxLength="10000" rows="5" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe responsibilities, expectations, and what makes this role exciting." /></label>
                        <label>Required skills <span className="field-hint">Comma-separated; used for resume matching</span><input required value={form.requiredSkills} onChange={(event) => setForm({ ...form, requiredSkills: event.target.value })} placeholder="React, TypeScript, accessibility" /></label>
                        <button className="ats-primary-button" type="submit" disabled={saving}>{saving ? "Publishing..." : "Publish job"}</button>
                    </form>
                </section>

                <section className="ats-section pipeline-section">
                    <div className="ats-section__heading">
                        <div><span className="ats-eyebrow">Applicant tracking system</span><h2>Talent pipeline</h2></div>
                        <span className="ats-count">{applications.length} candidates</span>
                    </div>
                    {jobs.length > 0 && (
                        <label className="job-select-label">Select a role
                            <select value={activeJobId} onChange={(event) => {
                                setActiveJobId(event.target.value)
                                setBatchResult(null)
                                setZipFile(null)
                            }}>
                                {jobs.map((job) => <option key={job._id} value={job._id}>{job.title} · {job.company}</option>)}
                            </select>
                        </label>
                    )}
                    {loading ? <p className="ats-empty">Loading your pipeline...</p> : !jobs.length ? (
                        <div className="ats-empty"><strong>Your hiring pipeline is ready</strong><span>Publish your first role to start receiving applications.</span></div>
                    ) : applications.length === 0 ? (
                        <div className="ats-empty"><strong>No applicants yet</strong><span>Share the role with job seekers to start your pipeline.</span></div>
                    ) : (
                        <div className="candidate-list">
                            {applications.map((application) => (
                                <article className="candidate-card" key={application._id}>
                                    <div className="candidate-card__header">
                                        <div className="candidate-avatar">{application.candidate.username.slice(0, 1).toUpperCase()}</div>
                                        <div className="candidate-identity"><h3>{application.candidate.username}</h3><a href={`mailto:${application.candidate.email}`}>{application.candidate.email}</a></div>
                                        <div className="candidate-score"><strong>{application.atsScore}%</strong><span>{application.cosineScore != null ? "combined fit" : "previous ATS score"}</span></div>
                                    </div>
                                    <div className="batch-metrics">
                                        <span>Cosine similarity <strong>{application.cosineScore ?? "—"}{application.cosineScore != null ? "%" : ""}</strong></span>
                                        <span>Required keywords <strong>{application.keywordScore ?? "—"}{application.keywordScore != null ? "%" : ""}</strong></span>
                                    </div>
                                    <div className="candidate-resume"><span>Resume</span><strong>{application.resumeFileName}</strong></div>
                                    <div className="candidate-skills">
                                        <div><span className="candidate-skills__label">Matched</span><div className="skill-list">
                                            {application.matchedSkills.length ? application.matchedSkills.map((skill) => <span className="skill-tag--matched" key={skill}>{skill}</span>) : <small>No listed skills matched</small>}
                                        </div></div>
                                        <div><span className="candidate-skills__label">Skill gaps</span><div className="skill-list">
                                            {application.missingSkills.length ? application.missingSkills.map((skill) => <span className="skill-tag--missing" key={skill}>{skill}</span>) : <small>All listed skills matched</small>}
                                        </div></div>
                                    </div>
                                    <div className="candidate-skills">
                                        <div><span className="candidate-skills__label">Job keywords found</span><div className="skill-list">
                                            {application.matchedKeywords?.length
                                                ? application.matchedKeywords.map((keyword) => <span className="skill-tag--matched" key={keyword}>{keyword}</span>)
                                                : <small>No extracted job keywords matched</small>}
                                        </div></div>
                                        <div><span className="candidate-skills__label">Job keywords missing</span><div className="skill-list">
                                            {application.missingKeywords?.length
                                                ? application.missingKeywords.map((keyword) => <span className="skill-tag--missing" key={keyword}>{keyword}</span>)
                                                : <small>No extracted keyword gaps</small>}
                                        </div></div>
                                        <div><span className="candidate-skills__label">Keywords extracted from resume</span><div className="skill-list">
                                            {application.resumeKeywords?.length
                                                ? application.resumeKeywords.map((keyword) => <span key={keyword}>{keyword}</span>)
                                                : <small>No extracted keywords available</small>}
                                        </div></div>
                                    </div>
                                    <div className="candidate-card__footer">
                                        <small>Applied {new Date(application.createdAt).toLocaleDateString()}</small>
                                        <label>Status<select value={application.status} onChange={(event) => changeStatus(application._id, event.target.value)}>
                                            {statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
                                        </select></label>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    {activeJob && <p className="ats-disclaimer">New resume-fit scores combine TF-IDF cosine similarity with required-skill keyword coverage. Older applications retain their original ATS skill score. Use scores as a review aid, not a hiring decision.</p>}
                </section>
            </div>

            <section className="ats-section resume-batch-section">
                <div className="ats-section__heading">
                    <div><span className="ats-eyebrow">Bulk candidate review</span><h2>Rank resumes from a ZIP</h2></div>
                    {batchResult && <span className="ats-count">{batchResult.candidates.length} readable resumes</span>}
                </div>
                <p className="ats-section__intro">Select one of your roles, then upload a ZIP with up to 50 PDF, DOCX, or TXT resumes. The shortlist is temporary and is not added to your applicant pipeline.</p>
                <form className="resume-batch-form" onSubmit={handleRankZip}>
                    <label className="resume-batch-input">
                        <input
                            type="file"
                            accept=".zip,application/zip"
                            onChange={(event) => {
                                setZipFile(event.target.files?.[0] || null)
                                setBatchResult(null)
                            }}
                        />
                        <span>{zipFile?.name || "Choose a ZIP file (max 10 MB)"}</span>
                    </label>
                    <button className="ats-primary-button" type="submit" disabled={ranking || loading || !activeJob}>
                        {ranking ? "Matching resumes..." : "Rank candidates"}
                    </button>
                </form>
                <p className="ats-disclaimer">Combined fit = 60% TF-IDF cosine similarity + 40% required-skill keyword coverage. Results are decision support, not an automated hiring decision.</p>

                {batchResult && (
                    <div className="resume-batch-results">
                        <div className="resume-batch-stats">
                            <div><strong>{batchResult.candidates.length}</strong><span>Readable resumes</span></div>
                            <div><strong>{topFitCount}</strong><span>Fit score 70%+</span></div>
                            <div><strong>{averageFit}%</strong><span>Average fit</span></div>
                            <div><strong>{batchResult.skippedFiles.length}</strong><span>Skipped files</span></div>
                        </div>
                        <div className="resume-batch-toolbar">
                            <label>
                                <span>Find file</span>
                                <input value={batchSearch} onChange={(event) => setBatchSearch(event.target.value)} placeholder="Search resume filename" />
                            </label>
                            <label>
                                <span>Minimum fit</span>
                                <select value={minimumFit} onChange={(event) => setMinimumFit(event.target.value)}>
                                    <option value="0">Any score</option>
                                    <option value="40">40%+</option>
                                    <option value="60">60%+</option>
                                    <option value="70">70%+</option>
                                    <option value="80">80%+</option>
                                </select>
                            </label>
                            <button className="batch-export-button" type="button" onClick={downloadBatchCsv}>Download CSV</button>
                        </div>
                        {filteredCandidates.length ? (
                            <div className="batch-candidate-list">
                                {filteredCandidates.map((candidate, index) => (
                                    <article className="batch-candidate-card" key={`${candidate.fileName}-${index}`}>
                                        <div className="batch-candidate-card__heading">
                                            <span className="batch-rank">#{batchResult.candidates.indexOf(candidate) + 1}</span>
                                            <div className="candidate-identity"><h3>{candidate.fileName}</h3><span>Resume in the uploaded archive</span></div>
                                            <div className="candidate-score"><strong>{candidate.fitScore}%</strong><span>combined fit</span></div>
                                        </div>
                                        <div className="score-track"><i style={{ width: `${candidate.fitScore}%` }} /></div>
                                        <div className="batch-metrics">
                                            <span>Cosine similarity <strong>{candidate.cosineScore}%</strong></span>
                                            <span>Required keywords <strong>{candidate.keywordScore}%</strong></span>
                                        </div>
                                        <div className="candidate-skills">
                                            <div><span className="candidate-skills__label">Matched skills</span><div className="skill-list">
                                                {candidate.matchedSkills.length
                                                    ? candidate.matchedSkills.map((skill) => <span className="skill-tag--matched" key={skill}>{skill}</span>)
                                                    : <small>No listed skills matched</small>}
                                            </div></div>
                                            <div><span className="candidate-skills__label">Skill gaps to review</span><div className="skill-list">
                                                {candidate.missingSkills.length
                                                    ? candidate.missingSkills.map((skill) => <span className="skill-tag--missing" key={skill}>{skill}</span>)
                                                    : <small>All listed skills matched</small>}
                                            </div></div>
                                        </div>
                                        <div className="candidate-skills">
                                            <div><span className="candidate-skills__label">Extracted job keywords found</span><div className="skill-list">
                                                {candidate.keywords.matched.length
                                                    ? candidate.keywords.matched.map((keyword) => <span className="skill-tag--matched" key={keyword}>{keyword}</span>)
                                                    : <small>No extracted job keywords matched exactly</small>}
                                            </div></div>
                                            <div><span className="candidate-skills__label">Extracted job keywords missing</span><div className="skill-list">
                                                {candidate.keywords.missing.length
                                                    ? candidate.keywords.missing.map((keyword) => <span className="skill-tag--missing" key={keyword}>{keyword}</span>)
                                                    : <small>All extracted job keywords matched</small>}
                                            </div></div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : <div className="ats-empty"><strong>No resumes match those filters</strong><span>Adjust the filename search or minimum fit score.</span></div>}
                        {batchResult.skippedFiles.length > 0 && (
                            <details className="batch-skipped">
                                <summary>Review {batchResult.skippedFiles.length} skipped file(s)</summary>
                                <ul>{batchResult.skippedFiles.map((item, index) => <li key={`${item.fileName}-${index}`}><strong>{item.fileName}</strong> — {item.reason}</li>)}</ul>
                            </details>
                        )}
                    </div>
                )}
            </section>
        </main>
    )
}

export default RecruiterDashboard
