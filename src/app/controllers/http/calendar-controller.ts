import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { calendarService } from "#app/services/calendar-service.js";
import type {
  GetEventsResponse,
  CreateEventResponse,
  GetEventResponse,
  UpdateEventResponse,
  DeleteEventResponse,
  GetEventsByDateResponse,
  GetEventsByRangeResponse,
} from "shared";
import type {
    CreateEventInput,
    UpdateEventInput,
    GetEventsByRangeInput,
  } from "shared/schemas";

function setServiceErrorStatus(
  context: HttpContext,
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL",
): void {
  if (code === "BAD_REQUEST") {
    context.responseData.status = 400;
    return;
  }
  if (code === "UNAUTHORIZED") {
    context.responseData.status = 401;
    return;
  }
  if (code === "NOT_FOUND") {
    context.responseData.status = 404;
    return;
  }
  if (code === "CONFLICT") {
    context.responseData.status = 409;
    return;
  }
  context.responseData.status = 500;
}

function resolveUserId(context: HttpContext): bigint | null {
  if (!context.auth.check()) {
    context.responseData.status = 401;
    return null;
  }

  const userId = context.auth.getUserId();
  if (userId === null) {
    context.responseData.status = 401;
    return null;
  }

  return BigInt(userId);
}

export default {
  async getEvents(context: HttpContext): Promise<GetEventsResponse> {
    context.logger.info("getEvents handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const result = await calendarService.getEvents(userId);
    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", data: result.data.data };
  },

  async createEvent(
    context: HttpContext<CreateEventInput>,
  ): Promise<CreateEventResponse> {
    context.logger.info("createEvent handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const payload = getTypedPayload(context);
    const result = await calendarService.createEvent(userId, payload);

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", data: result.data.data };
  },

  async getEvent(context: HttpContext): Promise<GetEventResponse> {
    context.logger.info("getEvent handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const { eventId } = context.httpData.params as { eventId: string };
    const result = await calendarService.getEvent(userId, BigInt(eventId));

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", data: result.data.data };
  },

  async updateEvent(
    context: HttpContext<UpdateEventInput>,
  ): Promise<UpdateEventResponse> {
    context.logger.info("updateEvent handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const { eventId } = context.httpData.params as { eventId: string };
    const payload = getTypedPayload(context);
    const result = await calendarService.updateEvent(
      userId,
      BigInt(eventId),
      payload,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", data: result.data.data };
  },

  async deleteEvent(context: HttpContext): Promise<DeleteEventResponse> {
    context.logger.info("deleteEvent handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const { eventId } = context.httpData.params as { eventId: string };
    const result = await calendarService.deleteEvent(userId, BigInt(eventId));

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", message: result.data.message };
  },

  async getEventsByDate(
    context: HttpContext,
  ): Promise<GetEventsByDateResponse> {
    context.logger.info("getEventsByDate handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const { date } = context.httpData.params as { date: string };
    const result = await calendarService.getEventsByDate(userId, date);

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", data: result.data.data };
  },

  async getEventsByRange(
    context: HttpContext<GetEventsByRangeInput>,
  ): Promise<GetEventsByRangeResponse> {
    context.logger.info("getEventsByRange handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const payload = getTypedPayload(context);
    const result = await calendarService.getEventsByRange(userId, payload);

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", data: result.data.data };
  },
};
