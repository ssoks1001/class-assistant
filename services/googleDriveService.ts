
/**
 * Google Drive API 서비스
 * 데이터의 백업 및 복원을 담당합니다.
 */

// Google API 클라이언트 ID (사용자가 발급받은 ID로 교체 필요)
const CLIENT_ID = '203167513577-1iben7964ahejkavilvbk6cme0o8h92d.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any = null;
let accessToken: string | null = null;

/**
 * 서비스 초기화
 */
export const initGoogleAuth = (): Promise<void> => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !(window as any).google) {
            console.error('Google API not loaded');
            return;
        }

        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response: any) => {
                if (response.error !== undefined) {
                    throw response;
                }
                accessToken = response.access_token;
                resolve();
            },
        });
        resolve();
    });
};

/**
 * 저장소에 액세스 토큰 요청 (로그인 팝업)
 */
export const requestAccessToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Auth not initialized'));
            return;
        }

        tokenClient.callback = (response: any) => {
            if (response.error !== undefined) {
                reject(response);
                return;
            }
            accessToken = response.access_token;
            resolve(accessToken!);
        };

        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

/**
 * 구글 드라이브에서 '수업비서_데이터.json' 파일 찾기
 */
export const findDataFile = async (token: string): Promise<string | null> => {
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='edu_log_backup.json' and trashed=false`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
};

/**
 * 구글 드라이브로 데이터 업로드 (저장)
 */
export const uploadToDrive = async (token: string, data: any, fileId: string | null = null): Promise<void> => {
    const metadata = {
        name: 'edu_log_backup.json',
        mimeType: 'application/json',
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    const url = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const method = fileId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
        method: method,
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }
};

/**
 * 구글 드라이브에서 데이터 다운로드 (불러오기)
 */
export const downloadFromDrive = async (token: string, fileId: string): Promise<any> => {
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Download failed');
    }

    return await response.json();
};
