const mongoose = require("mongoose")

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    company: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    location: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 10000
    },
    requiredSkills: [{
        type: String,
        trim: true,
        maxlength: 60
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Job", jobSchema)
