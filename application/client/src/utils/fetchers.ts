type HttpError = Error & {
  responseJSON?: unknown;
  responseText?: string;
  status: number;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";

    let responseJSON: unknown;
    let responseText = "";
    if (contentType.includes("application/json")) {
      responseJSON = await response.json();
      responseText =
        typeof responseJSON === "string" ? responseJSON : JSON.stringify(responseJSON);
    } else {
      responseText = await response.text();
    }

    const error = new Error(
      responseText || `Request failed with status ${response.status}`,
    ) as HttpError;
    error.status = response.status;
    error.responseJSON = responseJSON;
    error.responseText = responseText;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return undefined as T;
}

export async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed with status ${response.status}`);
  }
  return response.arrayBuffer();
}

export async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  return parseResponse<T>(response);
}

export async function sendFile<T>(url: string, file: File): Promise<T> {
  const response = await fetch(url, {
    body: file,
    headers: {
      "Content-Type": "application/octet-stream",
    },
    method: "POST",
  });
  return parseResponse<T>(response);
}

export async function sendJSON<T>(url: string, data: object): Promise<T> {
  const response = await fetch(url, {
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  return parseResponse<T>(response);
}
