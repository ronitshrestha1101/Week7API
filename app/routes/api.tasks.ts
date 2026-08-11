import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { connectDB } from "../db.server";
import { Task } from "../models/task.server";
import {
  jsonResponse,
  errorResponse,
  parseJsonBody,
  validateTaskInput,
  handleCorsOptions,
  withErrorHandler,
} from "../utils/api.server";

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return handleCorsOptions();
  }

  return withErrorHandler(async () => {
    await connectDB();

    const url = new URL(request.url);
    const completedParam = url.searchParams.get("completed") ?? url.searchParams.get("isCompleted");

    const queryFilter: Record<string, any> = {};
    if (completedParam !== null) {
      if (completedParam === "true") {
        queryFilter.isCompleted = true;
      } else if (completedParam === "false") {
        queryFilter.isCompleted = false;
      }
    }

    const tasks = await Task.find(queryFilter).sort({ createdAt: -1 });
    const formattedTasks = tasks.map((task) => task.toJSON());

    return jsonResponse(formattedTasks, 200);
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return handleCorsOptions();
  }

  return withErrorHandler(async () => {
    await connectDB();

    if (request.method !== "POST") {
      return errorResponse(`HTTP Method ${request.method} Not Allowed on /api/tasks`, 405);
    }

    const { data: body, error: parseError } = await parseJsonBody(request);
    if (parseError) return parseError;

    const validation = validateTaskInput(body, false);
    if (!validation.isValid) {
      return errorResponse(`Validation Error: ${validation.errorDetails}`, 400, {
        reason: validation.errorDetails,
      });
    }

    const newTask = await Task.create(validation.cleanData as any);
    return jsonResponse(newTask.toJSON(), 201);
  });
}
