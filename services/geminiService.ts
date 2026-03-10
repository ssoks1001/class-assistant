
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

/**
 * PDF ëª…ë ¬?œì—???™ìƒ ?´ë¦„?¤ì„ ì¶”ì¶œ
 */
// Define the interface for the extraction result
export interface ExtractedStudent {
    name: string;
    grade: string;
    classNumber: string;
}

export const extractStudentNamesFromPdf = async (base64DataOnly: string, fileName: string): Promise<ExtractedStudent[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: base64DataOnly
                    }
                },
                {
                    text: `??PDF ë¬¸ì„œ(?Œì¼ëª? "${fileName}")??**?¬ëŸ¬ ë°˜ì˜ ëª…ë ¬?œê? ??Column)ë¡??˜ì—´???•íƒœ**??
                    
                    **[?˜í–‰ ë¯¸ì…˜]**
                    ê°?ë°˜ë³„ë¡??™ìƒ ëª…ë‹¨??ê·¸ë£¹?”í•´??ì¶”ì¶œ?´ì¤˜.

                    **[ë¶„ì„ ?¨ê³„]**
                    1. **?¤ë” ?¸ì‹**: ê°???Column)???¤ë”ë¥?ì°¾ì•„???™ë…„ê³?ë°??•ë³´ë¥?ë¶„ë¦¬??
                       - ê°€?¥í•œ ?•ì‹: "6-ì§„í¬ë°?, "7?™ë…„ ?í˜¸ë°?, "8-1", "6?™ë…„ 1ë°? ??
                       - ?™ë…„?€ ?«ìë§?ì¶”ì¶œ (?? "6", "7", "8")
                       - ë°˜ì? ?´ë¦„ ?ëŠ” ë²ˆí˜¸ (?? "ì§„í¬", "?í˜¸", "1", "2")
                    
                    2. **?™ìƒ ì¶”ì¶œ**: ?´ë‹¹ ë°??????í•œ ?™ìƒ ?´ë¦„?¤ì„ ë¦¬ìŠ¤?¸ë¡œ ëª¨ì•„ì¤?
                    
                    **[ì¤‘ìš” ?œì•½ ?¬í•­]**
                    - ?™ìƒ ?´ë¦„ë§?ê¹¨ë—?˜ê²Œ ì¶”ì¶œ?? (ë²ˆí˜¸, ?µê³„, '?„í•™', 'ê³?, '?©ê³„' ???œì™¸)
                    - **?™ë…„ê³?ë°˜ì„ ë°˜ë“œ??ë¶„ë¦¬**?´ì•¼ ??
                      * "6-ì§„í¬ë°? ??grade: "6", classNumber: "ì§„í¬"
                      * "7?™ë…„ ?í˜¸ë°? ??grade: "7", classNumber: "?í˜¸"
                      * "8-1" ??grade: "8", classNumber: "1"
                      * "6?™ë…„ 1ë°? ??grade: "6", classNumber: "1"
                    - **?ˆë?ë¡?* "61", "62" ê°™ì´ ?™ë…„ê³?ë°˜ì„ ë¶™ì—¬???°ì? ë§?
                    - ë°??´ë¦„???«ì??ê²½ìš° (?? "1ë°?, "2ë°?) classNumber??"1", "2"ë¡??œê¸°
                    - ë°??´ë¦„???œê???ê²½ìš° (?? "ì§„í¬ë°?, "?í˜¸ë°?) classNumber??"ì§„í¬", "?í˜¸"ë¡??œê¸°

                    **[?‘ë‹µ ?•ì‹ - Grouped JSON]**
                    \`\`\`json
                    [
                        {
                            "grade": "6",
                            "classNumber": "ì§„í¬",
                            "names": ["ê¹€ì² ìˆ˜", "?´ì˜??, ...]
                        },
                        {
                            "grade": "7",
                            "classNumber": "?í˜¸",
                            "names": ["ë°•ë???, "?•ì???, ...]
                        },
                        {
                            "grade": "8",
                            "classNumber": "1",
                            "names": ["ìµœë?ì¤€", "ê°•ì„œ??, ...]
                        }
                    ]
                    \`\`\`
                    
                    **[?˜ëª»???ˆì‹œ - ?ˆë? ?´ë ‡ê²??˜ì? ë§?]**
                    ??{ "grade": "8", "classNumber": "61" } // ?™ë…„ê³?ë°˜ì´ ë¶™ì–´?ˆìŒ
                    ??{ "grade": "61", "classNumber": "ë°? } // ?™ë…„???˜ëª»??
                    ??{ "grade": "6", "classNumber": "1" } // ?¬ë°”ë¥??•ì‹
                    
                    ?¤ì§ JSON ë°°ì—´ë§?ë°˜í™˜??`
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            grade: { type: Type.STRING },
                            classNumber: { type: Type.STRING },
                            names: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        });

        const rawData = JSON.parse(response.text || "[]");
        const groupedData = Array.isArray(rawData) ? rawData : [];

        // Flatten: Convert Grouped JSON -> Flat Student List
        const flattenedList: ExtractedStudent[] = groupedData.flatMap((group: any) => {
            const grade = group.grade || "";
            const classNumber = group.classNumber || "";
            const names = Array.isArray(group.names) ? group.names : [];

            return names.map((rawName: string) => {
                // Formatting: Clean up name string just in case
                let name = rawName.trim();
                name = name.replace(/['":]/g, "").trim();

                // Extra safety: reject if it looks like a number or header
                if (/^\d+$/.test(name) || ["?¨í•™??, "?¬í•™??, "ê³?, "?¸ì›", "?©ê³„"].some(k => name.includes(k))) {
                    return null;
                }

                return { name, grade, classNumber };
            }).filter((item): item is ExtractedStudent => item !== null);
        });

        return flattenedList;
    } catch (err) {
        console.error("Gemini Roster Extraction Error:", err);
        throw new Error("ëª…ë ¬??ë¶„ì„ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
    }
};

/**
 * PDF ë¬¸ì„œ ?´ìš© ë¶„ì„ (?„ìš”???´ë? ?¸ì¶œ??
 */
export const analyzePdfContent = async (base64DataOnly: string, fileName: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: base64DataOnly
                    }
                },
                {
                    text: `??PDF ?Œì¼(${fileName})???´ìš©???•ì¸?˜ê³  ë¶„ì„???„ë£Œ?ˆìŒ???Œë ¤ì¤?`
                }
            ]
        });
        return response.text || "ë¶„ì„ ?„ë£Œ";
    } catch (err) {
        console.error("Gemini API Error:", err);
        throw new Error("AI ë¶„ì„ ?„ì¤‘ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
    }
};

/**
 * ?˜ì—… ì¶©ì‹¤??ë°?ì§€?œë³„ ?ì„¸ ?¼ë“œë°??ì„±
 */
export const analyzeLessonFidelity = async (
    transcript: string,
    plan: string,
    referenceDocuments?: string[] // Gemini File URIs
): Promise<any> => {
    try {
        // Input validation: check if transcript is too short
        const trimmedTranscript = transcript.trim();
        const wordCount = trimmedTranscript.split(/\s+/).filter(w => w.length > 0).length;

        if (trimmedTranscript.length < 50 || wordCount < 10) {
            return {
                achievementAlignment: {
                    score: 0,
                    feedback: "?¹ìŒ???´ìš©???ˆë¬´ ì§§ìŠµ?ˆë‹¤. ìµœì†Œ 10ê°??´ìƒ???¨ì–´?€ 50???´ìƒ???˜ì—… ?´ìš©???¹ìŒ?´ì£¼?¸ìš”."
                },
                contentAccuracy: {
                    score: 0,
                    feedback: "ë¶„ì„???´ìš©??ë¶€ì¡±í•©?ˆë‹¤. ì¶©ë¶„???˜ì—… ?´ìš©???¹ìŒ?????¤ì‹œ ?œë„?´ì£¼?¸ìš”."
                },
                interactionQuality: {
                    score: 0,
                    feedback: "?™ìƒê³¼ì˜ ?í˜¸?‘ìš©???•ì¸?????†ìŠµ?ˆë‹¤."
                },
                inDepthAnalysis: `?¹ìŒ ?´ìš©???ˆë¬´ ì§§ìŠµ?ˆë‹¤ (${wordCount}ê°??¨ì–´, ${trimmedTranscript.length}??. ?¤ì œ ?˜ì—… ?´ìš©??ì¶©ë¶„???¹ìŒ?????¤ì‹œ ë¶„ì„?´ì£¼?¸ìš”.`
            };
        }

        // API ???•ì¸
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("??VITE_GEMINI_API_KEYê°€ ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ??");
            throw new Error("API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? Vercel ?˜ê²½ ë³€??VITE_GEMINI_API_KEY)ë¥??•ì¸?´ì£¼?¸ìš”.");
        }

        // Build contents array with transcript, plan, and reference documents
        const contents: any[] = [];

        // Add reference documents if provided
        if (referenceDocuments && referenceDocuments.length > 0) {
            for (const fileUri of referenceDocuments) {
                contents.push({
                    fileData: {
                        fileUri: fileUri
                    }
                });
            }
        }

        // Build prompt based on available data
        const achievementText = plan
            ? `?¨ì› ì§€??ê³„íš ?ëŠ” ?±ì·¨ê¸°ì?: ${plan}`
            : '**ì£¼ì˜**: ?±ì·¨ê¸°ì? ?•ë³´ê°€ ?œê³µ?˜ì? ?Šì•˜?µë‹ˆ?? ?¼ë°˜?ì¸ ?˜ì—… ?ˆì§ˆ ì¸¡ë©´?ì„œë§?ë¶„ì„?´ì£¼?¸ìš”.';

        const referenceText = referenceDocuments && referenceDocuments.length > 0
            ? '\n?„ì— ì²¨ë???êµìœ¡ê³¼ì • ë¬¸ì„œ?¤ì„ ì°¸ê³ ?˜ì—¬ ë¶„ì„?´ì£¼?¸ìš”.'
            : '';

        // Add the analysis prompt
        contents.push(`
        ?˜ì—… ?¹ì·¨ë¡? ${trimmedTranscript}
        ${achievementText}
        ${referenceText}

        ???°ì´?°ë? **ë§¤ìš° ?„ê²©?˜ê²Œ** ë¶„ì„?˜ì—¬ '?˜ì—… ??Ÿ‰ ë¶„ì„ ë¦¬í¬??ë¥?JSON ?•ì‹?¼ë¡œ ?‘ì„±?´ì¤˜.
        
        **[?µì‹¬ ?ì¹™ - ?ˆë? ì¤€??**:
        - ë°˜ë“œ???„ì— ?œê³µ??'?˜ì—… ?¹ì·¨ë¡?ê³?'?¨ì› ì§€??ê³„íš' ?ìŠ¤?¸ë§Œ??ê·¼ê±°ë¡?ë¶„ì„?˜ì„¸??
        - ?¹ì·¨ë¡ì— ëª…ì‹œ?˜ì? ?Šì? ?´ìš©?€ ?ˆë? ì¶”ì¸¡?˜ê±°???¼ë°˜?ì¸ ì§€?ìœ¼ë¡?ë³´ì™„?˜ì? ë§ˆì„¸??
        - ?•ì¸?????†ëŠ” ?´ìš©?€ "?¹ì·¨ë¡ì—???•ì¸?˜ì? ?ŠìŒ"?¼ë¡œ ëª…ì‹œ?˜ì„¸??
        - AI??ë°°ê²½ ì§€?ì´???¼ë°˜?ì¸ ?˜ì—… ?ì‹?¼ë¡œ ë¹ˆì¹¸??ì±„ìš°???‰ìœ„ë¥?ê¸ˆì??©ë‹ˆ??
        
        **[ì¤‘ìš”] ?¸ì–´ ?¤ì •**:
        - ëª¨ë“  ?‘ë‹µ?€ ë°˜ë“œ???œê?ë¡??‘ì„±?´ì£¼?¸ìš”.
        - ?ì–´???¤ë¥¸ ?¸ì–´ë¥??¬ìš©?˜ì? ë§ˆì„¸??
        
        **[ì¤‘ìš”] ?‰ê? ?ì¹™ - ë°˜ë“œ??ì¤€??*:
        - ?¹ì·¨ë¡ì´ 100?¨ì–´ ë¯¸ë§Œ?´ë©´ ëª¨ë“  ?ìˆ˜ 3???´í•˜
        - ?´ìš©??ë¶€?¤í•˜ê±°ë‚˜ ì§§ìœ¼ë©???? ?ìˆ˜ë¥?ë¶€?¬í•˜?¸ìš”
        - ?™ìƒ ?í˜¸?‘ìš©(?´ë¦„ ?¸ê¸‰, ë°œí‘œ, ì§ˆë¬¸)??ëª…í™•???•ì¸?˜ì? ?Šìœ¼ë©?interactionQuality??3???´í•˜
        - êµìœ¡ê³¼ì • ?±ì·¨ê¸°ì?ê³?ë¬´ê????´ìš©?´ë©´ achievementAlignment??3???´í•˜
        - ?¤ê°œ?ì´??ë¶€?•í™•???´ìš©???ˆìœ¼ë©?contentAccuracy 5???´í•˜
        - ?¨ìˆœ??ì¡´ì¬ë§Œìœ¼ë¡??ìˆ˜ë¥?ì£¼ì? ë§ê³ , ?¤ì œ ?ˆì§ˆ???„ê²©?˜ê²Œ ?‰ê??˜ì„¸??
        - ?•ì‹?ì´ê±°ë‚˜ ?œë©´?ì¸ ?˜ì—…?€ ??? ?ìˆ˜
        
        [?„ìˆ˜ ?¬í•¨ ??ª©]
        1. achievementAlignment (êµìœ¡ê³¼ì • ?±ì·¨ê¸°ì? ?•í•©??: ?ìˆ˜(10??ë§Œì )?€ ?ì„¸ ?¼ë“œë°?
           - ?¼ë“œë°±ì—??ë°˜ë“œ???¹ì·¨ë¡ì—??ë°œê²¬??êµ¬ì²´?ì¸ ë°œí™” ?´ìš©???¸ìš©?˜ì„¸??
           ${!plan ? '- ?±ì·¨ê¸°ì????†ìœ¼ë¯€ë¡??¼ë°˜?ì¸ êµìœ¡ëª©í‘œ ?¬ì„±?„ë? ?‰ê??´ì£¼?¸ìš”.' : ''}
        2. contentAccuracy (?´ìš© ?•í™•??ë°??¤ê°œ??ë¶„ì„): ?ìˆ˜(10??ë§Œì )?€ ?ì„¸ ?¼ë“œë°?
           - ?¹ì·¨ë¡ì— ?¤ì œë¡??±ì¥???´ìš©ë§??‰ê??˜ê³ , ?†ëŠ” ?´ìš©?€ ?¸ê¸‰?˜ì? ë§ˆì„¸??
        3. interactionQuality (ë°œí™” ?ì ˆ??ë°??í˜¸?‘ìš©): ?ìˆ˜(10??ë§Œì )?€ ?ì„¸ ?¼ë“œë°?
           - ?™ìƒ ?´ë¦„??ëª…í™•???¸ê¸‰?˜ê±°???™ìƒ ë°œí‘œ/ì§ˆë¬¸???ˆì–´???’ì? ?ìˆ˜
           - êµì‚¬ ?¼ì ë§í•˜??ê²½ìš° 5???´í•˜
           - ?¹ì·¨ë¡ì—???•ì¸???í˜¸?‘ìš©ë§?ê·¼ê±°ë¡??¬ìš©?˜ì„¸??
        4. inDepthAnalysis (ì¢…í•© ?¬ì¸µ ë¶„ì„): ??ì§€?œë“¤???„ìš°ë¥´ëŠ” 400~700???¬ì´???„ë¬¸?ì¸ ?¼ë“œë°?
           - ë°˜ë“œ???¹ì·¨ë¡ì—??ì§ì ‘ ?•ì¸???´ìš©ë§Œì„ ê·¼ê±°ë¡??‘ì„±?˜ì„¸??
           - "~?ˆì„ ê²ƒìœ¼ë¡?ë³´ì…?ˆë‹¤", "~ë¡?ì¶”ì¸¡?©ë‹ˆ?? ê°™ì? ì¶”ì¸¡ ?œí˜„ ?¬ìš© ê¸ˆì?.
      `);

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        achievementAlignment: {
                            type: Type.OBJECT,
                            properties: {
                                score: { type: Type.NUMBER },
                                feedback: { type: Type.STRING }
                            },
                            required: ["score", "feedback"]
                        },
                        contentAccuracy: {
                            type: Type.OBJECT,
                            properties: {
                                score: { type: Type.NUMBER },
                                feedback: { type: Type.STRING }
                            },
                            required: ["score", "feedback"]
                        },
                        interactionQuality: {
                            type: Type.OBJECT,
                            properties: {
                                score: { type: Type.NUMBER },
                                feedback: { type: Type.STRING }
                            },
                            required: ["score", "feedback"]
                        },
                        inDepthAnalysis: { type: Type.STRING }
                    },
                    required: ["achievementAlignment", "contentAccuracy", "interactionQuality", "inDepthAnalysis"]
                }
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("??Lesson Fidelity Analysis Error:", errorMessage);

        // ì°¸ê³  ë¬¸ì„œ URIê°€ ë§Œë£Œ/?¤ë¥˜??ê²½ìš° ??ì°¸ê³  ë¬¸ì„œ ?†ì´ ?¬ì‹œ??(?´ë°±)
        if (referenceDocuments && referenceDocuments.length > 0 &&
            (errorMessage.includes('FILE_NOT_FOUND') ||
             errorMessage.includes('invalid') ||
             errorMessage.includes('expired') ||
             errorMessage.includes('404') ||
             errorMessage.includes('FAILED_PRECONDITION') ||
             errorMessage.toLowerCase().includes('file') ||
             errorMessage.includes('permission'))) {
            console.warn("? ï¸ ì°¸ê³  ë¬¸ì„œ URI ?¤ë¥˜. ì°¸ê³  ë¬¸ì„œ ?†ì´ ?¬ì‹œ?„í•©?ˆë‹¤...");
            return analyzeLessonFidelity(transcript, plan, undefined);
        }

        return {
            achievementAlignment: { score: 0, feedback: `ë¶„ì„ ?¤ë¥˜: ${errorMessage.slice(0, 80)}` },
            contentAccuracy: { score: 0, feedback: "?°ì´?°ë? ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤." },
            interactionQuality: { score: 0, feedback: "?¤ì‹œ ?œë„?´ì£¼?¸ìš”." },
            inDepthAnalysis: `AI ë¶„ì„ ê²°ê³¼ë¥??ì„±?˜ëŠ” ?„ì¤‘ ê¸°ìˆ ?ì¸ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.\n\n[?¤ë¥˜ ?´ìš©]: ${errorMessage}\n\n[ê°€?¥í•œ ?ì¸]:\n??API ?¤ê? Vercel ?˜ê²½ ë³€?˜ì— ?¤ì •?˜ì? ?Šì? ê²½ìš°\n??API ?¬ìš© ?œë„ ì´ˆê³¼\n??êµìœ¡ê³¼ì • ?ë£Œ?¤ì˜ PDF ?Œì¼ ë§í¬ê°€ ë§Œë£Œ??ê²½ìš° (48?œê°„ ???ë™ ?? œ)\n\n[?´ê²° ë°©ë²•]: Vercel ?€?œë³´????Settings ??Environment Variables?ì„œ VITE_GEMINI_API_KEYë¥??•ì¸?´ì£¼?¸ìš”.`
        };
    }
};

/**
 * ?™ìƒë³??„ì  ê¸°ë¡??ë°”íƒ•?¼ë¡œ ìµœì¢… ?¸íŠ¹ ?‘ì„±
 */
export const generateFinalReport = async (studentName: string, history: any[]): Promise<string> => {
    try {
        const historyText = history.map(h => `[${h.date}] ${h.lessonTitle}: ${h.note}`).join('\n');
        const prompt = `
      ?™ìƒ ?´ë¦„: ${studentName}
      ???™ê¸° ?„ì  ê´€ì°?ê¸°ë¡:
      ${historyText}

      **[?µì‹¬ ?ì¹™ - ?ˆë? ì¤€??**:
      - ë°˜ë“œ???„ì— ?œê³µ??'???™ê¸° ?„ì  ê´€ì°?ê¸°ë¡'???¤ì œë¡?ê¸°ë¡???´ìš©ë§Œì„ ê·¼ê±°ë¡??‘ì„±?˜ì„¸??
      - ê¸°ë¡???†ëŠ” ?´ìš©??ì¶”ì¸¡?˜ê±°???¼ë°˜?ì¸ ?™ìƒ ?¹ì„±?¼ë¡œ ë³´ì™„?˜ëŠ” ê²ƒì„ ê¸ˆì??©ë‹ˆ??
      - ê¸°ë¡??ì¶©ë¶„?˜ì? ?Šì•„ ?•ì¸?????†ëŠ” ë¶€ë¶„ì? ?”ì§?˜ê²Œ "ê´€ì°?ê¸°ë¡ ë¶€ì¡±ìœ¼ë¡??•ì¸ ë¶ˆê?"ë¡??œì‹œ?˜ì„¸??
      - "~?ˆì„ ê²ƒìœ¼ë¡?ë³´ì…?ˆë‹¤", "~ë¡?ê¸°ë??©ë‹ˆ?? ê°™ì? ì¶”ì¸¡ ?œí˜„ ?¬ìš© ê¸ˆì?.

      ???„ì  ê¸°ë¡??ë°”íƒ•?¼ë¡œ ?í™œê¸°ë¡ë¶€ 'êµê³¼ë³??¸ë??¥ë ¥ ë°??¹ê¸°?¬í•­'???¤ì–´ê°?ìµœì¢… ì¢…í•© ë³´ê³ ?œë? ?‘ì„±?´ì¤˜.
      ?±ì·¨ê¸°ì? ?¬ì„± ?¬ë??€ ?™ìƒ???±ì¥ ë³€?”ê? ???œëŸ¬?˜ì•¼ ?? (??400???´ì™¸, ?‰ì–´ì²?
      ë°˜ë“œ??ê¸°ë¡?ì„œ ?•ì¸??êµ¬ì²´?ì¸ ?¬ë?ë¥??¸ìš©?˜ì—¬ ?‘ì„±??ê²?
      ëª¨ë“  ?‘ë‹µ?€ ?œê?ë¡??‘ì„±.
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text || "ì¢…í•© ë³´ê³ ???ì„± ?¤íŒ¨";
    } catch (error) {
        console.error(error);
        return "AI ?ì„± ì¤??¤ë¥˜ ë°œìƒ";
    }
};

export const generateStudentReport = async (studentName: string, observationData: any): Promise<string> => {
    try {
        const prompt = `
      ?™ìƒ ?´ë¦„: ${studentName}
      ê´€ì°??´ìš©: ${observationData.questionLevel.description}
      ?±ì¥ ?¬ì¸?? ${observationData.growthPoint.title}

      **[?µì‹¬ ?ì¹™ - ?ˆë? ì¤€??**:
      - ë°˜ë“œ???„ì— ?œê³µ??'ê´€ì°??´ìš©'ê³?'?±ì¥ ?¬ì¸????ê¸°ë¡???¬ì‹¤ë§Œì„ ê·¼ê±°ë¡??‘ì„±?˜ì„¸??
      - ê´€ì°?ê¸°ë¡???†ëŠ” ?´ìš©(?? ?™ìƒ???±ê²©, ?œë„, ë¯¸ë˜ ê°€?¥ì„± ????ì¶”ì¸¡?˜ì? ë§ˆì„¸??
      - "~??ê²ƒìœ¼ë¡?ê¸°ë??©ë‹ˆ?? ê°™ì? ì¶”ì¸¡ ?œí˜„ ê¸ˆì?.
      - ëª¨ë“  ?‘ë‹µ?€ ?œê?ë¡??‘ì„±.

      ?„ë¬¸???‰ì–´ì²´ë¡œ ???¨ë½ ì´ˆì•ˆ ?‘ì„±?´ì¤˜.
    `;
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
        });
        return response.text || "ì´ˆì•ˆ ?ì„± ?¤íŒ¨";
    } catch (error) {
        console.error(error);
        return "AI ?ì„± ì¤??¤ë¥˜ ë°œìƒ";
    }
};

/**
 * ?˜ì—… ?¹ì·¨ë¡ì—???™ìƒ ?´ë¦„ê³??í˜¸?‘ìš© ?´ìš©???ë™?¼ë¡œ ì¶”ì¶œ
 */
export interface StudentInteraction {
    studentName: string;
    interaction: string;
}

export const extractStudentInteractions = async (
    transcript: string,
    studentNames: string[]
): Promise<StudentInteraction[]> => {
    try {
        if (!transcript || studentNames.length === 0) {
            return [];
        }

        const prompt = `
?˜ì—… ?¹ì·¨ë¡?
${transcript}

?™ìƒ ëª…ë‹¨:
${studentNames.join(', ')}

**[?µì‹¬ ?ì¹™ - ?ˆë? ì¤€??**:
- ë°˜ë“œ???„ì˜ '?˜ì—… ?¹ì·¨ë¡? ?ìŠ¤?¸ì— ?¤ì œë¡??±ì¥?˜ëŠ” ?´ìš©ë§?ì¶”ì¶œ?˜ì„¸??
- ?¹ì·¨ë¡ì— ëª…ì‹œ?˜ì? ?Šì? ?™ìƒ ?œë™?€ ?ˆë? ì¶”ì¸¡?˜ê±°??ì¶”ê??˜ì? ë§ˆì„¸??
- ?™ìƒ ?´ë¦„???¹ì·¨ë¡ì— ì§ì ‘ ?¸ê¸‰??ê²½ìš°?ë§Œ ?¬í•¨?˜ì„¸??
- ?¹ì·¨ë¡ì— ?†ëŠ” ?´ìš©???ìƒ?˜ê±°???¼ë°˜?ì¸ ?˜ì—… ?¨í„´?¼ë¡œ ë³´ì™„ ê¸ˆì?.

**?„ë¬´**: ?¹ì·¨ë¡ì—???™ìƒ?¤ì˜ ?œë™?´ë‚˜ ë°œí‘œ, ?í˜¸?‘ìš©???¸ê¸‰??ë¶€ë¶„ì„ ì°¾ì•„ ì¶”ì¶œ?´ì£¼?¸ìš”.

**ì¶œë ¥ ?•ì‹**: JSON ë°°ì—´
ê°???ª©?€ { "studentName": "?™ìƒ?´ë¦„", "interaction": "?í˜¸?‘ìš© ?´ìš©" } ?•ì‹

**?ˆì‹œ**:
- "ê¹€ì² ìˆ˜ê°€ ?°ì—…?ëª…???€??ë°œí‘œ?ˆìŠµ?ˆë‹¤" ??{ "studentName": "ê¹€ì² ìˆ˜", "interaction": "?°ì—…?ëª…???€??ë°œí‘œ?? }
- "?´ì˜?¬ê? ì¢‹ì? ì§ˆë¬¸???ˆì–´?? ??{ "studentName": "?´ì˜??, "interaction": "?˜ì—… ì°¸ì—¬ ë°?ì§ˆë¬¸?? }

**ì£¼ì˜?¬í•­**:
- ëª…ë‹¨???ˆëŠ” ?™ìƒ ?´ë¦„ë§?ì¶”ì¶œ
- ?¤ì œë¡??¹ì·¨ë¡ì— ?¸ê¸‰???™ìƒë§??¬í•¨ (?†ìœ¼ë©?ë¹?ë°°ì—´ ë°˜í™˜)
- ?í˜¸?‘ìš© ?´ìš©?€ ?¹ì·¨ë¡ì˜ ?¤ì œ ë°œí™”ë¥??”ì•½ (30???´ë‚´)
`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            studentName: { type: Type.STRING },
                            interaction: { type: Type.STRING }
                        },
                        required: ["studentName", "interaction"]
                    }
                }
            }
        });

        const result = JSON.parse(response.text || "[]");
        return Array.isArray(result) ? result : [];
    } catch (error) {
        console.error('Student interaction extraction error:', error);
        return [];
    }
};
