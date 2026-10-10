const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const upload = require("../middlewares/file.middleware")
const zipUpload = require("../middlewares/zipUpload.middleware")
const atsController = require("../controllers/ats.controller")

const atsRouter = express.Router()

atsRouter.use(authMiddleware.authUser)

atsRouter.get("/jobs", atsController.listJobs)
atsRouter.post("/jobs", authMiddleware.requireRole("recruiter"), atsController.createJob)
atsRouter.post(
    "/jobs/:jobId/resume-batch",
    authMiddleware.requireRole("recruiter"),
    zipUpload,
    atsController.rankZipResumes
)
atsRouter.post(
    "/jobs/:jobId/analyze",
    authMiddleware.requireRole("user"),
    upload.single("resume"),
    atsController.analyzeResumeFit
)
atsRouter.post(
    "/jobs/:jobId/match",
    authMiddleware.requireRole("user"),
    upload.single("resume"),
    atsController.matchResumeToJob
)
atsRouter.post(
    "/jobs/:jobId/resume",
    authMiddleware.requireRole("user"),
    upload.single("resume"),
    atsController.createAtsResume
)
atsRouter.post(
    "/jobs/:jobId/applications",
    authMiddleware.requireRole("user"),
    upload.single("resume"),
    atsController.applyToJob
)
atsRouter.get("/applications/mine", authMiddleware.requireRole("user"), atsController.listMyApplications)
atsRouter.get(
    "/jobs/:jobId/applications",
    authMiddleware.requireRole("recruiter"),
    atsController.listJobApplications
)
atsRouter.patch(
    "/applications/:applicationId/status",
    authMiddleware.requireRole("recruiter"),
    atsController.updateApplicationStatus
)

module.exports = atsRouter
