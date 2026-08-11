import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { connectDB } from "../db.server";
import { Task } from "../models/task.server";
import {
  jsonResponse,
  errorResponse,
  parseJsonBody,
  validateTaskInput,
  isValidObjectId,
  handleCorsOptions,
  withErrorHandler,
} from "../utils/api.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return handleCorsOptions();
  }

  return withErrorHandler(async () => {
    await connectDB();

    const taskId = params.id;
    if (!taskId || !isValidObjectId(taskId)) {
      return errorResponse(`Task not found with ID '${taskId}'`, 404);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(`Task not found with ID '${taskId}'`, 404);
    }

    return jsonResponse(task.toJSON(), 200);
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return handleCorsOptions();
  }

  return withErrorHandler(async () => {
    await connectDB();

    const taskId = params.id;
    if (!taskId || !isValidObjectId(taskId)) {
      return errorResponse(`Task not found with ID '${taskId}'`, 404);
    }

    const method = request.method.toUpperCase();

    if (method === "PUT" || method === "PATCH") {
      const { data: body, error: parseError } = await parseJsonBody(request);
      if (parseError) return parseError;

      const isPatch = method === "PATCH";
      const validation = validateTaskInput(body, isPatch);
      if (!validation.isValid) {
        return errorResponse(`Validation Error: ${validation.errorDetails}`, 400, {
          reason: validation.errorDetails,
        });
      }

      const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        { $set: validation.cleanData },
        { new: true, runValidators: true }
      );

      if (!updatedTask) {
        return errorResponse(`Task not found with ID '${taskId}'`, 404);
      }

      return jsonResponse(updatedTask.toJSON(), 200);
    }

    if (method === "DELETE") {
      const deletedTask = await Task.findByIdAndDelete(taskId);
      if (!deletedTask) {
        return errorResponse(`Task not found with ID '${taskId}'`, 404);
      }

      return jsonResponse(
        {
          message: "Task resource deleted successfully",
          id: taskId,
        },
        200
      );
    }

    return errorResponse(`HTTP Method ${method} Not Allowed on /api/tasks/:id`, 405);
  });
}
