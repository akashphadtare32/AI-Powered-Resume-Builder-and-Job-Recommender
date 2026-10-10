import api from "../../../services/api"

export async function getJobs() {
    const response = await api.get("/api/ats/jobs")
    return response.data.jobs
}

export async function createJob(job) {
    const response = await api.post("/api/ats/jobs", job)
    return response.data.job
}

export async function analyzeResumeFit(jobId, resumeFile) {
    const formData = new FormData()
    formData.append("resume", resumeFile)
    const response = await api.post(`/api/ats/jobs/${jobId}/analyze`, formData)
    return response.data
}

export async function matchResumeToJob(jobId, resumeFile) {
    const formData = new FormData()
    formData.append("resume", resumeFile)
    const response = await api.post(`/api/ats/jobs/${jobId}/match`, formData)
    return response.data.matchMetrics
}

export async function createAtsResume(jobId, resumeFile) {
    const formData = new FormData()
    formData.append("resume", resumeFile)
    try {
        const response = await api.post(`/api/ats/jobs/${jobId}/resume`, formData, {
            responseType: "blob"
        })
        return response.data
    } catch (error) {
        const responseBody = error.response?.data
        if (responseBody instanceof Blob && responseBody.type.includes("application/json")) {
            const responseText = await responseBody.text()
            try {
                error.response.data = JSON.parse(responseText)
            } catch {
                error.response.data = { message: responseText || error.message }
            }
        }
        throw error
    }
}

export async function rankZipResumes(jobId, zipFile) {
    const formData = new FormData()
    formData.append("candidateZip", zipFile)
    const response = await api.post(`/api/ats/jobs/${jobId}/resume-batch`, formData)
    return response.data
}

export async function applyToJob(jobId, resumeFile) {
    const formData = new FormData()
    formData.append("resume", resumeFile)
    const response = await api.post(`/api/ats/jobs/${jobId}/applications`, formData)
    return response.data.application
}

export async function getMyApplications() {
    const response = await api.get("/api/ats/applications/mine")
    return response.data.applications
}

export async function getJobApplications(jobId) {
    const response = await api.get(`/api/ats/jobs/${jobId}/applications`)
    return response.data.applications
}

export async function updateApplicationStatus(applicationId, status) {
    const response = await api.patch(`/api/ats/applications/${applicationId}/status`, { status })
    return response.data.application
}

export function getApiErrorMessage(error, fallback) {
    return error.response?.data?.message || error.message || fallback
}
