
/**
 * IndexedDB를 사용하여 대용량 오디오 Blob을 브라우저에 영구 저장하는 유틸리티
 */

const DB_NAME = 'ClassAssistantDB';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

/**
 * DB 초기화 및 연결
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('IndexedDB 연결 실패'));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

/**
 * 마지막 녹음 파일 저장
 */
export const saveLastRecording = async (blob: Blob | null): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    if (blob) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(blob, 'last_recorded_audio');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('저장 실패'));
      });
      console.log('💾 녹음 파일이 IndexedDB에 안전하게 저장되었습니다.');
    } else {
      await new Promise<void>((resolve, reject) => {
        const request = store.delete('last_recorded_audio');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('삭제 실패'));
      });
      console.log('🧹 IndexedDB에서 녹음 파일이 제거되었습니다.');
    }
  } catch (err) {
    console.error('IndexedDB 저장 오류:', err);
  }
};

/**
 * 저장된 마지막 녹음 파일 불러오기
 */
export const loadLastRecording = async (): Promise<Blob | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const request = store.get('last_recorded_audio');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('로드 실패'));
    });

    if (blob) {
      console.log('📂 IndexedDB에서 녹음 파일을 복구했습니다.');
    }
    return blob;
  } catch (err) {
    console.error('IndexedDB 로드 오류:', err);
    return null;
  }
};
