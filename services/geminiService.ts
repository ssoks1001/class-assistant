
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

/**
 * PDF 명렬표에서 학생 이름들을 추출
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
            model: 'gemini-2.0-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: base64DataOnly
                    }
                },
                {
                    text: `이 PDF 문서(파일명: "${fileName}")는 **여러 반의 명렬표가 열(Column)로 나열된 형태**야.
                    
                    **[수행 미션]**
                    각 반별로 학생 명단을 그룹화해서 추출해줘.

                    **[분석 단계]**
                    1. **헤더 인식**: 각 열(Column)의 헤더를 찾아서 학년과 반 정보를 분리해.
                       - 가능한 형식: "6-진희반", "7학년 석호반", "8-1", "6학년 1반" 등
                       - 학년은 숫자만 추출 (예: "6", "7", "8")
                       - 반은 이름 또는 번호 (예: "진희", "석호", "1", "2")
                    
                    2. **학생 추출**: 해당 반(열)에 속한 학생 이름들을 리스트로 모아줘.
                    
                    **[중요 제약 사항]**
                    - 학생 이름만 깨끗하게 추출해. (번호, 통계, '전학', '계', '합계' 등 제외)
                    - **학년과 반을 반드시 분리**해야 해:
                      * "6-진희반" → grade: "6", classNumber: "진희"
                      * "7학년 석호반" → grade: "7", classNumber: "석호"
                      * "8-1" → grade: "8", classNumber: "1"
                      * "6학년 1반" → grade: "6", classNumber: "1"
                    - **절대로** "61", "62" 같이 학년과 반을 붙여서 쓰지 마!
                    - 반 이름이 숫자인 경우 (예: "1반", "2반") classNumber는 "1", "2"로 표기
                    - 반 이름이 한글인 경우 (예: "진희반", "석호반") classNumber는 "진희", "석호"로 표기

                    **[응답 형식 - Grouped JSON]**
                    \`\`\`json
                    [
                        {
                            "grade": "6",
                            "classNumber": "진희",
                            "names": ["김철수", "이영희", ...]
                        },
                        {
                            "grade": "7",
                            "classNumber": "석호",
                            "names": ["박민수", "정지원", ...]
                        },
                        {
                            "grade": "8",
                            "classNumber": "1",
                            "names": ["최민준", "강서연", ...]
                        }
                    ]
                    \`\`\`
                    
                    **[잘못된 예시 - 절대 이렇게 하지 마!]**
                    ❌ { "grade": "8", "classNumber": "61" } // 학년과 반이 붙어있음
                    ❌ { "grade": "61", "classNumber": "반" } // 학년이 잘못됨
                    ✅ { "grade": "6", "classNumber": "1" } // 올바른 형식
                    
                    오직 JSON 배열만 반환해.`
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
                if (/^\d+$/.test(name) || ["남학생", "여학생", "계", "인원", "합계"].some(k => name.includes(k))) {
                    return null;
                }

                return { name, grade, classNumber };
            }).filter((item): item is ExtractedStudent => item !== null);
        });

        return flattenedList;
    } catch (err) {
        console.error("Gemini Roster Extraction Error:", err);
        throw new Error("명렬표 분석 중 오류가 발생했습니다.");
    }
};

/**
 * PDF 문서 내용 분석 (필요시 내부 호출용)
 */
export const analyzePdfContent = async (base64DataOnly: string, fileName: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: base64DataOnly
                    }
                },
                {
                    text: `이 PDF 파일(${fileName})의 내용을 확인하고 분석을 완료했음을 알려줘.`
                }
            ]
        });
        return response.text || "분석 완료";
    } catch (err) {
        console.error("Gemini API Error:", err);
        throw new Error("AI 분석 도중 오류가 발생했습니다.");
    }
};

/**
 * 수업 충실도 및 지표별 상세 피드백 생성
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
                    feedback: "녹음된 내용이 너무 짧습니다. 최소 10개 이상의 단어와 50자 이상의 수업 내용을 녹음해주세요."
                },
                contentAccuracy: {
                    score: 0,
                    feedback: "분석할 내용이 부족합니다. 충분한 수업 내용을 녹음한 후 다시 시도해주세요."
                },
                interactionQuality: {
                    score: 0,
                    feedback: "학생과의 상호작용을 확인할 수 없습니다."
                },
                inDepthAnalysis: `녹음 내용이 너무 짧습니다 (${wordCount}개 단어, ${trimmedTranscript.length}자). 실제 수업 내용을 충분히 녹음한 후 다시 분석해주세요.`
            };
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
            ? `단원 지도 계획 또는 성취기준: ${plan}`
            : '**주의**: 성취기준 정보가 제공되지 않았습니다. 일반적인 수업 품질 측면에서만 분석해주세요.';

        const referenceText = referenceDocuments && referenceDocuments.length > 0
            ? '\n위에 첨부된 교육과정 문서들을 참고하여 분석해주세요.'
            : '';

        // Add the analysis prompt
        contents.push(`
        수업 녹취록: ${trimmedTranscript}
        ${achievementText}
        ${referenceText}

        위 데이터를 **매우 엄격하게** 분석하여 '수업 역량 분석 리포트'를 JSON 형식으로 작성해줘.
        
        **[중요] 언어 설정**:
        - 모든 응답은 반드시 한글로 작성해주세요.
        - 영어나 다른 언어를 사용하지 마세요.
        
        **[중요] 평가 원칙 - 반드시 준수**:
        - 녹취록이 100단어 미만이면 모든 점수 3점 이하
        - 내용이 부실하거나 짧으면 낮은 점수를 부여하세요
        - 학생 상호작용(이름 언급, 발표, 질문)이 명확히 확인되지 않으면 interactionQuality는 3점 이하
        - 교육과정 성취기준과 무관한 내용이면 achievementAlignment는 3점 이하
        - 오개념이나 부정확한 내용이 있으면 contentAccuracy 5점 이하
        - 단순히 존재만으로 점수를 주지 말고, 실제 품질을 엄격히 평가하세요
        - 형식적이거나 표면적인 수업은 낮은 점수
        
        [필수 포함 항목]
        1. achievementAlignment (교육과정 성취기준 정합성): 점수(10점 만점)와 상세 피드백
           ${!plan ? '- 성취기준이 없으므로 일반적인 교육목표 달성도를 평가해주세요.' : ''}
        2. contentAccuracy (내용 정확성 및 오개념 분석): 점수(10점 만점)와 상세 피드백
        3. interactionQuality (발화 적절성 및 상호작용): 점수(10점 만점)와 상세 피드백
           - 학생 이름이 명확히 언급되거나 학생 발표/질문이 있어야 높은 점수
           - 교사 혼자 말하는 경우 5점 이하
        4. inDepthAnalysis (종합 심층 분석): 위 지표들을 아우르는 400~700자 사이의 전문적인 피드백
      `);

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
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
        console.error("Lesson Fidelity Analysis Error:", err);
        return {
            achievementAlignment: { score: 0, feedback: "분석 중 오류가 발생했습니다." },
            contentAccuracy: { score: 0, feedback: "데이터를 불러올 수 없습니다." },
            interactionQuality: { score: 0, feedback: "다시 시도해주세요." },
            inDepthAnalysis: "AI 분석 결과를 생성하는 도중 기술적인 오류가 발생했습니다. 잠시 후 다시 시도해주시기 바랍니다."
        };
    }
};

/**
 * 학생별 누적 기록을 바탕으로 최종 세특 작성
 */
export const generateFinalReport = async (studentName: string, history: any[]): Promise<string> => {
    try {
        const historyText = history.map(h => `[${h.date}] ${h.lessonTitle}: ${h.note}`).join('\n');
        const prompt = `
      학생 이름: ${studentName}
      한 학기 기록:
      ${historyText}

      위 누적 기록을 바탕으로 생활기록부 '교과별 세부능력 및 특기사항'에 들어갈 최종 종합 보고서를 작성해줘.
      성취기준 달성 여부와 학생의 성장 변화가 잘 드러나야 함. (약 400자 내외, 평어체)
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text || "종합 보고서 생성 실패";
    } catch (error) {
        console.error(error);
        return "AI 생성 중 오류 발생";
    }
};

export const generateStudentReport = async (studentName: string, observationData: any): Promise<string> => {
    try {
        const prompt = `
      학생 이름: ${studentName}
      관찰 내용: ${observationData.questionLevel.description}
      성장 포인트: ${observationData.growthPoint.title}
      전문적 평어체로 한 단락 초안 작성해줘.
    `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });
        return response.text || "초안 생성 실패";
    } catch (error) {
        console.error(error);
        return "AI 생성 중 오류 발생";
    }
};

/**
 * 수업 녹취록에서 학생 이름과 상호작용 내용을 자동으로 추출
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
수업 녹취록:
${transcript}

학생 명단:
${studentNames.join(', ')}

**임무**: 녹취록에서 학생들의 활동이나 발표, 상호작용이 언급된 부분을 찾아 추출해주세요.

**출력 형식**: JSON 배열
각 항목은 { "studentName": "학생이름", "interaction": "상호작용 내용" } 형식

**예시**:
- "김철수가 산업혁명에 대해 발표했습니다" → { "studentName": "김철수", "interaction": "산업혁명에 대해 발표함" }
- "이영희가 좋은 질문을 했어요" → { "studentName": "이영희", "interaction": "수업 참여 및 질문함" }

**주의사항**:
- 명단에 있는 학생 이름만 추출
- 실제로 언급된 학생만 포함
- 상호작용 내용은 간결하게 요약 (30자 이내)
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
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
