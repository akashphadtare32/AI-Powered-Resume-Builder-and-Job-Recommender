const mongoose = require("mongoose")

const applicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        index: true
    },
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true
    },
    resumeText: {
        type: String,
        required: true
    },
    resumeFileName: {
        type: String,
        required: true
    },
    atsScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    cosineScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    keywordScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    matchedSkills: [String],
    missingSkills: [String],
    matchedKeywords: [String],
    missingKeywords: [String],
    resumeKeywords: [String],
    status: {
        type: String,
        enum: ["applied", "reviewing", "shortlisted", "rejected"],
        default: "applied"
    }
}, {
    timestamps: true
})

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true })

module.exports = mongoose.model("Application", applicationSchema)
