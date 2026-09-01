'use client'

import { useEffect } from 'react'
import Clarity from '@microsoft/clarity'

export default function MicrosoftClarity({ projectId: propProjectId }: { projectId?: string | null }) {
    const projectId = propProjectId || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

    useEffect(() => {
        if (projectId) {
            try {
                Clarity.init(projectId)
            } catch (error) {
                console.error('Error initializing Microsoft Clarity:', error)
            }
        }
    }, [projectId])

    return null
}

