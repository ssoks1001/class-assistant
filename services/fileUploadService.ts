import { GoogleGenAI } from "@google/genai";

// @ts-ignore - env type issue
const ai = new GoogleGenAI({ apiKey: import.meta.env?.VITE_GEMINI_API_KEY || '' });

export interface UploadedFileMetadata {
    uri: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    createTime: string;
    expirationTime: string;
}

/**
 * Upload a file to Gemini File API
 * @param file - The file to upload
 * @returns The file URI from Gemini
 */
export async function uploadFileToGemini(file: File): Promise<UploadedFileMetadata> {
    try {
        // Upload to Gemini File API
        const uploadedFile = await ai.files.upload({
            file: file,
            config: {
                displayName: file.name
            }
        });

        return {
            uri: uploadedFile.uri,
            name: uploadedFile.name || file.name,
            mimeType: uploadedFile.mimeType || file.type,
            sizeBytes: file.size,
            createTime: uploadedFile.createTime || new Date().toISOString(),
            expirationTime: uploadedFile.expirationTime || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        };
    } catch (error) {
        console.error("File upload error:", error);
        throw new Error(`파일 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

/**
 * Delete a file from Gemini File API
 * @param fileUri - The URI of the file to delete
 */
export async function deleteFileFromGemini(fileUri: string): Promise<void> {
    try {
        await ai.files.delete({ name: fileUri });
    } catch (error) {
        console.error("File deletion error:", error);
        throw new Error(`파일 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

/**
 * List all uploaded files
 * @returns Array of uploaded file metadata
 */
export async function listUploadedFiles(): Promise<UploadedFileMetadata[]> {
    try {
        const filesPager = await ai.files.list();
        const files: UploadedFileMetadata[] = [];

        for await (const file of filesPager) {
            files.push({
                uri: file.uri,
                name: file.name || 'Unknown',
                mimeType: file.mimeType || 'application/octet-stream',
                sizeBytes: 0, // Not provided by API
                createTime: file.createTime || new Date().toISOString(),
                expirationTime: file.expirationTime || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            });
        }

        return files;
    } catch (error) {
        console.error("File listing error:", error);
        return [];
    }
}
