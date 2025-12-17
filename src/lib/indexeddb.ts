/// <reference lib="dom" />

const DB_NAME = 'aoife';
const IMAGE_STORE_NAME = 'images';
const STATE_STORE_NAME = 'state';
const DB_VERSION = 2;

let db: IDBDatabase | null = null;

const initDB = async (): Promise<IDBDatabase> => {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        database.createObjectStore(IMAGE_STORE_NAME);
      }
      if (!database.objectStoreNames.contains(STATE_STORE_NAME)) {
        database.createObjectStore(STATE_STORE_NAME);
      }
    };
  });
};

export const storeImage = async (
  imageId: string,
  blob: Blob,
): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([IMAGE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.put(blob, imageId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getImage = async (imageId: string): Promise<Blob | null> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([IMAGE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.get(imageId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as Blob | undefined;
      resolve(result || null);
    };
  });
};

export const deleteImage = async (imageId: string): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([IMAGE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.delete(imageId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const storeState = async (key: string, value: string): Promise<void> => {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('State key must be a non-empty string');
  }
  if (typeof value !== 'string') {
    throw new Error('State value must be a string');
  }

  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STATE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STATE_STORE_NAME);
    const request = store.put(value, key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getState = async (key: string): Promise<string | null> => {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('State key must be a non-empty string');
  }

  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STATE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(STATE_STORE_NAME);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as string | undefined;
      resolve(typeof result === 'string' ? result : null);
    };
  });
};

export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read blob as data URL'));
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Unexpected FileReader result'));
    };
    reader.readAsDataURL(blob);
  });
};

export const createBlobURL = (blob: Blob): string => {
  return URL.createObjectURL(blob);
};

export const revokeBlobURL = (url: string): void => {
  URL.revokeObjectURL(url);
};
