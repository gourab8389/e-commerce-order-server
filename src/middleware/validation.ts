import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }
      next(error);
    }
  };
};

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    description: z.string().optional(),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    discount: z.number().min(0).max(100).optional(),
    quantity: z.number().int().min(0),
    unit: z.string().min(1),
    categoryId: z.string().cuid(),
    tags: z.array(z.string()).optional(),
    isFeatured: z.boolean().optional(),
    nutritionInfo: z.any().optional(),
  }),
});

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().cuid(),
    quantity: z.number().int().positive(),
  }),
});

export const createOrderSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().positive(),
      })
    ),
    shippingAddress: z.object({
      street: z.string().min(5),
      city: z.string().min(2),
      state: z.string().min(2),
      country: z.string().min(2),
      zipCode: z.string().min(5),
      phone: z.string().min(10),
    }),
    billingAddress: z
      .object({
        street: z.string().min(5),
        city: z.string().min(2),
        state: z.string().min(2),
        country: z.string().min(2),
        zipCode: z.string().min(5),
      })
      .optional(),
    notes: z.string().optional(),
  }),
});
