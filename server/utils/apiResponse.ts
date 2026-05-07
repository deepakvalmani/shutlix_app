import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data: any = null, message: string = 'Success', statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, message: string = 'Error', statusCode: number = 400, errors: any = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static paginate(res: Response, data: any, pagination: { page: number, limit: number, total: number }) {
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
      }
    });
  }
}
