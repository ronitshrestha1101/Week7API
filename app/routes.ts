import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/tasks", "routes/api.tasks.ts"),
  route("api/tasks/:id", "routes/api.tasks.$id.ts"),
] satisfies RouteConfig;
