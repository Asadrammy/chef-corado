import { NextResponse } from "next/server"

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorDetail {
  field?: string
  message: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[]
  }
}

export type ApiResponsePayload<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>({ success: true, data }, { status })
}

export function apiError(code: string, message: string, status: number, details?: ApiErrorDetail[]) {
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  )
}
