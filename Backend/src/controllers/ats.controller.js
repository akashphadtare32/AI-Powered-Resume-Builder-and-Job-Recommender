const mongoose = require("mongoose")
const Application = require("../models/application.model")
const Job = require("../models/job.model")
const { extractResumeText } = require("../services/resume.service")
const { analyzeResumeJobFit } = require("../services/ai.service")
const { scoreResumeForJob } = require("../services/resumeMatch.service")
const { readResumeFilesFromZip } = require("../services/resumeZip.service")
const { generateAtsResumePdf } = require("../services/atsResume.service")

const allowedResumeExtension = /\.(pdf|docx|txt)$/i

function normalizeSkill(skill) {
    return String(skill).toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim()
}

async function getMatchableResumeText(req, res, action) {
    if (!req.file || !allowedResumeExtension.test(req.file.originalname)) {
        res.status(400).json({ message: `Upload a PDF, DOCX, or TXT resume to ${action}.` })
        return null
    }

    let resumeText
    try {
        resumeText = await extractResumeText(req.file)
    } catch (error) {
        res.status(400).json({ message: "The resume could not be read. Please check the file and try again." })
        return null
    }
    if (!resumeText.trim()) {
        res.status(400).json({ message: "No readable text was found in that resume." })
        return null
    }
    if (resumeText.length > 30000) {
        res.status(413).json({ message: "This resume is too long to analyze. Please use a version under 30,000 characters." })
        return null
    }

    return resumeText
}

async function createJob(req, res) {
    const { title, company, location, description, requiredSkills } = req.body || {}

    if (![title, company, location, description].every((value) => typeof value === "string" && value.trim())) {
        return res.status(400).json({ message: "Add a job title, company, location, and description." })
    }

    const skills = (Array.isArray(requiredSkills) ? requiredSkills : String(requiredSkills || "").split(","))
        .map((skill) => String(skill).trim())
        .filter((skill) => normalizeSkill(skill))
        .slice(0, 40)

    if (!skills.length) {
        return res.status(400).json({ message: "Add at least one required skill for ATS matching." })
    }

    const job = await Job.create({
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        description: description.trim(),
        requiredSkills: [...new Map(skills.map((skill) => [normalizeSkill(skill), skill])).values()],
        createdBy: req.user.id
    })

    return res.status(201).json({ job })
}

async function listJobs(req, res) {
    const recruiter = req.user.role === "recruiter"
    const jobs = await Job.find(recruiter
        ? { createdBy: req.user.id }
        : { active: true })
        .sort({ createdAt: -1 })
        .lean()

    const jobIds = jobs.map((job) => job._id)
    const counts = await Application.aggregate([
        { $match: { job: { $in: jobIds } } },
        { $group: { _id: "$job", count: { $sum: 1 } } }
    ])
    const countByJob = new Map(counts.map((item) => [String(item._id), item.count]))

    let applicationByJob = new Map()
    if (!recruiter) {
        const applications = await Application.find({ candidate: req.user.id, job: { $in: jobIds } })
            .select("job status")
            .lean()
        applicationByJob = new Map(applications.map((application) => [String(application.job), application.status]))
    }

    return res.status(200).json({
        jobs: jobs.map((job) => ({
            ...job,
            applicantCount: countByJob.get(String(job._id)) || 0,
            applicationStatus: applicationByJob.get(String(job._id)) || null
        }))
    })
}

async function analyzeResumeFit(req, res) {
    const { jobId } = req.params
    if (!mongoose.isValidObjectId(jobId)) {
        return res.status(400).json({ message: "Invalid job." })
    }

    const job = await Job.findOne({ _id: jobId, active: true }).lean()
    if (!job) {
        return res.status(404).json({ message: "This job is no longer accepting applications." })
    }

    const resumeText = await getMatchableResumeText(req, res, "analyze")
    if (resumeText === null) return

    try {
        const analysis = await analyzeResumeJobFit({ resume: resumeText, job })
        const matchMetrics = scoreResumeForJob({ resumeText, job })
        return res.status(200).json({ analysis, matchMetrics })
    } catch (error) {
        if (error.code === "AI_NOT_CONFIGURED") {
            return res.status(503).json({ message: "AI analysis is not configured. Add GOOGLE_GENAI_API_KEY to the backend environment." })
        }
        if (error.code === "AI_GENERATION_FAILED") {
            return res.status(503).json({ message: error.message })
        }
        throw error
    }
}

async function matchResumeToJob(req, res) {
    const { jobId } = req.params
    if (!mongoose.isValidObjectId(jobId)) {
        return res.status(400).json({ message: "Invalid job." })
    }

    const job = await Job.findOne({ _id: jobId, active: true }).lean()
    if (!job) {
        return res.status(404).json({ message: "This job is no longer accepting applications." })
    }

    const resumeText = await getMatchableResumeText(req, res, "match")
    if (resumeText === null) return

    return res.status(200).json({ matchMetrics: scoreResumeForJob({ resumeText, job }) })
}

async function createAtsResume(req, res) {
    const { jobId } = req.params
    if (!mongoose.isValidObjectId(jobId)) {
        return res.status(400).json({ message: "Invalid job." })
    }

    const job = await Job.findOne({ _id: jobId, active: true }).lean()
    if (!job) {
        return res.status(404).json({ message: "This job is no longer accepting applications." })
    }

    const resumeText = await getMatchableResumeText(req, res, "format")
    if (resumeText === null) return

    const matchMetrics = scoreResumeForJob({ resumeText, job })
    const pdfBuffer = await generateAtsResumePdf({
        resume: resumeText,
        jobTitle: job.title,
        matchedKeywords: matchMetrics.keywords.matched
    })
    const fileName = `ats-resume-${job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "role"}.pdf`

    return res.status(200)
        .type("application/pdf")
        .set("Content-Disposition", `attachment; filename="${fileName}"`)
        .send(pdfBuffer)
}

async function rankZipResumes(req, res) {
    if (!req.file || !/\.zip$/i.test(req.file.originalname)) {
        return res.status(400).json({ message: "Upload a ZIP archive containing PDF, DOCX, or TXT resumes." })
    }
    if (!mongoose.isValidObjectId(req.params.jobId)) {
        return res.status(400).json({ message: "Invalid job." })
    }

    const job = await Job.findOne({ _id: req.params.jobId, createdBy: req.user.id }).lean()
    if (!job) {
        return res.status(404).json({ message: "Job not found in your recruiter workspace." })
    }

    let resumeFiles
    try {
        resumeFiles = await readResumeFilesFromZip(req.file.buffer)
    } catch (error) {
        return res.status(error.status || 400).json({ message: error.message })
    }
    if (!resumeFiles.length) {
        return res.status(400).json({ message: "No PDF, DOCX, or TXT resumes were found in the ZIP." })
    }

    const candidates = []
    const skippedFiles = []
    for (const file of resumeFiles) {
        try {
            const resumeText = await extractResumeText({
                originalname: file.fileName,
                mimetype: "",
                buffer: file.buffer
            })
            if (!resumeText.trim()) {
                skippedFiles.push({ fileName: file.fileName, reason: "No readable text found." })
                continue
            }
            if (resumeText.length > 30000) {
                skippedFiles.push({ fileName: file.fileName, reason: "Resume exceeds 30,000 characters." })
                continue
            }

            candidates.push({
                fileName: file.fileName,
                ...scoreResumeForJob({ resumeText, job })
            })
        } catch (error) {
            console.warn(`Could not read recruiter ZIP resume "${file.fileName}".`, error.message)
            skippedFiles.push({ fileName: file.fileName, reason: "File could not be read." })
        }
    }

    if (!candidates.length) {
        return res.status(422).json({
            message: "None of the supported files contained readable resume text.",
            skippedFiles
        })
    }

    candidates.sort((left, right) => right.fitScore - left.fitScore
        || right.cosineScore - left.cosineScore
        || left.fileName.localeCompare(right.fileName))
    return res.status(200).json({
        job: { id: job._id, title: job.title, company: job.company },
        scoring: { cosineWeight: 60, keywordWeight: 40 },
        candidates,
        skippedFiles
    })
}

async function applyToJob(req, res) {
    const { jobId } = req.params
    if (!mongoose.isValidObjectId(jobId)) {
        return res.status(400).json({ message: "Invalid job." })
    }
    if (!req.file || !allowedResumeExtension.test(req.file.originalname)) {
        return res.status(400).json({ message: "Upload a PDF, DOCX, or TXT resume to apply." })
    }

    const job = await Job.findOne({ _id: jobId, active: true }).lean()
    if (!job) {
        return res.status(404).json({ message: "This job is no longer accepting applications." })
    }

    const existingApplication = await Application.findOne({ job: jobId, candidate: req.user.id }).select("_id")
    if (existingApplication) {
        return res.status(409).json({ message: "You have already applied to this job." })
    }

    let resumeText
    try {
        resumeText = await extractResumeText(req.file)
    } catch (error) {
        return res.status(400).json({ message: "The resume could not be read. Please check the file and try again." })
    }
    if (!resumeText) {
        return res.status(400).json({ message: "No readable text was found in that resume." })
    }

    const match = scoreResumeForJob({ resumeText, job })

    try {
        const application = await Application.create({
            job: job._id,
            candidate: req.user.id,
            resumeText,
            resumeFileName: req.file.originalname,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            matchedKeywords: match.keywords.matched,
            missingKeywords: match.keywords.missing,
            resumeKeywords: match.keywords.resume,
            atsScore: match.fitScore,
            cosineScore: match.cosineScore,
            keywordScore: match.keywordScore
        })
        return res.status(201).json({ application })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "You have already applied to this job." })
        }
        throw error
    }
}

async function listMyApplications(req, res) {
    const applications = await Application.find({ candidate: req.user.id })
        .populate("job", "title company location")
        .select("-resumeText")
        .sort({ createdAt: -1 })
        .lean()

    return res.status(200).json({ applications })
}

async function listJobApplications(req, res) {
    const job = await Job.findOne({ _id: req.params.jobId, createdBy: req.user.id }).select("_id")
    if (!job) {
        return res.status(404).json({ message: "Job not found." })
    }

    const applications = await Application.find({ job: job._id })
        .populate("candidate", "username email")
        .select("-resumeText")
        .sort({ atsScore: -1, createdAt: -1 })
        .lean()

    return res.status(200).json({ applications })
}

async function updateApplicationStatus(req, res) {
    const { status } = req.body || {}
    const validStatuses = ["applied", "reviewing", "shortlisted", "rejected"]
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Choose a valid application status." })
    }
    if (!mongoose.isValidObjectId(req.params.applicationId)) {
        return res.status(400).json({ message: "Invalid application." })
    }

    const application = await Application.findById(req.params.applicationId).populate("job", "createdBy")
    if (!application || String(application.job.createdBy) !== String(req.user.id)) {
        return res.status(404).json({ message: "Application not found." })
    }

    application.status = status
    await application.save()
    return res.status(200).json({ application: { id: application._id, status: application.status } })
}

module.exports = {
    createJob,
    listJobs,
    analyzeResumeFit,
    matchResumeToJob,
    createAtsResume,
    rankZipResumes,
    applyToJob,
    listMyApplications,
    listJobApplications,
    updateApplicationStatus
}
