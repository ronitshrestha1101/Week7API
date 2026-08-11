import mongoose from "mongoose";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export function jsonResponse(data: any, status = 200, customHeaders: Record<string, string> = {}) {
  if (status === 204) {
    return new Response(null, {
      status: 204,
      headers: { ...CORS_HEADERS, ...customHeaders },
    });
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, ...customHeaders },
  });
}

export function errorResponse(message: string, status = 500, details: any = null) {
  const payload: Record<string, any> = {
    error: message,
    statusCode: status,
  };
  if (details) {
    payload.details = details;
  }
  return jsonResponse(payload, status);
}

export async function parseJsonBody(request: Request): Promise<{ data?: any; error?: Response }> {
  try {
    const text = await request.text();
    if (!text || text.trim() === "") {
      return { data: {} };
    }
    const data = JSON.parse(text);
    return { data };
  } catch (err) {
    return {
      error: errorResponse("Invalid JSON payload in request body", 400),
    };
  }
}

export function validateTaskInput(data: any, isUpdate = false): { isValid: boolean; errorDetails?: string; cleanData?: any } {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { isValid: false, errorDetails: "Payload must be a JSON object" };
  }

  const { title, description, isCompleted, dueDate } = data;
  const cleanData: Record<string, any> = {};

  if (!isUpdate || title !== undefined) {
    if (title === undefined || title === null) {
      return { isValid: false, errorDetails: "Field 'title' is required" };
    }
    if (typeof title !== "string") {
      return { isValid: false, errorDetails: "Field 'title' must be a string" };
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return { isValid: false, errorDetails: "Field 'title' cannot be empty" };
    }
    if (trimmedTitle.length > 100) {
      return { isValid: false, errorDetails: "Field 'title' cannot exceed 100 characters" };
    }
    cleanData.title = trimmedTitle;
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      return { isValid: false, errorDetails: "Field 'description' must be a string" };
    }
    cleanData.description = description.trim();
  }

  if (isCompleted !== undefined) {
    if (typeof isCompleted !== "boolean") {
      return { isValid: false, errorDetails: "Field 'isCompleted' must be a boolean (true or false)" };
    }
    cleanData.isCompleted = isCompleted;
  }

  if (dueDate !== undefined) {
    if (dueDate === null || dueDate === "") {
      cleanData.dueDate = null;
    } else {
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        return { isValid: false, errorDetails: "Field 'dueDate' must be a valid ISO Date/timestamp string or null" };
      }
      cleanData.dueDate = parsedDate;
    }
  }

  return { isValid: true, cleanData };
}

export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && new RegExp("^[0-9a-fA-F]{24}$").test(id);
}

export function handleCorsOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function withErrorHandler(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error: any) {
    console.error("[Global Error Catcher]", error);
    return errorResponse("Internal Server Error: A database or runtime error occurred", 500, {
      message: error?.message || "Unexpected failure",
    });
  }
}
