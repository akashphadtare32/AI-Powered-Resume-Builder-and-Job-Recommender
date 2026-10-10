const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")

async function authUser(req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "")

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized. Please log in first."
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "resume-job-recommender-secret")
        req.user = decoded
        return next()
    }
    catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token."
        })
    }
}

function requireRole(role) {
    return async function (req, res, next) {
        try {
            const user = await userModel.findById(req.user.id).select("role")
            if (!user || user.role !== role) {
                return res.status(403).json({
                    message: "You do not have permission to access this resource."
                })
            }

            req.user.role = user.role
            return next()
        } catch (error) {
            return next(error)
        }
    }
}

module.exports = { authUser, requireRole }
