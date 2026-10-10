import React, { useState, useEffect } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useParams } from 'react-router-dom'
import WorkspaceNav from '../../auth/components/WorkspaceNav.jsx'

const NAV_ITEMS = [
    {
        id: 'keywords',
        label: 'Keyword Match',
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /><path d="M8.5 11h5" /><path d="M11 8.5v5" /></svg>)
    },
    {
        id: 'technical',
        label: 'Technical Questions',
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>)
    },
    {
        id: 'behavioral',
        label: 'Behavioral Questions',
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>)
    },
    {
        id: 'roadmap',
        label: 'Road Map',
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>)
    }
]

const STOP_WORDS = new Set([
    'about', 'after', 'also', 'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been',
    'before', 'being', 'both', 'but', 'by', 'can', 'candidate', 'could', 'day', 'desired',
    'do', 'does', 'each', 'engineering', 'for', 'from', 'have', 'having', 'how', 'in',
    'include', 'including', 'into', 'is', 'it', 'its', 'job', 'knowledge', 'like', 'may',
    'more', 'must', 'needed', 'of', 'on', 'or', 'our', 'position', 'preferred', 'required',
    'responsibilities', 'role', 'should', 'skill', 'skills', 'such', 'team', 'than', 'that',
    'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
    'to', 'use', 'using', 'various', 'was', 'we', 'were', 'what', 'when', 'which', 'who',
    'will', 'with', 'work', 'years', 'you', 'your'
])

const extractKeywords = (text) => {
    const words = String(text || '').toLowerCase().match(/c\+\+|c#|\.net|node\.js|react\.js|[a-z][a-z0-9+#.-]*/g) || []
    return [...new Set(words.filter((word) => (
        !STOP_WORDS.has(word) && (word.length >= 3 || ['ai', 'go', 'js', 'ml', 'ux', 'ui'].includes(word))
    )))]
}

const KeywordAnalysis = ({ report }) => {
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const jobKeywords = extractKeywords(report.jobDescription)
    const profileKeywords = extractKeywords([report.resume, report.selfDescription].filter(Boolean).join(' '))
    const profileSet = new Set(profileKeywords)
    const jobSet = new Set(jobKeywords)
    const matched = jobKeywords.filter((keyword) => profileSet.has(keyword))
    const missing = jobKeywords.filter((keyword) => !profileSet.has(keyword))
    const profileOnly = profileKeywords.filter((keyword) => !jobSet.has(keyword))
    const unionSize = new Set([...jobKeywords, ...profileKeywords]).size
    const similarity = unionSize ? Math.round((matched.length / unionSize) * 100) : 0
    const displayedKeywords = (filter === 'matched' ? matched : filter === 'missing' ? missing : jobKeywords)
        .filter((keyword) => keyword.includes(search.trim().toLowerCase()))

    return (
        <section className='keyword-analysis'>
            <div className='content-header keyword-analysis__header'>
                <div>
                    <h2>Keyword extraction &amp; matching</h2>
                    <p>Compare terms found in the job description with terms in your resume or profile.</p>
                </div>
                <span className='keyword-analysis__method'>Exact normalized term match</span>
            </div>

            <div className='keyword-overview'>
                <article className='keyword-overview__similarity'>
                    <span className='summary-label'>Keyword similarity</span>
                    <strong>{similarity}%</strong>
                    <p>Jaccard similarity: shared keywords ÷ unique keywords across both texts.</p>
                    <div className='keyword-overview__track' aria-label={`Keyword similarity ${similarity}%`}>
                        <i style={{ width: `${similarity}%` }} />
                    </div>
                </article>
                <article className='keyword-stat'>
                    <span className='keyword-stat__dot keyword-stat__dot--matched' />
                    <strong>{matched.length}</strong>
                    <span>Matched</span>
                </article>
                <article className='keyword-stat'>
                    <span className='keyword-stat__dot keyword-stat__dot--missing' />
                    <strong>{missing.length}</strong>
                    <span>Job keywords missing</span>
                </article>
                <article className='keyword-stat'>
                    <span className='keyword-stat__dot keyword-stat__dot--profile' />
                    <strong>{profileOnly.length}</strong>
                    <span>Profile-only keywords</span>
                </article>
            </div>

            <div className='keyword-columns'>
                <article className='keyword-column'>
                    <div className='keyword-column__heading'>
                        <div>
                            <span className='keyword-column__eyebrow'>Recruiter panel</span>
                            <h3>Role requirements</h3>
                            <p>{jobKeywords.length} meaningful terms extracted from the job description</p>
                        </div>
                    </div>
                    <div className='keyword-controls'>
                        <label className='keyword-search'>
                            <span className='sr-only'>Search job description keywords</span>
                            <input
                                type='search'
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder='Find a keyword'
                            />
                        </label>
                        <div className='keyword-filters' aria-label='Filter job keywords'>
                            {[
                                { id: 'all', label: `All ${jobKeywords.length}` },
                                { id: 'matched', label: `Matched ${matched.length}` },
                                { id: 'missing', label: `Missing ${missing.length}` },
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    type='button'
                                    className={`keyword-filter ${filter === option.id ? 'keyword-filter--active' : ''}`}
                                    onClick={() => setFilter(option.id)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className='keyword-chips'>
                        {displayedKeywords.length ? displayedKeywords.map((keyword) => {
                            const isMatched = profileSet.has(keyword)
                            return (
                                <span key={keyword} className={`keyword-chip ${isMatched ? 'keyword-chip--matched' : 'keyword-chip--missing'}`}>
                                    <span aria-hidden='true'>{isMatched ? '✓' : '+'}</span>
                                    {keyword}
                                </span>
                            )
                        }) : (
                            <p className='keyword-empty'>
                                {jobKeywords.length ? 'No keywords match this filter.' : 'No meaningful keywords were found in the job description.'}
                            </p>
                        )}
                    </div>
                </article>

                <article className='keyword-column keyword-column--profile'>
                    <div className='keyword-column__heading'>
                        <div>
                            <span className='keyword-column__eyebrow'>User panel</span>
                            <h3>Your resume &amp; profile</h3>
                            <p>Keywords extracted from your uploaded resume or self-description</p>
                        </div>
                    </div>
                    <div className='keyword-chips'>
                        {profileKeywords.length ? profileKeywords.map((keyword) => {
                            const isMatched = jobSet.has(keyword)
                            return (
                                <span key={keyword} className={`keyword-chip ${isMatched ? 'keyword-chip--matched' : 'keyword-chip--profile'}`}>
                                    <span aria-hidden='true'>{isMatched ? '✓' : '•'}</span>
                                    {keyword}
                                </span>
                            )
                        }) : <p className='keyword-empty'>No resume or profile text is available to analyze.</p>}
                    </div>
                </article>
            </div>

            <p className='keyword-disclaimer'>
                This is a transparent text-based comparison, not a semantic AI score. Related terms with different wording may not count as a match.
            </p>
        </section>
    )
}

const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false)
    const [practiced, setPracticed] = useState(false)

    return (
        <div className={`q-card ${open ? 'q-card--open' : ''}`}>
            <div className='q-card__header' onClick={() => setOpen((value) => !value)}>
                <span className='q-card__index'>Q{index + 1}</span>
                <p className='q-card__question'>{item.question}</p>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
            </div>

            {open && (
                <div className='q-card__body'>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                    <button
                        type='button'
                        className={`q-card__action ${practiced ? 'q-card__action--active' : ''}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            setPracticed((value) => !value)
                        }}
                    >
                        {practiced ? 'Practiced ✓' : 'Mark as practiced'}
                    </button>
                </div>
            )}
        </div>
    )
}

const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks.map((task, i) => (
                <li key={i}>
                    <span className='roadmap-day__bullet' />
                    {task}
                </li>
            ))}
        </ul>
    </div>
)

const Interview = () => {
    const [activeNav, setActiveNav] = useState('keywords')
    const [selectedSkill, setSelectedSkill] = useState('')
    const { report, getReportById, loading, getResumePdf } = useInterview()
    const { interviewId } = useParams()

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        }
    }, [interviewId])

    const gapSummary = report?.skillGaps?.length > 0 ? report.skillGaps : [{ skill: 'Role fit', severity: 'low' }]
    const focusedGap = gapSummary.find((gap) => gap.skill === selectedSkill) || gapSummary[0]
    const strategyChecklist = [
        'Map your experience to the role’s must-haves',
        'Practice concise, measurable stories',
        `Prioritize ${focusedGap.skill} before the interview`,
    ]

    if (loading || !report) {
        return (
            <main className='loading-screen'>
                <h1>Loading your interview plan...</h1>
            </main>
        )
    }

    const scoreColor = report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'

    return (
        <div className='interview-page'>
            <WorkspaceNav />
            <header className='result-header'>
                <div>
                    <p className='result-header__eyebrow'>AI Interview Strategy</p>
                    <h1>{report.title || 'Target Role'}</h1>
                </div>
                <button onClick={() => getResumePdf(interviewId)} className='primary-button'>
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42L11 12.59V4a1 1 0 0 1 1-1zm-6 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1z" /></svg>
                    Download Resume
                </button>
            </header>

            <div className='result-summary'>
                <div className='summary-card summary-card--score'>
                    <span className='summary-label'>Role Fit</span>
                    <div className={`match-score__ring ${scoreColor}`}>
                        <span>{report.matchScore}</span>
                        <small>%</small>
                    </div>
                    <p>{report.matchScore >= 80 ? 'Strong alignment for this opportunity' : report.matchScore >= 60 ? 'Promising match with a few gaps to address' : 'Potential opportunity with focused prep needed'}</p>
                </div>

                <div className='summary-card'>
                    <span className='summary-label'>Interview Focus</span>
                    <strong>{report.technicalQuestions.length + report.behavioralQuestions.length}</strong>
                    <p>practice prompts prepared for you</p>
                </div>

                <div className='summary-card'>
                    <span className='summary-label'>Skill Gaps</span>
                    <strong>{gapSummary.length}</strong>
                    <p>areas to prioritize before interviews</p>
                </div>

                <div className='summary-card'>
                    <span className='summary-label'>Prep Timeline</span>
                    <strong>{report.preparationPlan.length}-day</strong>
                    <p>structured action plan</p>
                </div>
            </div>

            <div className='focus-banner'>
                <div className='focus-banner__details'>
                    <span className='focus-banner__label'>Current focus</span>
                    <h2>{focusedGap.skill}</h2>
                </div>
                <div className='focus-banner__meter'>
                    <span>Priority</span>
                    <div className='focus-banner__bar'>
                        <i style={{ width: `${report.matchScore}%` }} />
                    </div>
                </div>
            </div>

            <div className='interview-layout'>
                <nav className='interview-nav'>
                    <div className='nav-content'>
                        <p className='interview-nav__label'>Sections</p>
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </nav>

                <div className='interview-divider' />

                <main className='interview-content'>
                    {activeNav === 'keywords' && <KeywordAnalysis report={report} />}

                    {activeNav === 'technical' && (
                        <section>
                            <div className='content-header'>
                                <h2>Technical Questions</h2>
                                <span className='content-header__count'>{report.technicalQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.technicalQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'behavioral' && (
                        <section>
                            <div className='content-header'>
                                <h2>Behavioral Questions</h2>
                                <span className='content-header__count'>{report.behavioralQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.behavioralQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'roadmap' && (
                        <section>
                            <div className='content-header'>
                                <h2>Preparation Road Map</h2>
                                <span className='content-header__count'>{report.preparationPlan.length}-day plan</span>
                            </div>
                            <div className='roadmap-list'>
                                {report.preparationPlan.map((day) => (
                                    <RoadMapDay key={day.day} day={day} />
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                <aside className='interview-sidebar'>
                    <div className='skill-gaps'>
                        <p className='skill-gaps__label'>Skill Gap Identification</p>
                        <div className='skill-gaps__list'>
                            {gapSummary.map((gap, i) => (
                                <button
                                    key={i}
                                    type='button'
                                    className={`skill-tag skill-tag--${gap.severity} ${selectedSkill === gap.skill ? 'skill-tag--selected' : ''}`}
                                    onClick={() => setSelectedSkill(gap.skill)}
                                >
                                    <span>{gap.skill}</span>
                                    <small>{gap.severity}</small>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className='sidebar-card'>
                        <p className='sidebar-card__label'>Interview Strategy</p>
                        <ul>
                            {strategyChecklist.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default Interview