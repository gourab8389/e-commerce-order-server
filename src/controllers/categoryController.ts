import { Response } from 'express';
import { prisma } from '../config/database';
import { cacheService } from '../services/cacheService';
import { AuthRequest } from '../middleware/auth';
import { CreateCategoryRequest, ApiResponse } from '../types';

export class CategoryController {
  async createCategory(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const sellerId = req.user!.userId;
      const { name, description }: CreateCategoryRequest = req.body;
      const image = req.file?.filename;

      const existingCategory = await prisma.category.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive'
          },
          sellerId,
          isActive: true
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      const category = await prisma.category.create({
        data: {
          name,
          description,
          image,
          sellerId
        }
      });

      // Clear cache
      await cacheService.flushPattern(`categories:${sellerId}:*`);
      await cacheService.flushPattern('categories:all:*');

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getCategories(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const sellerId = req.user!.userId;
      const { page = 1, limit = 10, search, isActive } = req.query;
      
      const cacheKey = `categories:${sellerId}:${page}:${limit}:${search || ''}:${isActive || ''}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Categories retrieved successfully (cached)',
          data: cached
        });
      }

      const where: any = { sellerId };
      
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      } else {
        where.isActive = true; // Default to active only
      }

      if (search) {
        where.name = { contains: search as string, mode: 'insensitive' };
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where,
          include: {
            _count: {
              select: { 
                products: {
                  where: { isActive: true }
                }
              }
            }
          },
          skip,
          take: Number(limit),
          orderBy: [
            { createdAt: 'desc' },
            { name: 'asc' }
          ]
        }),
        prisma.category.count({ where })
      ]);

      const result = {
        categories,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      };

      await cacheService.set(cacheKey, result, 300); // 5 minutes cache

      res.json({
        success: true,
        message: 'Categories retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getCategoryById(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const sellerId = req.user!.userId;
      const { id } = req.params;

      const category = await prisma.category.findFirst({
        where: { id, sellerId },
        include: {
          _count: {
            select: { 
              products: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        message: 'Category retrieved successfully',
        data: category
      });
    } catch (error) {
      console.error('Get category by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateCategory(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const sellerId = req.user!.userId;
      const { id } = req.params;
      const { name, description, isActive } = req.body;
      const image = req.file?.filename;

      const category = await prisma.category.findFirst({
        where: { id, sellerId }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found or access denied'
        });
      }

      // Check if new name conflicts with existing categories (excluding current one)
      if (name && name !== category.name) {
        const existingCategory = await prisma.category.findFirst({
          where: {
            name: {
              equals: name,
              mode: 'insensitive'
            },
            sellerId,
            isActive: true,
            id: { not: id }
          }
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Category with this name already exists'
          });
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (image) updateData.image = image;

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: { 
              products: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      // Clear cache
      await cacheService.flushPattern(`categories:${sellerId}:*`);
      await cacheService.flushPattern('categories:all:*');

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: updatedCategory
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async deleteCategory(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const sellerId = req.user!.userId;
      const { id } = req.params;

      const category = await prisma.category.findFirst({
        where: { id, sellerId },
        include: {
          _count: {
            select: { 
              products: {
                where: { isActive: true }
              }
            }
          }
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found or access denied'
        });
      }

      if (category._count.products > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category that contains active products. Please move or delete the products first.'
        });
      }

      // Soft delete by setting isActive to false
      await prisma.category.update({
        where: { id },
        data: { isActive: false }
      });

      // Clear cache
      await cacheService.flushPattern(`categories:${sellerId}:*`);
      await cacheService.flushPattern('categories:all:*');

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Public endpoint for all active categories
  async getAllCategories(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { search, sellerId } = req.query;
      
      const cacheKey = `all-categories:${search || ''}:${sellerId || ''}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Categories retrieved successfully (cached)',
          data: cached
        });
      }

      const where: any = { isActive: true };
      
      if (search) {
        where.name = { contains: search as string, mode: 'insensitive' };
      }

      if (sellerId) {
        where.sellerId = sellerId as string;
      }

      const categories = await prisma.category.findMany({
        where,
        include: {
          _count: {
            select: { 
              products: { 
                where: { isActive: true } 
              } 
            }
          }
        },
        orderBy: [
          { name: 'asc' }
        ]
      });

      // Group by seller if needed
      const result = sellerId ? categories : this.groupCategoriesBySeller(categories);

      await cacheService.set(cacheKey, result, 600); // 10 minutes cache

      res.json({
        success: true,
        message: 'Categories retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Get all categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  private groupCategoriesBySeller(categories: any[]) {
    const grouped = categories.reduce((acc, category) => {
      if (!acc[category.sellerId]) {
        acc[category.sellerId] = [];
      }
      acc[category.sellerId].push(category);
      return acc;
    }, {} as any);

    return {
      total: categories.length,
      categories: categories,
      groupedBySeller: grouped
    };
  }

  async getCategoriesWithProducts(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { sellerId, limit = 5 } = req.query;
      
      const cacheKey = `categories-with-products:${sellerId || 'all'}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Categories with products retrieved successfully (cached)',
          data: cached
        });
      }

      const where: any = { 
        isActive: true,
        products: {
          some: {
            isActive: true
          }
        }
      };

      if (sellerId) {
        where.sellerId = sellerId as string;
      }

      const categories = await prisma.category.findMany({
        where,
        include: {
          products: {
            where: {
              isActive: true,
              isFeatured: true
            },
            take: Number(limit),
            orderBy: {
              totalSold: 'desc'
            },
            select: {
              id: true,
              name: true,
              images: true,
              price: true,
              originalPrice: true,
              discount: true,
              avgRating: true,
              totalSold: true
            }
          },
          _count: {
            select: {
              products: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      await cacheService.set(cacheKey, categories, 600);

      res.json({
        success: true,
        message: 'Categories with products retrieved successfully',
        data: categories
      });
    } catch (error) {
      console.error('Get categories with products error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export const categoryController = new CategoryController();