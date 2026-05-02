import type {
  HttpContext,
  Middleware,
} from "#vendor/types/types.js";

const authGuard: Middleware = async (
  context: HttpContext,
  next: () => Promise<void>
): Promise<void> => {
  const { auth } = context;
  if (!auth.check()) {
    context.responseData.status = 401;
    context.responseData.payload = {
      status: "unauthorized",
      message: "Session expired or not found",
    };
    return;
  }

  await next();
};

export default authGuard;
