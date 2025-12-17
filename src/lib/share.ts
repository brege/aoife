type ShareCreateResponse = {
  slug: string;
  id: string;
};

type ShareFetchResponse = {
  slug: string;
  payload: string;
  title?: string;
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json();
    const message =
      typeof body?.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`;
    return message;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

export const createShare = async (
  payload: string,
  title: string,
): Promise<ShareCreateResponse> => {
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new Error('Share payload must be a non-empty string');
  }
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('Share title must be a non-empty string');
  }

  const response = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, title }),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  const data = (await response.json()) as ShareCreateResponse;
  if (!data?.slug) {
    throw new Error('Share response missing slug');
  }

  return data;
};

export const fetchShare = async (slug: string): Promise<ShareFetchResponse> => {
  if (typeof slug !== 'string' || slug.trim() === '') {
    throw new Error('Share slug must be provided');
  }

  const response = await fetch(`/api/share/${slug}`);
  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  const data = (await response.json()) as ShareFetchResponse;
  if (!data?.payload) {
    throw new Error('Share payload missing from response');
  }

  return data;
};
