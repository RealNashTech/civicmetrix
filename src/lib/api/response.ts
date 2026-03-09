import { NextResponse } from "next/server";

import { INTERNAL_ERROR, type ApiErrorCode } from "@/lib/api/errorCodes";

type Meta = Record<string, unknown>;

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Meta;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: ApiErrorCode | string;
    message: string;
  };
};

export function ok<T>(data: T, meta?: Meta, status: number = 200) {
  const body: ApiSuccessResponse<T> = meta
    ? {
        success: true,
        data,
        meta,
      }
    : {
        success: true,
        data,
      };

  return NextResponse.json(body, { status });
}

export function error(code: ApiErrorCode | string, message: string, status: number = 400) {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(body, { status });
}

export function internalError(message: string = "Internal server error.") {
  return error(INTERNAL_ERROR, message, 500);
}
