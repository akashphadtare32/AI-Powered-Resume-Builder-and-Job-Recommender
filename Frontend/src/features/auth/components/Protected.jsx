import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";
import React from 'react'

const Protected = ({ children, role }) => {
    const { loading,user } = useAuth()


    if(loading){
        return (<main><h1>Loading...</h1></main>)
    }

    if(!user){
        return <Navigate to={'/choose-workspace'} />
    }

    if (role && user.role !== role) {
        return <Navigate to={user.role === "recruiter" ? "/recruiter" : "/jobs"} replace />
    }
    
    return children
}

export default Protected