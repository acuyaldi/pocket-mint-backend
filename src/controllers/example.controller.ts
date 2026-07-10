import { Request, Response } from 'express';

export class ExampleController {
  static async getAll(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: [],
      message: 'Retrieved all examples',
    });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    res.status(200).json({
      success: true,
      data: { id },
      message: `Retrieved example with id ${id}`,
    });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const body = req.body;
    res.status(201).json({
      success: true,
      data: body,
      message: 'Example created successfully',
    });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const body = req.body;
    res.status(200).json({
      success: true,
      data: { id, ...body },
      message: `Example with id ${id} updated successfully`,
    });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    res.status(200).json({
      success: true,
      data: null,
      message: `Example with id ${id} deleted successfully`,
    });
  }
}
