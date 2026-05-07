import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { ApiResponse } from '../utils/apiResponse';

export const validate = (schema: ZodObject<any>) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return ApiResponse.error(res, 'Validation Error', 400, error.issues);
    }
    next(error);
  }
};
