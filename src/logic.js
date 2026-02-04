// --- Configuration ---
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- Table 1: Scenario Classification ---
// Categorizes incidents based on how likely they are to occur (Likelihood) 
// and how serious their consequences are (Impact)
export const TABLE_1 = {
    Low: {
        Low: [
            "Artist complains about low sales",
            "Minor signage placement disputes",
            "Single visitor complaint about crowding",
            "Delayed setup affecting one stall only",
        ],
        Medium: [
            "Artist disputes curatorial guidelines publicly",
            "Influencer records mild criticism",
            "Accessibility complaint raised publicly",
            "Visitor posts negative experience online",
        ],
        High: [
            "Physical altercation between artists",
            "Threats of vandalism",
            "Safety incident requiring emergency response",
            "Media framing incident as systemic failure",
        ],
    },
    Medium: {
        Low: [
            "Artist disputes stall allocation",
            "Power outage at individual stalls",
            "Lighting or space related complaints",
            "Artist disputes confirmation timelines",
        ],
        Medium: [
            "Raised voices between artist and volunteer",
            "Artist refuses to comply with stall rules",
            "Multiple artists raising similar complaints",
            "Crowd begins to gather around dispute",
        ],
        High: [
            "Artist goes live on social media during dispute",
            "Grouped artist protest",
            "Media interviews artist mid incident",
            "Sponsor named in negative commentary",
        ],
    },
    High: {
        Low: [
            "Artists expressing frustration verbally",
            "Repeat questions about logistics",
            "Emotional but non-aggressive reactions",
        ],
        Medium: [
            "Misinformation shared in small online circles",
            "Escalated verbal abuse",
            "Recording with intent to post",
            "Multiple negative social media posts",
            "Public questioning of fairness or transparency",
        ],
        High: [
            "Repeat offender artist raising multiple issues",
            "Coordinated complaints across volunteers",
            "Escalated verbal abuse",
            "Recording with intent to post",
            "Multiple negative social media posts",
            "Public questioning of fairness or transparency",
        ],
    },
};

// --- Table 2: Response Guidelines ---
// Defines what actions to take for each type of incident
export const TABLE_2 = {
    Low: {
        Low: {
            objective: "Keep the incident small and prevent it from disrupting the event flow.",
            onGround: "Volunteer acknowledges the issue once, then politely moves away. Only escalate if the same issue is raised again.",
            digital: "Do not respond publicly. Monitor quietly to see if it becomes a bigger issue.",
            authority: "Volunteer handles it. Supervisor is only informed if a pattern develops.",
        },
        Medium: {
            objective: "Keep the incident contained and stop it from drawing a crowd or going viral online.",
            onGround: "Supervisor takes over. Provide brief factual information if needed, then disengage.",
            digital: "Monitor social media passively. Do not respond unless a negative narrative starts forming.",
            authority: "Supervisor handles it. Foundation teams are notified for awareness.",
        },
        High: {
            objective: "Eliminate immediate safety risks and protect the event's reputation.",
            onGround: "Senior authority and Supervisor step in immediately. Contact security if there's a safety concern.",
            digital: "Prepare a statement but do not post it unless the content starts spreading widely.",
            authority: "Senior event leadership handles it. Keells and Keyt Foundations are fully informed.",
        },
    },
    Medium: {
        Low: {
            objective: "Keep the event running smoothly and ensure artists can continue without friction.",
            onGround: "Volunteer acknowledges the concern. Supervisor provides a solution only if necessary.",
            digital: "Do not respond. Just listen passively.",
            authority: "Volunteers and Supervisors handle it.",
        },
        Medium: {
            objective: "Reduce tension and prevent crowds from gathering or people from recording the incident.",
            onGround: "Supervisor takes full control. Volunteer must step back and document the incident.",
            digital: "Actively monitor social media. Prepare internal notes for potential response.",
            authority: "Supervisors handle it. Foundation communication teams are informed.",
        },
        High: {
            objective: "Protect the reputation and credibility of the partner organizations.",
            onGround: "Senior authority is present on-site. Security is engaged. Clear chain of command is enforced.",
            digital: "Coordinate response across teams. Have an approved statement ready to use if needed.",
            authority: "Kala Pola leadership and Foundation communications handle it.",
        },
    },
    High: {
        Low: {
            objective: "Maintain the organization's reputation while ignoring minor noise.",
            onGround: "Volunteers handle it routinely. Only escalate if the tone becomes aggressive.",
            digital: "Do not respond. Ignore isolated negative comments.",
            authority: "Volunteers handle it.",
        },
        Medium: {
            objective: "Stop repeat behaviors and prevent patterns from forming among troublemakers.",
            onGround: "Supervisor intervention is required. Flag repeat offenders for possible removal or disengagement.",
            digital: "Actively monitor social media. Ensure all teams are aligned on messaging.",
            authority: "Supervisors handle it. Foundation representatives are briefed.",
        },
        High: {
            objective: "Stop systematic disruption and prevent repeat offenders from causing more problems.",
            onGround: "Immediate Supervisor intervention required. Track the incident as high-risk behavior.",
            digital: "Actively monitor. Ensure internal teams agree on a single consistent message.",
            authority: "Supervisors and Foundation representatives handle it.",
        },
    },
};

// --- API Call to Gemini ---
async function callGeminiJSON(systemPrompt, userPrompt) {
    if (!GEMINI_KEY) {
        throw new Error("Missing VITE_GEMINI_API_KEY in environment variables");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_KEY}`;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: systemPrompt + "\n\nUSER INPUT:\n" + userPrompt }]
            }
        ],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2000,
            responseMimeType: "application/json",
        },
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();

        // Handle rate limiting specifically
        if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please wait a minute and try again.");
        }

        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!responseText) {
        throw new Error("No response received from Gemini API");
    }

    return JSON.parse(responseText);
}

// --- Main Analysis Function ---
export async function analyzeIncident(incidentDescription) {
    // First, check if this is actually an incident question
    const preCheckPrompt = `
You are a Kala Pola assistant. 

Analyze the user's message and determine if it's asking about an incident that needs response guidance.

Return JSON in this format:
{
  "isIncident": true/false,
  "generalResponse": "if not an incident, provide a helpful conversational response here. Otherwise leave empty."
}

Examples of incidents: artist complaints, conflicts, safety issues, social media problems, operational issues
Examples of non-incidents: greetings, general questions about Kala Pola, how are you, what can you do, etc.

If it's NOT an incident question, be friendly and helpful. Mention that you're here to help analyze incidents and provide response guidance for the Kala Pola art fair.
`.trim();

    const preCheck = await callGeminiJSON(preCheckPrompt, incidentDescription);

    // If not an incident, return the general response
    if (!preCheck.isIncident) {
        return {
            isGeneralQuery: true,
            message: preCheck.generalResponse
        };
    }

    // Otherwise, proceed with incident classification
    const systemPrompt = `
You are an incident response advisor for Kala Pola art fair.

Your task is to analyze the incident and provide ONE IMMEDIATE, FLEXIBLE, and ACTIONABLE message that tells them exactly what to do.

CONTEXT: You have access to scenario classification tables (Table 1) and response guidelines (Table 2) as background knowledge. Use these internally to assess the situation's likelihood and impact, but DO NOT simply quote them.

INSTRUCTIONS:
1. Analyze the incident description
2. Assess the severity (likelihood and impact)
3. Generate ONE SINGLE UNIFIED MESSAGE that:
   - Tells them EXACTLY what to do right now
   - Is SPECIFIC to this exact situation - not generic
   - Is natural and conversational - not bureaucratic
   - Is concise but complete (2-4 sentences)
   - Combines WHY and HOW in one cohesive response

Return your response in this JSON format:
{
  "likelihood": "Low/Medium/High",
  "impact": "Low/Medium/High",
  "message": "One single unified response telling them exactly what to do in this situation"
}

REFERENCE TABLES (use as background knowledge only):

TABLE 1 - SCENARIO CLASSIFICATION:
${JSON.stringify(TABLE_1, null, 2)}

TABLE 2 - RESPONSE GUIDELINES:
${JSON.stringify(TABLE_2, null, 2)}

Remember: Provide ONE response that's immediate, flexible, and situation-specific. Don't just copy table text.
`.trim();

    const result = await callGeminiJSON(systemPrompt, incidentDescription);
    return result;
}