const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000
}

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */
async function registerUserController(req, res) {

    const { username, email, password, role = "user" } = req.body || {}

    if (!username || !email || !password || !["user", "recruiter"].includes(role)) {
        return res.status(400).json({
            message: "Please provide a username, email, password, and valid account type"
        })
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [{ username }, { email }]
    })

    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "Account already exists with this email address or username"
        })
    }

    const hash = await bcrypt.hash(password, 10)

    let user
    try {
        user = await userModel.create({
            username,
            email,
            password: hash,
            role
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Account already exists with this email address or username"
            })
        }
        throw error
    }

    const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET || "resume-job-recommender-secret",
        { expiresIn: "1d" }
    )

    res.cookie("token", token, authCookieOptions)

    res.status(201).json({
        message: "User registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    })
}

/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req, res) {

    const { email, password, role } = req.body || {}

    if (!email || !password || !["user", "recruiter"].includes(role)) {
        return res.status(400).json({
            message: "Please provide an email, password, and valid account type"
        })
    }

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    if (user.role !== role) {
        return res.status(403).json({
            message: `This account is registered as a ${user.role}. Choose the matching account type to sign in.`,
            userRole: user.role
        })
    }

    const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET || "resume-job-recommender-secret",
        { expiresIn: "1d" }
    )

    res.cookie("token", token, authCookieOptions)
    res.status(200).json({
        message: "User loggedIn successfully.",
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    })
}

async function changeAccountRoleController(req, res) {
    const { email, password, role } = req.body || {}

    if (!email || !password || !["user", "recruiter"].includes(role)) {
        return res.status(400).json({
            message: "Please provide your email, password, and a valid account type."
        })
    }

    const user = await userModel.findOne({ email })
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({
            message: "Invalid email or password."
        })
    }

    user.role = role
    await user.save()

    const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET || "resume-job-recommender-secret",
        { expiresIn: "1d" }
    )

    res.cookie("token", token, authCookieOptions)
    return res.status(200).json({
        message: `Account changed to ${role} successfully.`,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    })
}

/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
    const token = req.cookies.token

    if (token) {
        await tokenBlacklistModel.create({ token })
    }

    res.clearCookie("token", authCookieOptions)

    res.status(200).json({
        message: "User logged out successfully"
    })
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {
    const user = await userModel.findById(req.user.id)

    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    })
}

module.exports = {
    registerUserController,
    loginUserController,
    changeAccountRoleController,
    logoutUserController,
    getMeController
}
