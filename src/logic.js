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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

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

    // Clean response if it contains markdown markers
    const cleanedText = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedText);
}

// --- Main Analysis Function ---
export async function analyzeIncident(incidentDescription) {
    const singlePrompt = `
You are a Kala Pola assistant and incident advisor.

TASK:
1. Determine if the user's message is an incident (complaints, conflicts, safety, operational issues) or a general query (greetings, info).
2. If it's a GENERAL QUERY: Return a friendly, helpful conversational message. Mention you help analyze incidents at Kala Pola.
3. If it's an INCIDENT: 
   - Assess likelihood and impact (Low/Medium/High) using internal knowledge of event guidelines.
   - Provide ONE IMMEDIATE, FLEXIBLE, and ACTIONABLE message (2-4 sentences) telling them exactly what to do.

REFERENCE (Internal only):
Table 1 (Likelihood/Impact): ${JSON.stringify(TABLE_1)}
Table 2 (Response Guidelines): ${JSON.stringify(TABLE_2)}

RETURN JSON FORMAT:
{
  "isGeneralQuery": boolean,
  "likelihood": "Low/Medium/High" (only if incident),
  "impact": "Low/Medium/High" (only if incident),
  "message": "The final response message (general or incident-specific)"
}
`.trim();

    const result = await callGeminiJSON(singlePrompt, incidentDescription);

    // Normalize response for App.jsx compatibility
    return {
        ...result,
        // Ensure legacy field isGeneralQuery is respected if AI uses isIncident logic
        isGeneralQuery: result.isGeneralQuery ?? !result.likelihood
    };
}
